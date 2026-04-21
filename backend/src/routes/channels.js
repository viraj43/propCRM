const express = require('express');
const prisma = require('../lib/prisma');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Middleware: only ADMIN or MANAGER
const canManage = (req, res, next) => {
    if (req.user.role !== 'ADMIN' && req.user.role !== 'MANAGER') {
        return res.status(403).json({ error: 'Only admins and managers can manage channels' });
    }
    next();
};

// GET /api/channels — channels the current user is a member of (agents)
// ADMIN/MANAGER see all channels
router.get('/', auth, async (req, res) => {
    try {
        const isPrivileged = req.user.role === 'ADMIN' || req.user.role === 'MANAGER';

        const channels = await prisma.channel.findMany({
            where: isPrivileged ? {} : {
                members: { some: { userId: req.user.id } }
            },
            include: {
                members: {
                    include: { user: { select: { id: true, name: true, role: true } } }
                },
                _count: { select: { messages: true } }
            },
            orderBy: { createdAt: 'asc' }
        });

        res.json(channels);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/channels — create channel
router.post('/', auth, canManage, async (req, res) => {
    const { name, description, memberIds = [] } = req.body;
    if (!name) return res.status(400).json({ error: 'Channel name is required' });

    try {
        const channel = await prisma.channel.create({
            data: {
                name: name.toLowerCase().replace(/\s+/g, '-'),
                description,
                createdBy: req.user.id,
                members: {
                    create: [
                        { userId: req.user.id },                          // creator always added
                        ...memberIds
                            .filter(id => id !== req.user.id)
                            .map(id => ({ userId: id }))
                    ]
                }
            },
            include: {
                members: {
                    include: { user: { select: { id: true, name: true, role: true } } }
                }
            }
        });

        res.json(channel);
    } catch (err) {
        if (err.code === 'P2002') return res.status(400).json({ error: 'Channel name already exists' });
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/channels/:id — delete channel
router.delete('/:id', auth, canManage, async (req, res) => {
    try {
        await prisma.channel.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/channels/:id/members — add members
router.post('/:id/members', auth, canManage, async (req, res) => {
    const { userIds } = req.body;
    if (!userIds?.length) return res.status(400).json({ error: 'userIds required' });

    try {
        await prisma.channelMember.createMany({
            data: userIds.map(userId => ({ channelId: req.params.id, userId })),
            skipDuplicates: true
        });

        const channel = await prisma.channel.findUnique({
            where: { id: req.params.id },
            include: {
                members: {
                    include: { user: { select: { id: true, name: true, role: true } } }
                }
            }
        });

        res.json(channel);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/channels/:id/members/:userId — remove member
router.delete('/:id/members/:userId', auth, canManage, async (req, res) => {
    try {
        await prisma.channelMember.deleteMany({
            where: { channelId: req.params.id, userId: req.params.userId }
        });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/channels/:id/messages
router.get('/:id/messages', auth, async (req, res) => {
    try {
        // Agents must be a member
        const isMember = await prisma.channelMember.findUnique({
            where: { channelId_userId: { channelId: req.params.id, userId: req.user.id } }
        });
        const isPrivileged = req.user.role === 'ADMIN' || req.user.role === 'MANAGER';
        if (!isMember && !isPrivileged) return res.status(403).json({ error: 'Not a member' });

        const messages = await prisma.chatMessage.findMany({
            where: { channelId: req.params.id },
            take: 100,
            orderBy: { createdAt: 'desc' },
            include: {
                sender: { select: { id: true, name: true } },
                replyTo: { include: { sender: { select: { id: true, name: true } } } },
                reactions: { select: { emoji: true, userId: true } }
            }
        });
        console.log("These are his messages", messages);
        res.json(messages.reverse());
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/channels/users — all users for member picker
router.get('/users/all', auth, async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: { id: true, name: true, role: true, email: true },
            orderBy: { name: 'asc' }
        });
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;