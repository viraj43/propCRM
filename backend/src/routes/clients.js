const express = require('express');
const prisma = require('../lib/prisma');
const { auth } = require('../middleware/auth');

const router = express.Router();

// GET /api/clients
router.get('/', auth, async (req, res) => {
  try {
    const { type, search } = req.query;
    const where = {};
    if (type) where.type = type;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }
    const clients = await prisma.client.findMany({
      where,
      include: {
        lead: true,
        deals: { select: { id: true, stage: true } },
        _count: { select: { interactions: true, deals: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(clients);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/clients/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: req.params.id },
      include: {
        lead: true,
        deals: { include: { property: true, agent: { select: { id: true, name: true } } } },
        interactions: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    res.json(client);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/clients
router.post('/', auth, async (req, res) => {
  try {
    const { name, phone, email, type, notes, leadId } = req.body;
    const client = await prisma.client.create({
      data: { name, phone, email, type, notes, leadId },
    });
    res.status(201).json(client);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/clients/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, phone, email, type, notes } = req.body;
    const client = await prisma.client.update({
      where: { id: req.params.id },
      data: { name, phone, email, type, notes },
    });
    res.json(client);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/clients/:id/interactions
router.post('/:id/interactions', auth, async (req, res) => {
  try {
    const { type, note } = req.body;
    const interaction = await prisma.interaction.create({
      data: { clientId: req.params.id, type, note },
    });
    res.status(201).json(interaction);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/clients/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    await prisma.client.delete({ where: { id: req.params.id } });
    res.json({ message: 'Client deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
