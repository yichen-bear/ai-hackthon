require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const authRouter = require('./routes/auth');
const aiChatRouter = require('./routes/aiChat');
const addressRouter = require('./routes/address');
const memberAddressRouter = require('./routes/memberAddress');
let speechRouter
try { speechRouter = require('./routes/speech') } catch (e) { speechRouter = require('express').Router(); console.warn('⚠️ speech route skipped (missing dependency)') }
const formRouter = require('./routes/form');
const healthTrackerRouter = require('./routes/healthTracker');
const wasteClassificationRouter = require('./routes/wasteClassification');
const truckScheduleRouter = require('./routes/truckSchedule');
const garbageRouter = require('./routes/garbage');
const midpointRouter = require('./routes/midpoint');
const foodRouter = require('./routes/food');
const queueRouter = require('./routes/queue');
const foodReservationRouter = require('./routes/reservation');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS 設定：允許前端網域發送 cookies
const allowedOrigins = [
  'http://localhost:3000',
  'https://main.d1wtq1dth6sl4x.amplifyapp.com',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // 允許無 origin 的請求（如 curl、server-to-server）
    if (!origin || allowedOrigins.some(o => origin.startsWith(o))) {
      callback(null, true);
    } else {
      callback(null, true); // 開發階段先全部允許，正式上線再鎖
    }
  },
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
app.use('/api/member/tickets', require('./routes/memberTickets'));

// 掛載語音辨識路由
app.use('/api/speech', speechRouter);

// 掛載表單路由
app.use('/api/forms', formRouter);

// 掛載健康追蹤路由
app.use('/api/health-tracker', healthTrackerRouter);

// 掛載垃圾分類 AI 助手路由
app.use('/api/waste-classification', wasteClassificationRouter);

// 掛載垃圾車清運點查詢路由
app.use('/api/truck-schedule', truckScheduleRouter);

// 掛載台北市垃圾清運點公開資料 API 路由
app.use('/api/garbage', garbageRouter);

// 掛載多人中點餐廳推薦路由
app.use('/api/midpoint', midpointRouter);

// 掛載附近餐廳推薦路由（想吃什麼）
app.use('/api/food', foodRouter);

// 掛載餐廳候位系統路由
app.use('/api/queue', queueRouter);

// 掛載餐廳訂位系統路由
app.use('/api/food-reservations', foodReservationRouter);

// 掛載附近醫療資源路由（門診掛號 Google Maps）
const nearbyClinicRouter = require('./routes/nearbyClinic');
app.use('/api/nearby-clinic', nearbyClinicRouter);

// 掛載 AI 診斷與掛號路由
const diagnosisRouter = require('./routes/diagnosis');
app.use('/api/diagnosis', diagnosisRouter);
// 掛載 i二手相關路由
const listingsRouter = require('./routes/listings');
const messagesRouter = require('./routes/messages');
const reservationsRouter = require('./routes/reservations');
const uploadRouter = require('./routes/upload');
const groupsRouter = require('./routes/groups');
app.use('/api/listings', listingsRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/reservations', reservationsRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/groups', groupsRouter);
app.use('/api/secondhand-items', require('./routes/secondhand-items'));
app.use('/api/activities', require('./routes/activities'));
app.use('/api/rides', require('./routes/rides'));

// 靜態檔案（圖片上傳）
app.use('/uploads', express.static('public/uploads'));

app.get('/', (req, res) => {
  res.json({ message: 'Hello from backend!' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;
