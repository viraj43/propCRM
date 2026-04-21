require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const leadRoutes = require('./routes/leads');
const propertyRoutes = require('./routes/properties');
const clientRoutes = require('./routes/clients');
const dealRoutes = require('./routes/deals');
const dashboardRoutes = require('./routes/dashboard');
const agentRoutes = require('./routes/agents');
const tasksRoutes = require('./routes/tasks');
const emailRoutes = require('./routes/email');
const webhookRoutes = require('./routes/webhooks');
const chatRoutes = require('./routes/chat');
const channelRoutes = require('./routes/channels');
// Initialize cron jobs
require('./services/cron');

const http = require('http');
const { initSocket } = require('./socket');

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/deals', dealRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/chat', chatRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Real Estate CRM API running' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
