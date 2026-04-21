const express = require('express');
const prisma = require('../lib/prisma');
const { auth } = require('../middleware/auth');
const { sendEmail } = require('../services/email');

const router = express.Router();

// POST /api/email/lead/:id  - Send email to a lead
router.post('/lead/:id', auth, async (req, res) => {
  try {
    const { subject, message } = req.body;
    if (!subject || !message) return res.status(400).json({ error: 'Subject and message are required' });

    const lead = await prisma.lead.findUnique({ where: { id: req.params.id } });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    if (!lead.email) return res.status(400).json({ error: 'Lead has no email address' });

    const result = await sendEmail({
      to: lead.email,
      subject,
      text: message,
      html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #6366f1; color: white; padding: 16px 24px; border-radius: 8px 8px 0 0;">
          <h2 style="margin:0; font-size:18px;">PropCRM</h2>
        </div>
        <div style="padding: 24px; background: #fff; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
          <p style="white-space: pre-wrap; color: #374151; font-size: 15px; line-height: 1.6;">${message}</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">Sent via PropCRM by ${req.user.name}</p>
        </div>
      </div>`,
    });

    // Auto-log a note on the lead
    await prisma.lead.update({
      where: { id: req.params.id },
      data: {
        notes: `[EMAIL SENT] ${new Date().toLocaleDateString('en-IN')}: ${subject}`,
      },
    });

    res.json({ success: true, messageId: result.messageId, previewUrl: result.previewUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/email/client/:id  - Send email to a client + log interaction
router.post('/client/:id', auth, async (req, res) => {
  try {
    const { subject, message } = req.body;
    if (!subject || !message) return res.status(400).json({ error: 'Subject and message are required' });

    const client = await prisma.client.findUnique({ where: { id: req.params.id } });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    if (!client.email) return res.status(400).json({ error: 'Client has no email address' });

    const result = await sendEmail({
      to: client.email,
      subject,
      text: message,
      html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #6366f1; color: white; padding: 16px 24px; border-radius: 8px 8px 0 0;">
          <h2 style="margin:0; font-size:18px;">PropCRM</h2>
        </div>
        <div style="padding: 24px; background: #fff; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
          <p style="white-space: pre-wrap; color: #374151; font-size: 15px; line-height: 1.6;">${message}</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">Sent via PropCRM by ${req.user.name}</p>
        </div>
      </div>`,
    });

    // Auto-log an EMAIL interaction for this client
    await prisma.interaction.create({
      data: {
        clientId: req.params.id,
        type: 'EMAIL',
        note: `Email sent — Subject: "${subject}"\n\n${message}`,
      },
    });

    res.json({ success: true, messageId: result.messageId, previewUrl: result.previewUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
