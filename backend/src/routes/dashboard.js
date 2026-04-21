const express = require('express');
const prisma = require('../lib/prisma');
const { auth } = require('../middleware/auth');

const router = express.Router();

// GET /api/dashboard/stats
router.get('/stats', auth, async (req, res) => {
  try {
    const agentFilter = req.user.role === 'AGENT' ? { agentId: req.user.id } : {};

    const [totalLeads, newLeads, totalProperties, availableProperties, totalClients, totalDeals, closedDeals, deals] = await Promise.all([
      prisma.lead.count({ where: agentFilter }),
      prisma.lead.count({ where: { ...agentFilter, status: 'NEW' } }),
      prisma.property.count(),
      prisma.property.count({ where: { status: 'AVAILABLE' } }),
      prisma.client.count(),
      prisma.deal.count({ where: agentFilter }),
      prisma.deal.count({ where: { ...agentFilter, stage: 'CLOSED' } }),
      prisma.deal.findMany({ where: { ...agentFilter, stage: 'CLOSED' }, select: { value: true, commission: true } }),
    ]);

    const totalRevenue = deals.reduce((sum, d) => sum + d.value, 0);
    const totalCommission = deals.reduce((sum, d) => sum + (d.commission || 0), 0);
    const conversionRate = totalLeads > 0 ? ((closedDeals / totalLeads) * 100).toFixed(1) : 0;

    // Lead status breakdown
    const leadsByStatus = await prisma.lead.groupBy({
      by: ['status'],
      _count: { status: true },
      where: agentFilter,
    });

    // Deals by stage
    const dealsByStage = await prisma.deal.groupBy({
      by: ['stage'],
      _count: { stage: true },
      where: agentFilter,
    });

    // Recent 5 leads
    const recentLeads = await prisma.lead.findMany({
      where: agentFilter,
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { assignedTo: { select: { name: true } } },
    });

    // Recent 5 deals
    const recentDeals = await prisma.deal.findMany({
      where: agentFilter,
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { client: { select: { name: true } }, property: { select: { title: true } } },
    });

    // Pending follow-ups
    const pendingFollowUps = await prisma.followUp.count({
      where: { isDone: false, scheduledAt: { lte: new Date() } },
    });

    res.json({
      stats: { totalLeads, newLeads, totalProperties, availableProperties, totalClients, totalDeals, closedDeals, totalRevenue, totalCommission, conversionRate, pendingFollowUps },
      leadsByStatus,
      dealsByStage,
      recentLeads,
      recentDeals,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/reports – Full data for Reports page + export
router.get('/reports', auth, async (req, res) => {
  try {
    const agentFilter = req.user.role === 'AGENT' ? { agentId: req.user.id } : {};

    // Agent performance
    const agentPerformance = await prisma.user.findMany({
      where: { role: 'AGENT' },
      select: {
        id: true, name: true, email: true,
        leads: { select: { status: true } },
        deals: { select: { stage: true, value: true, commission: true } },
        properties: { select: { id: true } },
      },
    });

    const agentStats = agentPerformance.map(a => ({
      name: a.name,
      email: a.email,
      totalLeads: a.leads.length,
      closedLeads: a.leads.filter(l => l.status === 'CLOSED').length,
      totalDeals: a.deals.length,
      closedDeals: a.deals.filter(d => d.stage === 'CLOSED').length,
      totalRevenue: a.deals.filter(d => d.stage === 'CLOSED').reduce((s, d) => s + d.value, 0),
      totalCommission: a.deals.reduce((s, d) => s + (d.commission || 0), 0),
      properties: a.properties.length,
      conversionRate: a.leads.length > 0 ? ((a.deals.filter(d => d.stage === 'CLOSED').length / a.leads.length) * 100).toFixed(1) : '0',
    }));

    // Monthly revenue (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const closedDeals = await prisma.deal.findMany({
      where: { ...agentFilter, stage: 'CLOSED', createdAt: { gte: sixMonthsAgo } },
      select: { value: true, commission: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const monthlyMap = {};
    closedDeals.forEach(d => {
      const key = new Date(d.createdAt).toLocaleString('en-IN', { month: 'short', year: '2-digit' });
      if (!monthlyMap[key]) monthlyMap[key] = { month: key, revenue: 0, commission: 0, deals: 0 };
      monthlyMap[key].revenue += d.value;
      monthlyMap[key].commission += d.commission || 0;
      monthlyMap[key].deals += 1;
    });
    const monthlyRevenue = Object.values(monthlyMap);

    // Lead source breakdown
    const leadsBySource = await prisma.lead.groupBy({
      by: ['source'],
      _count: { source: true },
      where: agentFilter,
    });

    // All deals for table export
    const allDeals = await prisma.deal.findMany({
      where: agentFilter,
      include: {
        client: { select: { name: true, email: true, phone: true } },
        property: { select: { title: true, location: true } },
        agent: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // All leads for export
    const allLeads = await prisma.lead.findMany({
      where: agentFilter,
      include: { assignedTo: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ agentStats, monthlyRevenue, leadsBySource, allDeals, allLeads });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
