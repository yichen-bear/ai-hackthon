require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const authRouter = require('./routes/auth');
const aiChatRouter = require('./routes/aiChat');
const addressRouter = require('./routes/address');
const memberAddressRouter = require('./routes/memberAddress');
const speechRouter = require('./routes/speech');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS 設定：允許前端 (localhost:3000) 發送 cookies
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
}));

// Body parser
app.use(express.json());

// Cookie parser
app.use(cookieParser());

// 掛載認證路由
app.use('/api/auth', authRouter);

// 掛載 AI 聊天表單助手路由
app.use('/api/ai-chat', aiChatRouter);

// 掛載地址查詢路由
app.use('/api/address', addressRouter);

// 掛載會員地址管理路由
app.use('/api/member/addresses', memberAddressRouter);

// 掛載語音辨識路由
app.use('/api/speech', speechRouter);

// 掛載 i二手相關路由
const listingsRouter = require('./routes/listings');
const messagesRouter = require('./routes/messages');
const reservationsRouter = require('./routes/reservations');
const uploadRouter = require('./routes/upload');
app.use('/api/listings', listingsRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/reservations', reservationsRouter);
app.use('/api/upload', uploadRouter);

// 靜態檔案（圖片上傳）
app.use('/uploads', express.static('public/uploads'));

app.get('/', (req, res) => {
  res.json({ message: 'Hello from backend!' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;
