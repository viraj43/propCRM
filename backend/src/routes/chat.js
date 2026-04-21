const express = require('express');
const prisma = require('../lib/prisma');
const { auth } = require('../middleware/auth');

const router = express.Router();

// GET /api/chat/history
// GET /api/chat/history  (global chat, no channelId)
router.get('/history', auth, async (req, res) => {
  try {
    const messages = await prisma.chatMessage.findMany({
      where: { channelId: null },
      take: 100,
      orderBy: { createdAt: 'desc' },
      include: {
        sender: { select: { id: true, name: true } },
        replyTo: { include: { sender: { select: { id: true, name: true } } } },
        reactions: { select: { emoji: true, userId: true } }
      }
    });
    res.json(messages.reverse());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
