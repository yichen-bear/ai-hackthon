const express = require('express')
const router = express.Router()
const path = require('path')
const fs = require('fs')

// 確保 uploads 目錄存在
const UPLOAD_DIR = path.join(__dirname, '..', 'public', 'uploads')
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

// POST /api/upload - 圖片上傳（base64）
router.post('/', express.json({ limit: '10mb' }), async (req, res) => {
  try {
    const { image, filename } = req.body
    if (!image) {
      return res.status(400).json({ error: 'image (base64) is required' })
    }

    // 解析 base64
    const matches = image.match(/^data:image\/(png|jpeg|jpg|gif|webp);base64,(.+)$/)
    if (!matches) {
      return res.status(400).json({ error: 'Invalid image format. Expected base64 data URI.' })
    }

    const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1]
    const data = Buffer.from(matches[2], 'base64')
    const fname = filename || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const filePath = path.join(UPLOAD_DIR, fname)

    fs.writeFileSync(filePath, data)

    const url = `/uploads/${fname}`
    res.status(201).json({ url, filename: fname })
  } catch (err) {
    console.error('POST /api/upload error:', err)
    res.status(500).json({ error: 'Failed to upload image' })
  }
})

module.exports = router
