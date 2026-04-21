const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const prisma = require('./lib/prisma');

let io;

// Track online users: { userId -> { name, socketId } }
const onlineUsers = new Map();

const initSocket = (server) => {
  io = socketIo(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
    if (!token) return next(new Error('Authentication error'));

    jwt.verify(token, process.env.JWT_SECRET || 'realestate_crm_super_secret_jwt_key_2024', (err, decoded) => {
      if (err) return next(new Error('Authentication error'));
      socket.user = decoded;
      next();
    });
  });

  io.on('connection', async (socket) => {
    const { id: userId, name } = socket.user;
    console.log(`🔌 Connected: ${name}`);

    // --- Online Presence ---
    onlineUsers.set(userId, { name, socketId: socket.id });
    io.emit('onlineUsers', Array.from(onlineUsers.entries()).map(([id, data]) => ({ id, name: data.name })));

    socket.join('team-channel');

    // Join all channel rooms this user is a member of
    const memberships = await prisma.channelMember.findMany({
      where: { userId },
      select: { channelId: true }
    });

    const { role } = socket.user;
    if (role === 'ADMIN' || role === 'MANAGER') {
      const allChannels = await prisma.channel.findMany({ select: { id: true } });
      allChannels.forEach(c => socket.join(`channel:${c.id}`));
    } else {
      memberships.forEach(m => socket.join(`channel:${m.channelId}`));
    }

    // --- Typing Indicators ---
    socket.on('typing', () => {
      socket.to('team-channel').emit('userTyping', { userId, name });
    });

    socket.on('stopTyping', () => {
      socket.to('team-channel').emit('userStoppedTyping', { userId });
    });

    // --- Send Message (with optional reply + mentions) ---
    socket.on('sendMessage', async ({ content, replyToId, channelId }) => {
      if (!content || content.trim().length === 0) return;

      // Parse @mentions: find all @Name patterns
      const mentionPattern = /@(\w+(?:\s\w+)?)/g;
      const mentionedNames = [...content.matchAll(mentionPattern)].map(m => m[1]);
      try {
        const message = await prisma.chatMessage.create({
          data: {
            content,
            senderId: userId,
            ...(replyToId && { replyToId }),
            ...(channelId && { channelId })
          },
          include: {
            sender: { select: { id: true, name: true } },
            replyTo: {
              include: { sender: { select: { id: true, name: true } } }
            }
          }
        });
        console.log("message is here", message);
        const room = channelId ? `channel:${channelId}` : 'team-channel';
        io.to(room).emit('newMessage', { ...message, channelId });

        // --- Browser Notifications for @mentions ---
        if (mentionedNames.length > 0) {
          const mentionedUsers = await prisma.user.findMany({
            where: { name: { in: mentionedNames } },
            select: { id: true, name: true }
          });

          mentionedUsers.forEach(({ id: mentionedId, name: mentionedName }) => {
            const onlineUser = onlineUsers.get(mentionedId);
            if (onlineUser) {
              io.to(onlineUser.socketId).emit('mentioned', {
                by: name,
                messageContent: content,
                messageId: message.id
              });
            }
          });
        }
      } catch (err) {
        console.error('Error saving message:', err);
      }
    });

    // --- Emoji Reactions ---
    socket.on('addReaction', async ({ messageId, emoji }) => {
      try {
        // Upsert: one reaction per user per message
        await prisma.messageReaction.upsert({
          where: { messageId_userId: { messageId, userId } },
          update: { emoji },
          create: { messageId, userId, emoji }
        });

        // Fetch updated reaction counts
        const reactions = await prisma.messageReaction.groupBy({
          by: ['emoji'],
          where: { messageId },
          _count: { emoji: true }
        });

        io.to('team-channel').emit('reactionUpdated', { messageId, reactions });
      } catch (err) {
        console.error('Error saving reaction:', err);
      }
    });

    socket.on('removeReaction', async ({ messageId }) => {
      try {
        await prisma.messageReaction.deleteMany({
          where: { messageId, userId }
        });

        const reactions = await prisma.messageReaction.groupBy({
          by: ['emoji'],
          where: { messageId },
          _count: { emoji: true }
        });

        io.to('team-channel').emit('reactionUpdated', { messageId, reactions });
      } catch (err) {
        console.error('Error removing reaction:', err);
      }
    });

    // --- Disconnect ---
    socket.on('disconnect', () => {
      console.log(`🔌 Disconnected: ${name}`);
      onlineUsers.delete(userId);
      io.emit('onlineUsers', Array.from(onlineUsers.entries()).map(([id, data]) => ({ id, name: data.name })));
      socket.to('team-channel').emit('userStoppedTyping', { userId });
    });
  });

  return io;
};

const getIo = () => {
  if (!io) throw new Error('Socket.io not initialized!');
  return io;
};

module.exports = { initSocket, getIo };