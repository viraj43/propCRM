const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const prisma = require('../src/lib/prisma');
const bcrypt = require('bcryptjs');

async function main() {
  console.log('🌱 Clearing existing database...');
  await prisma.document.deleteMany();
  await prisma.deal.deleteMany();
  await prisma.interaction.deleteMany();
  await prisma.followUp.deleteMany();
  await prisma.client.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.property.deleteMany();
  await prisma.user.deleteMany();

  console.log('🌱 Seeding database...');

  // Create admin user
  const adminPass = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@realestate.com' },
    update: {},
    create: { name: 'Admin User', email: 'admin@realestate.com', password: adminPass, role: 'ADMIN', phone: '+91-9876543210' },
  });

  // Create manager
  const managerPass = await bcrypt.hash('manager123', 10);
  const manager = await prisma.user.upsert({
    where: { email: 'manager@realestate.com' },
    update: {},
    create: { name: 'Sarah Manager', email: 'manager@realestate.com', password: managerPass, role: 'MANAGER', phone: '+91-9876543211' },
  });

  // Create agents
  const agentPass = await bcrypt.hash('agent123', 10);
  const agent1 = await prisma.user.upsert({
    where: { email: 'raj@realestate.com' },
    update: {},
    create: { name: 'Raj Sharma', email: 'raj@realestate.com', password: agentPass, role: 'AGENT', phone: '+91-9876543212' },
  });
  const agent2 = await prisma.user.upsert({
    where: { email: 'priya@realestate.com' },
    update: {},
    create: { name: 'Priya Patel', email: 'priya@realestate.com', password: agentPass, role: 'AGENT', phone: '+91-9876543213' },
  });

  // Create properties
  const prop1 = await prisma.property.create({
    data: {
      title: '3BHK Luxury Apartment - Bandra West',
      type: 'RESIDENTIAL',
      location: 'Bandra West, Mumbai',
      price: 18500000,
      size: 1450,
      amenities: 'Swimming Pool, Gym, 24/7 Security, Parking, Club House',
      images: [],
      status: 'AVAILABLE',
      description: 'Spacious 3BHK luxury apartment with sea view in the heart of Bandra West.',
      agentId: agent1.id,
    },
  });

  const prop2 = await prisma.property.create({
    data: {
      title: 'Commercial Office Space - BKC',
      type: 'COMMERCIAL',
      location: 'Bandra Kurla Complex, Mumbai',
      price: 45000000,
      size: 3200,
      amenities: 'Central AC, High-speed Internet, 24/7 Power Backup, Cafeteria',
      images: [],
      status: 'AVAILABLE',
      description: 'Premium commercial office space in prime BKC location.',
      agentId: agent2.id,
    },
  });

  const prop3 = await prisma.property.create({
    data: {
      title: '2BHK Apartment - Powai',
      type: 'RESIDENTIAL',
      location: 'Powai, Mumbai',
      price: 12000000,
      size: 950,
      amenities: 'Gym, Security, Parking',
      images: [],
      status: 'AVAILABLE',
      description: 'Modern 2BHK with lake view in Powai.',
      agentId: agent1.id,
    },
  });

  // Create leads
  const lead1 = await prisma.lead.create({
    data: {
      name: 'Arjun Mehta',
      phone: '+91-9988776655',
      email: 'arjun.mehta@gmail.com',
      budget: 20000000,
      source: 'WEBSITE',
      status: 'QUALIFIED',
      preferences: '3BHK, Mumbai, near schools',
      notes: 'Looking for family home, ready to buy in 2 months',
      agentId: agent1.id,
    },
  });

  const lead2 = await prisma.lead.create({
    data: {
      name: 'Sunita Kapoor',
      phone: '+91-9977665544',
      email: 'sunita.k@yahoo.com',
      budget: 50000000,
      source: 'REFERRAL',
      status: 'CONTACTED',
      preferences: 'Commercial space, BKC area',
      notes: 'Expanding business, needs 3000+ sqft office',
      agentId: agent2.id,
    },
  });

  const lead3 = await prisma.lead.create({
    data: {
      name: 'Vikram Singh',
      phone: '+91-9966554433',
      email: 'vikram.s@gmail.com',
      budget: 15000000,
      source: 'ADS',
      status: 'NEW',
      preferences: '2BHK or 3BHK, Powai or Andheri',
      notes: 'First-time buyer, needs guidance on home loans',
      agentId: agent1.id,
    },
  });

  // Follow-ups
  await prisma.followUp.createMany({
    data: [
      { leadId: lead1.id, scheduledAt: new Date(Date.now() + 86400000), note: 'Schedule property visit for Bandra apartment', isDone: false },
      { leadId: lead2.id, scheduledAt: new Date(Date.now() - 86400000), note: 'Send BKC commercial listing details', isDone: true },
      { leadId: lead3.id, scheduledAt: new Date(Date.now() + 172800000), note: 'Call to discuss loan eligibility', isDone: false },
    ],
  });

  // Create clients
  const client1 = await prisma.client.create({
    data: {
      name: 'Arjun Mehta',
      phone: '+91-9988776655',
      email: 'arjun.mehta@gmail.com',
      type: 'BUYER',
      notes: 'High-value buyer, prefers premium properties',
      leadId: lead1.id,
    },
  });

  const client2 = await prisma.client.create({
    data: {
      name: 'Sunita Kapoor',
      phone: '+91-9977665544',
      email: 'sunita.k@yahoo.com',
      type: 'BUYER',
      notes: 'Corporate buyer, needs invoice and legal support',
      leadId: lead2.id,
    },
  });

  // Interactions
  await prisma.interaction.createMany({
    data: [
      { clientId: client1.id, type: 'CALL', note: 'Initial call - discussed budget and preferences. Client is serious buyer.' },
      { clientId: client1.id, type: 'VISIT', note: 'Visited Bandra West property. Very interested, wants negotiation.' },
      { clientId: client2.id, type: 'EMAIL', note: 'Sent commercial property brochure and pricing details.' },
      { clientId: client2.id, type: 'MEETING', note: 'Meeting at BKC office - discussed terms and legal requirements.' },
    ],
  });

  // Create deals
  const deal1 = await prisma.deal.create({
    data: {
      clientId: client1.id,
      propertyId: prop1.id,
      agentId: agent1.id,
      stage: 'NEGOTIATION',
      value: 17500000,
      commission: 350000,
      notes: 'Client wants 5% discount. Counter-offered at 3%.',
    },
  });

  const deal2 = await prisma.deal.create({
    data: {
      clientId: client2.id,
      propertyId: prop2.id,
      agentId: agent2.id,
      stage: 'CLOSED',
      value: 45000000,
      commission: 900000,
      notes: 'Deal closed successfully. All documents signed.',
    },
  });

  console.log('✅ Seed complete!');
  console.log('📧 Login credentials:');
  console.log('   Admin:   admin@realestate.com / admin123');
  console.log('   Manager: manager@realestate.com / manager123');
  console.log('   Agent:   raj@realestate.com / agent123');
  console.log('   Agent:   priya@realestate.com / agent123');
}

main().catch(console.error).finally(() => prisma.$disconnect());
