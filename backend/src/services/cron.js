const cron = require('node-cron');
const prisma = require('../lib/prisma');
const { sendEmail } = require('./email');

// Schedule tasks to run every day at 08:00 AM
cron.schedule('0 8 * * *', async () => {
  console.log('⏰ Running daily agent reminders job...');
  try {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const pendingFollowUps = await prisma.followUp.findMany({
      where: {
        isDone: false,
        scheduledAt: {
          lte: today,
        },
      },
      include: {
        lead: {
          include: {
            assignedTo: true,
          },
        },
      },
    });

    const tasksByAgent = pendingFollowUps.reduce((acc, task) => {
      if (task.lead.assignedTo && task.lead.assignedTo.email) {
        const agentId = task.lead.assignedTo.id;
        if (!acc[agentId]) {
          acc[agentId] = {
            agent: task.lead.assignedTo,
            tasks: [],
          };
        }
        acc[agentId].tasks.push(task);
      }
      return acc;
    }, {});

    for (const agentId in tasksByAgent) {
      const { agent, tasks } = tasksByAgent[agentId];
      
      const taskListHtml = tasks.map(t => 
        `<li><strong>${t.lead.name}</strong> - ${t.note || 'Follow-up'} (Scheduled: ${new Date(t.scheduledAt).toLocaleDateString()})</li>`
      ).join('');

      await sendEmail({
        to: agent.email,
        subject: `PropCRM: You have ${tasks.length} pending tasks today`,
        text: `Hi ${agent.name},\n\nYou have ${tasks.length} pending or overdue follow-ups that need your attention today. Please log in to PropCRM to view them.\n\nBest regards,\nPropCRM Team`,
        html: `<p>Hi ${agent.name},</p><p>You have <strong>${tasks.length}</strong> pending or overdue follow-ups that need your attention today:</p><ul>${taskListHtml}</ul><p>Please log in to PropCRM to take action.</p><br/><p>Best regards,<br/><strong>PropCRM Team</strong></p>`
      });
      console.log(`✉️ Sent reminder to agent: ${agent.email}`);
    }

    console.log('✅ Daily agent reminders job completed.');
  } catch (err) {
    console.error('❌ Error running daily agent reminders job:', err.message);
  }
});
