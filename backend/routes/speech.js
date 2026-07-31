'use strict';

const router = require('express').Router();
const multer = require('multer');
const OpenAI = require('openai');

// multer 暫存到 memory（音檔通常很小）
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('不支援的音檔格式'), false);
    }
  },
});

/**
 * POST /api/speech/transcribe
 * 接收音檔（multipart form-data, field name: "audio"）。
 *
 * 辨識策略：
 * 1. 若有設定 TAIWAN_ASR_URL → 優先使用 Taiwan-Tongues ASR（支援台語）
 * 2. 否則 fallback 到 Groq Whisper API
 */
router.post('/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: '請上傳音檔' });
    }

    const taiwanAsrUrl = process.env.TAIWAN_ASR_URL;

    // 優先使用 Taiwan-Tongues ASR（Colab / 自建服務）
    if (taiwanAsrUrl) {
      try {
        const result = await callTaiwanAsr(taiwanAsrUrl, req.file);
        return res.status(200).json(result);
      } catch (err) {
        console.warn('[speech] Taiwan-Tongues ASR 失敗，fallback 到 Whisper:', err.message);
        // fallback 到 Groq Whisper
      }
    }

    // Fallback: Groq Whisper API
    const result = await callGroqWhisper(req.file);
    return res.status(200).json(result);
  } catch (err) {
    console.error('[POST /api/speech/transcribe] error:', err.message);

    if (err.status === 429) {
      return res.status(429).json({ success: false, message: '語音辨識服務忙碌，請稍後再試' });
    }

    return res.status(500).json({ success: false, message: '語音辨識失敗，請重試或改用文字輸入' });
  }
});

/**
 * 呼叫 Taiwan-Tongues ASR 服務（Colab / 自建）
 */
async function callTaiwanAsr(url, file) {
  // 使用 Node.js 原生 FormData（Node 18+ 支援）
  const formData = new FormData();
  const blob = new Blob([file.buffer], { type: file.mimetype });
  formData.append('audio', blob, file.originalname || 'recording.webm');

  const response = await fetch(url, {
    method: 'POST',
    body: formData,
    headers: {
      'ngrok-skip-browser-warning': 'true',
    },
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Taiwan ASR returned ${response.status}: ${body}`);
  }

  const data = await response.json();

  if (data.success && data.text) {
    return { success: true, text: data.text.trim() };
  } else if (data.success && !data.text) {
    return { success: true, text: '', message: '未偵測到語音內容' };
  } else {
    throw new Error(data.message || 'ASR 辨識失敗');
  }
}

/**
 * 呼叫 Groq Whisper API
 */
async function callGroqWhisper(file) {
  const client = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1',
  });

  const audioFile = new File(
    [file.buffer],
    file.originalname || 'audio.webm',
    { type: file.mimetype }
  );

  const transcription = await client.audio.transcriptions.create({
    file: audioFile,
    model: process.env.GROQ_WHISPER_MODEL || 'whisper-large-v3',
    language: undefined,
    response_format: 'json',
  });

  const text = (transcription.text || '').trim();

  if (!text) {
    return { success: true, text: '', message: '未偵測到語音內容' };
  }

  return { success: true, text };
}

module.exports = router;
