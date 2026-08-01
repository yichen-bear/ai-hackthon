'use strict';

const router = require('express').Router();
const multer = require('multer');
const OpenAI = require('openai');
const { execFile } = require('child_process');
const { randomUUID } = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { SageMakerRuntimeClient, InvokeEndpointCommand } = require('@aws-sdk/client-sagemaker-runtime');

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
    language: 'zh',
    prompt: '以下是繁體中文語音內容，請使用繁體中文輸出。',
    response_format: 'json',
  });

  const text = (transcription.text || '').trim();

  if (!text) {
    return { success: true, text: '', message: '未偵測到語音內容' };
  }

  return { success: true, text };
}

// ─────────────────────────────────────────────────────────────
// SageMaker 台語 ASR 端點（breeze-asr-26-realtime）
// 輸入：WAV PCM 16kHz mono bytes
// 輸出：{ "text": "辨識出的文字" }
// ─────────────────────────────────────────────────────────────

/**
 * 將上傳的音訊檔轉換為 16kHz 單聲道 PCM WAV（用 ffmpeg）
 * @param {Buffer} inputBuffer - 原始音訊 buffer
 * @param {string} originalName - 原始檔名（用於判斷副檔名）
 * @returns {Promise<Buffer>} - 轉換後的 WAV buffer
 */
function convertTo16kMonoWav(inputBuffer, originalName) {
  return new Promise((resolve, reject) => {
    const tmpDir = os.tmpdir();
    const id = randomUUID();
    const ext = path.extname(originalName || 'audio.webm') || '.webm';
    const inputPath = path.join(tmpDir, `sagemaker-input-${id}${ext}`);
    const outputPath = path.join(tmpDir, `sagemaker-output-${id}.wav`);

    fs.writeFileSync(inputPath, inputBuffer);

    execFile('C:\\ffmpeg\\bin\\ffmpeg.exe', [
      '-y', '-i', inputPath,
      '-ac', '1',
      '-ar', '16000',
      '-c:a', 'pcm_s16le',
      outputPath,
    ], { timeout: 15000 }, (err, stdout, stderr) => {
      // 清理 input 檔
      fs.unlink(inputPath, () => {});

      if (err) {
        fs.unlink(outputPath, () => {});
        return reject(new Error(`ffmpeg 轉檔失敗: ${err.message}`));
      }

      try {
        const wavBuffer = fs.readFileSync(outputPath);
        fs.unlink(outputPath, () => {});
        resolve(wavBuffer);
      } catch (readErr) {
        reject(new Error(`讀取轉檔結果失敗: ${readErr.message}`));
      }
    });
  });
}

/**
 * POST /api/speech/taiwanese-asr
 * 接收音檔（multipart form-data, field name: "audio"）
 * 透過 ffmpeg 轉為 16kHz mono WAV 後呼叫 SageMaker 台語辨識端點
 */
router.post('/taiwanese-asr', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: '請上傳音檔' });
    }

    const endpointName = process.env.SAGEMAKER_ENDPOINT_NAME;
    if (!endpointName) {
      return res.status(500).json({ success: false, message: 'SageMaker 端點未設定' });
    }

    // 1. 轉檔為 16kHz mono WAV
    let wavBuffer;
    try {
      wavBuffer = await convertTo16kMonoWav(req.file.buffer, req.file.originalname);
    } catch (convertErr) {
      console.error('[taiwanese-asr] ffmpeg 轉檔錯誤:', convertErr.message);
      return res.status(500).json({ success: false, message: '音訊轉檔失敗，請確認 ffmpeg 已安裝' });
    }

    // 2. 呼叫 SageMaker 端點
    const sagemakerClient = new SageMakerRuntimeClient({
      region: process.env.AWS_DEFAULT_REGION || 'us-west-2',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        sessionToken: process.env.AWS_SESSION_TOKEN || undefined,
      },
    });

    const command = new InvokeEndpointCommand({
      EndpointName: endpointName,
      ContentType: 'audio/wav',
      Body: wavBuffer,
    });

    const response = await sagemakerClient.send(command);

    // 3. 解析回傳結果
    const bodyStr = new TextDecoder('utf-8').decode(response.Body);
    const result = JSON.parse(bodyStr);

    const text = (result.text || '').trim();
    if (!text) {
      return res.status(200).json({ success: true, text: '', message: '未偵測到語音內容' });
    }

    return res.status(200).json({ success: true, text });
  } catch (err) {
    console.error('[POST /api/speech/taiwanese-asr] error:', err.message);

    if (err.name === 'ValidationError' || err.$metadata?.httpStatusCode === 400) {
      return res.status(400).json({ success: false, message: '音訊格式不正確' });
    }

    return res.status(500).json({ success: false, message: '台語辨識失敗，請重試' });
  }
});

module.exports = router;
