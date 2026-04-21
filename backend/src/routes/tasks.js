const express = require('express');
const prisma = require('../lib/prisma');
const { auth } = require('../middleware/auth');

const router = express.Router();

// GET /api/tasks (Aggregated follow-ups)
router.get('/', auth, async (req, res) => {
  try {
    const where = {};
    // If agent, only show their leads' follow-ups
    if (req.user.role === 'AGENT') {
      where.lead = { agentId: req.user.id };
    }
    
    const followUps = await prisma.followUp.findMany({
      where,
      include: {
        lead: { select: { id: true, name: true, phone: true } }
      },
      orderBy: { scheduledAt: 'asc' },
    });
    
    res.json(followUps);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/tasks/:id (Mark as done)
router.put('/:id', auth, async (req, res) => {
  try {
    const followUp = await prisma.followUp.update({
      where: { id: req.params.id },
      data: { isDone: req.body.isDone },
      include: {
        lead: { select: { id: true, name: true, phone: true } }
      }
    });
    res.json(followUp);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
