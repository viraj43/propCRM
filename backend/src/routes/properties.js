const express = require('express');
const prisma = require('../lib/prisma');
const { auth } = require('../middleware/auth');
const { keiroSearch } = require('../services/keiro');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9.]/g, ''))
});
const upload = multer({ storage });

const router = express.Router();

// GET /api/properties
router.get('/', auth, async (req, res) => {
  try {
    const { type, status, minPrice, maxPrice, search } = req.query;
    const where = {};
    if (type) where.type = type;
    if (status) where.status = status;
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice);
      if (maxPrice) where.price.lte = parseFloat(maxPrice);
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { sourceName: { contains: search, mode: 'insensitive' } },
      ];
    }
    const properties = await prisma.property.findMany({
      where,
      include: { agent: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(properties);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/properties/ai-search
router.get('/ai-search', auth, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'Query required' });
    const results = await keiroSearch(`real estate property: ${q}`, 3);
    res.json({ query: q, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/properties/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const property = await prisma.property.findUnique({
      where: { id: req.params.id },
      include: {
        agent: { select: { id: true, name: true, email: true, phone: true } },
        deals: { include: { client: true } },
      },
    });
    if (!property) return res.status(404).json({ error: 'Property not found' });
    res.json(property);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/properties
router.post('/', auth, upload.single('image'), async (req, res) => {
  try {
    const { title, type, location, price, size, amenities, status, description, agentId, isExternal, sourceUrl, sourceName, snippet } = req.body;
    const images = req.file ? [`/uploads/${req.file.filename}`] : [];
    const property = await prisma.property.create({
      data: {
        title, type, location: location || null,
        price: price ? parseFloat(price) : null,
        size: size ? parseFloat(size) : null,
        amenities, images, status, description,
        agent: { connect: { id: agentId || req.user.id } },
        isExternal: isExternal === 'true' || isExternal === true,
        sourceUrl, sourceName, snippet
      },
      include: { agent: { select: { id: true, name: true } } },
    });
    res.status(201).json(property);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/properties/:id
router.put('/:id', auth, upload.single('image'), async (req, res) => {
  try {
    const { title, type, location, price, size, amenities, status, description, agentId, isExternal, sourceUrl, sourceName, snippet } = req.body;
    
    const updateData = {
        title, type, location,
        price: price ? parseFloat(price) : undefined,
        size: size ? parseFloat(size) : undefined,
        amenities, status, description,
        isExternal: isExternal === 'true' || isExternal === true, sourceUrl, sourceName, snippet
    };
    if (agentId) {
      updateData.agent = { connect: { id: agentId } };
    }
    
    if (req.file) {
      updateData.images = [`/uploads/${req.file.filename}`];
    }

    const property = await prisma.property.update({
      where: { id: req.params.id },
      data: updateData,
      include: { agent: { select: { id: true, name: true } } },
    });
    res.json(property);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/properties/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    await prisma.property.delete({ where: { id: req.params.id } });
    res.json({ message: 'Property deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
