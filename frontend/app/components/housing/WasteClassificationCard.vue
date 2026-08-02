<script setup lang="ts">
/**
 * AI 垃圾分類助手元件
 * 串接 /api/waste-classification/classify API
 * 支援多輪追問對話、圖片上傳描述、分類結果卡片渲染
 */

// ─── Types ───
interface ChatMessage {
  id: string
  role: 'user' | 'ai'
  text: string
  quickReplies?: string[]
}

interface ClassificationResult {
  itemName: string
  category: string
  disposalAdvice: string
  feedbackNo: string | null
}

// ─── State ───
const query = ref('')
const photoInput = ref<HTMLInputElement | null>(null)
const photos = ref<string[]>([])
const messages = ref<ChatMessage[]>([])
const isThinking = ref(false)
const chatContainer = ref<HTMLElement | null>(null)

// 已完成的分類結果紀錄
const classificationResults = ref<ClassificationResult[]>([])

// 對話歷史（供 API 使用）
const conversationHistory = computed(() =>
  messages.value.map(msg => ({ role: msg.role, text: msg.text }))
)

// ─── API 呼叫 ───
const { apiFetch } = useApi()

async function callClassifyAPI(userInput: string, imageDescription?: string) {
  const response = await apiFetch<{
    success: boolean
    data: {
      action: 'classify' | 'ask_detail'
      replyText: string
      classification: { itemName: string; category: string; disposalAdvice: string } | null
      quickReplies: string[] | null
      feedbackNo: string | null
    }
  }>(`/api/waste-classification/classify`, {
    method: 'POST',
    body: {
      conversationHistory: conversationHistory.value,
      userInput,
      imageDescription,
    },
  })
  return response
}

// ─── 照片處理 ───
function triggerPhotoUpload() {
  photoInput.value?.click()
}

function handlePhotoChange(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files) return
  for (const file of Array.from(input.files)) {
    const reader = new FileReader()
    reader.onload = (e) => {
      if (e.target?.result) {
        photos.value.push(e.target.result as string)
      }
    }
    reader.readAsDataURL(file)
  }
  input.value = ''
}

function removePhoto(index: number) {
  photos.value.splice(index, 1)
}

// ─── 送出查詢 ───
async function submitQuery() {
  if (!query.value.trim() && photos.value.length === 0) return

  const userText = query.value.trim() || '(已上傳照片)'
  const imageDesc = photos.value.length > 0 ? '使用者拍攝了一張垃圾物品的照片' : undefined

  // 新增使用者訊息
  messages.value.push({
    id: `msg-${Date.now()}`,
    role: 'user',
    text: userText,
  })

  // 清空輸入
  const inputText = query.value.trim()
  query.value = ''
  photos.value = []

  // 顯示 AI 思考狀態
  isThinking.value = true
  scrollToBottom()

  try {
    const result = await callClassifyAPI(inputText, imageDesc)

    if (result.success && result.data) {
      const { action, replyText, classification, quickReplies, feedbackNo } = result.data

      // 新增 AI 回覆訊息
      messages.value.push({
        id: `msg-${Date.now()}-ai`,
        role: 'ai',
        text: replyText,
        quickReplies: quickReplies || undefined,
      })

      // 若已完成分類，新增結果卡片
      if (action === 'classify' && classification) {
        classificationResults.value.unshift({
          itemName: classification.itemName,
          category: classification.category,
          disposalAdvice: classification.disposalAdvice,
          feedbackNo,
        })
      }
    }
  } catch (error) {
    // API 呼叫失敗時的 fallback
    messages.value.push({
      id: `msg-${Date.now()}-err`,
      role: 'ai',
      text: '抱歉，目前服務暫時無法使用，請稍後再試。',
    })
  } finally {
    isThinking.value = false
    scrollToBottom()
  }
}

function submitQuickReply(reply: string) {
  query.value = reply
  submitQuery()
}

function scrollToBottom() {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    }
  })
}

// ─── 分類 Tag 顏色對照 ───
function getCategoryColor(category: string): string {
  const colorMap: Record<string, string> = {
    '一般垃圾': '#6b7280',
    '紙容器類': '#d97706',
    '一般紙類': '#92400e',
    '塑膠類': '#2563eb',
    '金屬類': '#7c3aed',
    '玻璃類': '#059669',
    '廚餘': '#dc2626',
    '有害垃圾': '#be123c',
    '大型廢棄物': '#4b5563',
    '電子廢棄物': '#0891b2',
  }
  return colorMap[category] || '#6b7280'
}

// ─── 處置建議拆分為步驟列表 ───
function parseDisposalSteps(advice: string): string[] {
  // 嘗試以換行或數字序號分割
  const lines = advice.split(/\n|(?=\d+[.、\)])/g).filter(l => l.trim())
  if (lines.length > 1) return lines.map(l => l.replace(/^\d+[.、\)]\s*/, '').trim()).filter(Boolean)
  // 嘗試以句號分割
  const sentences = advice.split(/[。；]/).filter(s => s.trim())
  if (sentences.length > 1) return sentences.map(s => s.trim())
  return [advice]
}
</script>

<template>
  <div class="waste-card">
    <!-- ─── AI 對話區 ─── -->
    <div class="waste-card__chat-section">
      <h3 class="waste-card__title">♻️ AI 垃圾分類助手</h3>
      <p class="waste-card__subtitle">輸入垃圾名稱或拍照，AI 幫你判斷分類與處置方式</p>

      <!-- 對話歷史 -->
      <div v-if="messages.length > 0" ref="chatContainer" class="waste-chat">
        <div
          v-for="msg in messages"
          :key="msg.id"
          :class="['waste-chat__bubble', msg.role === 'user' ? 'waste-chat__bubble--user' : 'waste-chat__bubble--ai']"
        >
          <p class="waste-chat__text">{{ msg.text }}</p>
          <!-- 快捷回覆 -->
          <div v-if="msg.quickReplies && msg.quickReplies.length > 0" class="waste-chat__quick-replies">
            <button
              v-for="reply in msg.quickReplies"
              :key="reply"
              class="waste-chat__quick-btn"
              type="button"
              @click="submitQuickReply(reply)"
            >
              {{ reply }}
            </button>
          </div>
        </div>
        <!-- AI 思考指示 -->
        <div v-if="isThinking" class="waste-chat__bubble waste-chat__bubble--ai">
          <p class="waste-chat__text waste-chat__thinking">🤔 AI 辨識分析中...</p>
        </div>
      </div>

      <!-- 照片預覽 -->
      <div v-if="photos.length > 0" class="waste-card__photos">
        <div v-for="(photo, idx) in photos" :key="idx" class="waste-card__photo-thumb">
          <img :src="photo" alt="垃圾照片預覽" class="waste-card__photo-img">
          <button class="waste-card__photo-remove" type="button" @click="removePhoto(idx)">✕</button>
        </div>
      </div>

      <!-- 輸入區 -->
      <div class="waste-card__input-area">
        <button class="waste-card__photo-btn" type="button" aria-label="上傳照片" @click="triggerPhotoUpload">
          📷
        </button>
        <input
          ref="photoInput"
          type="file"
          accept="image/*"
          multiple
          class="sr-only"
          @change="handlePhotoChange"
        >
        <input
          v-model="query"
          type="text"
          class="waste-card__text-input"
          placeholder="輸入垃圾名稱，例如：紙便當盒、手搖飲料杯..."
          @keyup.enter="submitQuery"
        >
        <button class="waste-card__submit-btn" type="button" :disabled="isThinking" @click="submitQuery">
          🔍 辨識
        </button>
      </div>
    </div>

    <!-- ─── 分類結果卡片列表 ─── -->
    <div v-if="classificationResults.length > 0" class="waste-results">
      <h4 class="waste-results__title">📋 辨識結果</h4>
      <div
        v-for="(result, idx) in classificationResults"
        :key="idx"
        class="waste-result-card"
      >
        <!-- 物品名稱與分類 Tag -->
        <div class="waste-result-card__header">
          <span class="waste-result-card__item-name">{{ result.itemName }}</span>
          <span
            class="waste-result-card__tag"
            :style="{ backgroundColor: getCategoryColor(result.category) + '18', color: getCategoryColor(result.category), borderColor: getCategoryColor(result.category) }"
          >
            [{{ result.category }}]
          </span>
        </div>

        <!-- 處置建議步驟 -->
        <div class="waste-result-card__advice">
          <p class="waste-result-card__advice-title">💡 正確處理步驟：</p>
          <ol class="waste-result-card__steps">
            <li v-for="(step, stepIdx) in parseDisposalSteps(result.disposalAdvice)" :key="stepIdx">
              {{ step }}
            </li>
          </ol>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.waste-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ─── Chat Section ─── */
.waste-card__chat-section {
  background: #fff;
  border-radius: 16px;
  padding: 18px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.07);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.waste-card__title {
  font-size: 17px;
  font-weight: 700;
  margin: 0;
  color: #2d2d2d;
}

.waste-card__subtitle {
  font-size: 13px;
  color: #888;
  margin: -6px 0 0;
}

/* ─── Chat Bubbles ─── */
.waste-chat {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 300px;
  overflow-y: auto;
  padding: 8px 0;
}

.waste-chat__bubble {
  padding: 10px 14px;
  border-radius: 14px;
  max-width: 85%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.waste-chat__bubble--user {
  align-self: flex-end;
  background: #3b7a70;
  color: #fff;
  border-bottom-right-radius: 4px;
}

.waste-chat__bubble--ai {
  align-self: flex-start;
  background: #f3f4f6;
  color: #333;
  border-bottom-left-radius: 4px;
}

.waste-chat__text {
  font-size: 14px;
  margin: 0;
  line-height: 1.6;
  white-space: pre-wrap;
}

.waste-chat__thinking {
  animation: pulse 1.2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.waste-chat__quick-replies {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
}

.waste-chat__quick-btn {
  padding: 6px 12px;
  border-radius: 16px;
  border: 1.5px solid #d4ece5;
  background: #e8f5f0;
  color: #3b7a70;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.waste-chat__quick-btn:hover {
  background: #cce8df;
  border-color: #3b7a70;
}

.waste-chat__quick-btn:active {
  transform: scale(0.95);
}

/* ─── Photo Preview ─── */
.waste-card__photos {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.waste-card__photo-thumb {
  position: relative;
  width: 56px;
  height: 56px;
  border-radius: 8px;
  overflow: hidden;
}

.waste-card__photo-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.waste-card__photo-remove {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  border: none;
  font-size: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ─── Input Area ─── */
.waste-card__input-area {
  display: flex;
  gap: 8px;
  align-items: center;
}

.waste-card__photo-btn {
  flex: 0 0 auto;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  border: 1.5px solid #ddd;
  background: #fafafa;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.2s;
}

.waste-card__photo-btn:hover {
  border-color: #3b7a70;
}

.waste-card__text-input {
  flex: 1;
  padding: 10px 12px;
  border: 1.5px solid #ddd;
  border-radius: 10px;
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s;
}

.waste-card__text-input:focus {
  border-color: #3b7a70;
}

.waste-card__submit-btn {
  flex: 0 0 auto;
  padding: 10px 14px;
  border-radius: 10px;
  border: none;
  background: #3b7a70;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: opacity 0.15s;
}

.waste-card__submit-btn:active {
  opacity: 0.85;
}

.waste-card__submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* ─── Results Section ─── */
.waste-results {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.waste-results__title {
  font-size: 15px;
  font-weight: 700;
  margin: 0;
  color: #2d2d2d;
}

/* ─── Result Card ─── */
.waste-result-card {
  background: #fff;
  border-radius: 14px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  gap: 12px;
  border: 1px solid #e8f5f0;
}

.waste-result-card__header {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.waste-result-card__item-name {
  font-size: 15px;
  font-weight: 700;
  color: #2d2d2d;
}

.waste-result-card__tag {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 700;
  border: 1.5px solid;
  white-space: nowrap;
}

.waste-result-card__advice {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.waste-result-card__advice-title {
  font-size: 13px;
  font-weight: 600;
  margin: 0;
  color: #555;
}

.waste-result-card__steps {
  margin: 0;
  padding-left: 20px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.waste-result-card__steps li {
  font-size: 13px;
  color: #444;
  line-height: 1.5;
}

/* ─── SR Only ─── */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
</style>
