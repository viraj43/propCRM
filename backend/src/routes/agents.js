const express = require('express');
const prisma = require('../lib/prisma');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/agents
router.get('/', auth, async (req, res) => {
  try {
    const agents = await prisma.user.findMany({
      select: {
        id: true, name: true, email: true, role: true, phone: true, createdAt: true,
        _count: { select: { leads: true, deals: true, properties: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(agents);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/agents/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const agent = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true, name: true, email: true, role: true, phone: true, createdAt: true,
        leads: { select: { id: true, name: true, status: true, createdAt: true }, take: 10, orderBy: { createdAt: 'desc' } },
        deals: {
          select: { id: true, stage: true, value: true, commission: true, createdAt: true, client: { select: { name: true } } },
          take: 10, orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    res.json(agent);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/agents/:id
router.put('/:id', auth, requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const { name, phone, role } = req.body;
    const agent = await prisma.user.update({
      where: { id: req.params.id },
      data: { name, phone, role },
      select: { id: true, name: true, email: true, role: true, phone: true },
    });
    res.json(agent);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/agents/:id
router.delete('/:id', auth, requireRole('ADMIN'), async (req, res) => {
  try {
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ message: 'Agent deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
