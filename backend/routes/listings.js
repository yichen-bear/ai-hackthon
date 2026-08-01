const express = require('express')
const router = express.Router()
const prisma = require('../utils/prismaClient')
const { maskName } = require('../utils/maskName')

// GET /api/listings - 取得二手商品列表
router.get('/', async (req, res) => {
  try {
    const { category, status = 'active' } = req.query
    const where = { isDeleted: false, status }
    if (category && category !== 'all') {
      if (category === 'free') where.isFree = true
      else where.category = category
    }
    const listings = await prisma.secondhandListing.findMany({
      where,
      orderBy: { creTime: 'desc' },
      take: 50,
    })
    // i二手 listing 回傳時賣家名稱脫敏
    const masked = listings.map(l => ({
      ...l,
      sellerName: maskName(l.sellerName),
    }))
    res.json(masked)
  } catch (err) {
    console.error('GET /api/listings error:', err)
    res.status(500).json({ error: 'Failed to fetch listings' })
  }
})

// POST /api/listings - 刊登新商品
router.post('/', async (req, res) => {
  try {
    const { sellerId, sellerName, sellerPhone, productName, description, price, isFree, category, imageUrl, pickupStore, pickupMethod, carbonSaved } = req.body
    if (!sellerName || !productName || !pickupStore) {
      return res.status(400).json({ error: 'sellerName, productName, pickupStore are required' })
    }
    const listing = await prisma.secondhandListing.create({
      data: {
        sellerId: sellerId || '00000000-0000-0000-0000-000000000000',
        sellerName,
        sellerPhone: sellerPhone || null,
        productName,
        description: description || null,
        price: price || 0,
        isFree: isFree || price === 0,
        category: category || 'household',
        imageUrl: imageUrl || null,
        pickupStore,
        pickupMethod: pickupMethod || '門市面交',
        carbonSaved: carbonSaved || 0,
      },
    })
    res.status(201).json(listing)
  } catch (err) {
    console.error('POST /api/listings error:', err)
    res.status(500).json({ error: 'Failed to create listing' })
  }
})

// PATCH /api/listings/:id - 更新商品狀態
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body
    const listing = await prisma.secondhandListing.update({
      where: { id },
      data: { status },
    })
    res.json(listing)
  } catch (err) {
    console.error('PATCH /api/listings error:', err)
    res.status(500).json({ error: 'Failed to update listing' })
  }
})

module.exports = router
