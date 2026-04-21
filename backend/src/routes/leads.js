const express = require('express');
const prisma = require('../lib/prisma');
const { auth } = require('../middleware/auth');
const { triggerWebhook } = require('./webhooks');
const { sendEmail } = require('../services/email');

const calculateScore = (lead) => {
  let score = 20; // Base score
  if (lead.email) score += 15;
  if (lead.budget && lead.budget > 5000000) score += 20;
  if (lead.budget && lead.budget > 10000000) score += 15;
  if (lead.preferences && lead.preferences.length > 20) score += 15;
  if (lead.source === 'REFERRAL') score += 15;
  return Math.min(score, 100);
};

const router = express.Router();

// GET /api/leads
router.get('/', auth, async (req, res) => {
  try {
    const { status, agentId, search } = req.query;
    const where = {};
    if (status) where.status = status;
    if (agentId) where.agentId = agentId;
    if (req.user.role === 'AGENT') where.agentId = req.user.id;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }
    const leads = await prisma.lead.findMany({
      where,
      include: { assignedTo: { select: { id: true, name: true, email: true } }, followUps: { orderBy: { scheduledAt: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(leads);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/leads/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: req.params.id },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        followUps: { orderBy: { scheduledAt: 'asc' } },
        client: true,
      },
    });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    res.json(lead);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/leads
router.post('/', auth, async (req, res) => {
  try {
    const { name, phone, email, budget, source, status, preferences, notes, agentId } = req.body;
    const score = calculateScore({ email, budget: budget ? parseFloat(budget) : null, source, preferences });
    const lead = await prisma.lead.create({
      data: { name, phone, email, budget: budget ? parseFloat(budget) : null, source, status, preferences, notes, agentId, score },
      include: { assignedTo: { select: { id: true, name: true } } },
    });
    
    // Fire webhook
    triggerWebhook('lead.created', lead);

    // Auto-responder email
    if (lead.email) {
      sendEmail({
        to: lead.email,
        subject: 'Thank you for your interest in PropCRM',
        text: `Hi ${lead.name},\n\nThank you for reaching out to us. One of our agents will be in touch with you shortly to discuss your real estate needs.\n\nBest regards,\nPropCRM Team`,
        html: `<p>Hi ${lead.name},</p><p>Thank you for reaching out to us. One of our agents will be in touch with you shortly to discuss your real estate needs.</p><br/><p>Best regards,<br/><strong>PropCRM Team</strong></p>`
      }).catch(err => console.error('Failed to send auto-responder email:', err.message));
    }

    res.status(201).json(lead);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/leads/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, phone, email, budget, source, status, preferences, notes, agentId } = req.body;
    const score = calculateScore({ email, budget: budget ? parseFloat(budget) : null, source, preferences });
    const lead = await prisma.lead.update({
      where: { id: req.params.id },
      data: { name, phone, email, budget: budget ? parseFloat(budget) : undefined, source, status, preferences, notes, agentId, score },
      include: { assignedTo: { select: { id: true, name: true } } },
    });
    res.json(lead);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/leads/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    await prisma.lead.delete({ where: { id: req.params.id } });
    res.json({ message: 'Lead deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/leads/:id/followups
router.post('/:id/followups', auth, async (req, res) => {
  try {
    const { scheduledAt, note } = req.body;
    const followUp = await prisma.followUp.create({
      data: { leadId: req.params.id, scheduledAt: new Date(scheduledAt), note },
    });
    res.status(201).json(followUp);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/leads/:id/followups/:fid
router.put('/:id/followups/:fid', auth, async (req, res) => {
  try {
    const followUp = await prisma.followUp.update({
      where: { id: req.params.fid },
      data: { isDone: req.body.isDone, note: req.body.note },
    });
    res.json(followUp);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
