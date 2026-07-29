require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const authRouter = require('./routes/auth');

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

app.get('/', (req, res) => {
  res.json({ message: 'Hello from backend!' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;
