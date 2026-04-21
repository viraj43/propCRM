const express = require('express');
const prisma = require('../lib/prisma');
const { auth, requireRole } = require('../middleware/auth');
const crypto = require('crypto');

const router = express.Router();

// Simple in-memory webhook registry (persisted in DB via Webhook model if you add it later).
// For now we use a lightweight JSON store approach.

// GET /api/webhooks – list registered webhooks (admin only)
router.get('/', auth, requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    // Store webhooks in a JSON config for now; can be moved to DB later
    const webhooks = global._webhooks || [];
    res.json(webhooks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/webhooks – register a new webhook endpoint
router.post('/', auth, requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const { url, events, description } = req.body;
    if (!url || !events || !events.length) {
      return res.status(400).json({ error: 'url and events[] are required' });
    }

    if (!global._webhooks) global._webhooks = [];

    const webhook = {
      id: crypto.randomUUID(),
      url,
      events,        // e.g. ['lead.created', 'deal.closed']
      description: description || '',
      secret: crypto.randomBytes(20).toString('hex'),
      createdAt: new Date().toISOString(),
      createdBy: req.user.id,
    };

    global._webhooks.push(webhook);
    res.status(201).json(webhook);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/webhooks/:id – remove a webhook
router.delete('/:id', auth, requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    if (!global._webhooks) return res.json({ message: 'Not found' });
    global._webhooks = global._webhooks.filter(w => w.id !== req.params.id);
    res.json({ message: 'Webhook removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/webhooks/test/:id – fire a test ping to a registered webhook
router.post('/test/:id', auth, requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const webhook = (global._webhooks || []).find(w => w.id === req.params.id);
    if (!webhook) return res.status(404).json({ error: 'Webhook not found' });

    const payload = { event: 'ping', timestamp: new Date().toISOString(), data: { message: 'PropCRM webhook test' } };
    const body = JSON.stringify(payload);
    const sig = crypto.createHmac('sha256', webhook.secret).update(body).digest('hex');

    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-PropCRM-Signature': sig, 'X-PropCRM-Event': 'ping' },
      body,
    });

    res.json({ success: response.ok, status: response.status });
  } catch (err) {
    res.status(500).json({ error: 'Could not reach webhook URL: ' + err.message });
  }
});

// Helper exported to trigger webhooks from other routes
async function triggerWebhook(event, data) {
  try {
    const hooks = (global._webhooks || []).filter(w => w.events.includes(event) || w.events.includes('*'));
    const payload = JSON.stringify({ event, timestamp: new Date().toISOString(), data });

    await Promise.allSettled(hooks.map(hook => {
      const sig = crypto.createHmac('sha256', hook.secret).update(payload).digest('hex');
      return fetch(hook.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-PropCRM-Signature': sig, 'X-PropCRM-Event': event },
        body: payload,
      });
    }));
  } catch (err) {
    console.error('Webhook trigger error:', err.message);
  }
}

module.exports = router;
module.exports.triggerWebhook = triggerWebhook;
