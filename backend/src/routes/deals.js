const express = require('express');
const prisma = require('../lib/prisma');
const { auth } = require('../middleware/auth');
const { sendEmail } = require('../services/email');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname.replace(/\s+/g, '_'));
  }
});
const upload = multer({ storage: storage });

// GET /api/deals
router.get('/', auth, async (req, res) => {
  try {
    const { stage, agentId } = req.query;
    const where = {};
    if (stage) where.stage = stage;
    if (agentId) where.agentId = agentId;
    if (req.user.role === 'AGENT') where.agentId = req.user.id;

    const deals = await prisma.deal.findMany({
      where,
      include: {
        client: true,
        property: { select: { id: true, title: true, location: true, price: true, images: true } },
        agent: { select: { id: true, name: true } },
        documents: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(deals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/deals/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const deal = await prisma.deal.findUnique({
      where: { id: req.params.id },
      include: {
        client: { include: { interactions: { orderBy: { createdAt: 'desc' } } } },
        property: true,
        agent: { select: { id: true, name: true, email: true, phone: true } },
        documents: true,
      },
    });
    if (!deal) return res.status(404).json({ error: 'Deal not found' });
    res.json(deal);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/deals
router.post('/', auth, async (req, res) => {
  try {
    const { clientId, propertyId, agentId, stage, value, commission, notes } = req.body;
    const deal = await prisma.deal.create({
      data: {
        clientId, propertyId,
        agentId: agentId || req.user.id,
        stage: stage || 'INQUIRY',
        value: parseFloat(value),
        commission: commission ? parseFloat(commission) : null,
        notes,
      },
      include: {
        client: true,
        property: { select: { id: true, title: true, location: true } },
        agent: { select: { id: true, name: true } },
      },
    });
    res.status(201).json(deal);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/deals/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const { stage, value, commission, notes } = req.body;
    const existingDeal = await prisma.deal.findUnique({
      where: { id: req.params.id },
      select: { stage: true }
    });

    const deal = await prisma.deal.update({
      where: { id: req.params.id },
      data: {
        stage,
        value: value ? parseFloat(value) : undefined,
        commission: commission ? parseFloat(commission) : undefined,
        notes,
      },
      include: {
        client: true,
        property: { select: { id: true, title: true, location: true } },
        agent: { select: { id: true, name: true } },
      },
    });

    // Deal Stage Alert
    if (existingDeal && existingDeal.stage !== stage && (stage === 'AGREEMENT' || stage === 'CLOSED') && deal.client?.email) {
      const subject = stage === 'AGREEMENT' 
        ? `PropCRM: Agreement Pending for ${deal.property.title}`
        : `PropCRM: Deal Closed for ${deal.property.title}`;
      const message = stage === 'AGREEMENT'
        ? `Hi ${deal.client.name},\n\nGreat news! Your deal for ${deal.property.title} has moved to the AGREEMENT stage. We will be sending over the necessary documents shortly.\n\nBest regards,\nPropCRM Team`
        : `Hi ${deal.client.name},\n\nCongratulations! Your deal for ${deal.property.title} is now officially CLOSED. Thank you for doing business with us.\n\nBest regards,\nPropCRM Team`;
      
      sendEmail({
        to: deal.client.email,
        subject,
        text: message,
        html: `<p>${message.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br/>')}</p>`
      }).catch(err => console.error('Failed to send deal stage alert email:', err.message));
    }
    res.json(deal);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/deals/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    await prisma.deal.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deal deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/deals/:id/documents
router.post('/:id/documents', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    
    const document = await prisma.document.create({
      data: {
        dealId: req.params.id,
        name: req.body.name || req.file.originalname,
        url: `/uploads/${req.file.filename}`,
      }
    });
    res.status(201).json(document);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
