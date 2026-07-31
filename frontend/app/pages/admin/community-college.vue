<script setup lang="ts">
definePageMeta({ layout: 'admin' })
useHead({ htmlAttrs: { lang: 'zh-TW' } })

// ─── Types ───
type CoursePhase = 'enrolling' | 'started' | 'in_progress' | 'completed'
type StudentNeed = 'beginner' | 'material_purchase' | 'wheelchair' | 'hearing_aid' | 'other'
type AIWarningLevel = 'danger' | 'warn' | 'ok'

interface StudentNeedItem { type: StudentNeed; note?: string; resolved: boolean }

interface Student {
  id: string; name: string; phone: string; registeredAt: string
  needs: StudentNeedItem[]; attendanceRate: number; attended: number; total: number
}

interface ManagedCourse {
  id: string; name: string; instructor: string; schedule: string
  credits: number; sessions: number; fee: number; location: string
  minStudents: number; maxStudents: number; currentStudents: number
  waitlistCount: number; phase: CoursePhase; currentSession: number
  students: Student[]
  aiWarning?: { level: AIWarningLevel; message: string; matchedResidents: number }
}

// ─── 視角切換 ───
type ViewMode = 'overview' | 'instructor'
const viewMode = ref<ViewMode>('overview')
const selectedInstructor = ref('')

// ─── Tab ───
const activeTab = ref(0)
const tabs = computed(() => viewMode.value === 'overview'
  ? ['成班率總覽', '報名管理', 'AI 媒合']
  : ['學員名單', '出缺席', '特殊需求']
)

// ─── Toast ───
const toastMessage = ref('')
let toastTimer: ReturnType<typeof setTimeout> | null = null
function showToast(msg: string) {
  toastMessage.value = msg
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toastMessage.value = '' }, 2500)
}

// ─── 工具函數 ───
function getPhaseLabel(p: CoursePhase): string {
  return { enrolling: '招生中', started: '已開班', in_progress: '授課中', completed: '已結業' }[p]
}
function getNeedLabel(t: StudentNeed): string {
  return { beginner: '🔰 零基礎', material_purchase: '📦 需代購教材', wheelchair: '♿ 輪椅', hearing_aid: '👂 助聽需求', other: '📝 其他' }[t]
}
function getEnrollRate(c: ManagedCourse): number {
  return Math.round((c.currentStudents / c.minStudents) * 100)
}
function getEnrollRateClass(c: ManagedCourse): string {
  const rate = c.currentStudents / c.minStudents
  if (rate >= 1) return 'cc__rate--ok'
  if (rate >= 0.7) return 'cc__rate--warn'
  return 'cc__rate--danger'
}
function getCapacityPercent(c: ManagedCourse): number {
  return Math.min((c.currentStudents / c.maxStudents) * 100, 100)
}

// ─── Computed ───
const instructors = computed(() => [...new Set(courses.value.map(c => c.instructor))])
const filteredCourses = computed(() => {
  if (viewMode.value === 'overview') return courses.value
  return courses.value.filter(c => c.instructor === selectedInstructor.value)
})
const overallEnrollRate = computed(() => {
  const total = courses.value.length
  const reached = courses.value.filter(c => c.currentStudents >= c.minStudents).length
  return total > 0 ? Math.round((reached / total) * 100) : 0
})
const aiWarningCourses = computed(() => courses.value.filter(c => c.aiWarning && c.aiWarning.level !== 'ok'))

// ─── Mock 資料 ───
// ─── Mock 資料 ───
// 格式對齊 DB pms_form_feedback.feedback_content (formId=1009)
// 課程名稱對應 topicId 3050 選項 (id 4090~4094)
// 學員 name/phone 來自解密後的加密欄位
// 經驗程度對應 topicId 3052 選項 (id 4095~4097)
const courses = ref<ManagedCourse[]>([
  {
    id: 'cc-1', name: '銀髮族手機攝影班', instructor: '陳老師', schedule: '每週三 09:00-11:00',
    credits: 2, sessions: 12, fee: 2000, location: '社大 A201',
    minStudents: 15, maxStudents: 30, currentStudents: 24, waitlistCount: 2,
    phase: 'enrolling', currentSession: 0,
    students: [
      { id: 's-1', name: '劉奶奶', phone: '0912-***-002', registeredAt: '08/01', needs: [{ type: 'beginner', note: '從未用過手機拍照', resolved: true }], attendanceRate: 0, attended: 0, total: 12 },
      { id: 's-2', name: '許伯伯', phone: '0933-***-003', registeredAt: '08/02', needs: [{ type: 'hearing_aid', note: '需坐前排', resolved: false }], attendanceRate: 0, attended: 0, total: 12 },
      { id: 's-3', name: '蔡阿姨', phone: '0955-***-004', registeredAt: '08/03', needs: [{ type: 'material_purchase', note: '需代購手機腳架', resolved: false }], attendanceRate: 0, attended: 0, total: 12 },
    ],
    aiWarning: { level: 'ok', message: '✅ 已達開班門檻，報名順利', matchedResidents: 0 },
  },
  {
    id: 'cc-2', name: '社區園藝療癒課', instructor: '林老師', schedule: '每週六 14:00-16:00',
    credits: 1, sessions: 8, fee: 1500, location: '里民花園',
    minStudents: 10, maxStudents: 15, currentStudents: 7, waitlistCount: 0,
    phase: 'enrolling', currentSession: 0,
    students: [
      { id: 's-4', name: '蔡小姐', phone: '0955-***-005', registeredAt: '07/28', needs: [], attendanceRate: 0, attended: 0, total: 8 },
      { id: 's-5', name: '周媽媽', phone: '0966-***-006', registeredAt: '07/30', needs: [{ type: 'beginner', resolved: true }], attendanceRate: 0, attended: 0, total: 8 },
    ],
    aiWarning: { level: 'danger', message: '⚠️ 離開班還差 3 人！已自動推薦給 12 位興趣相符的居民', matchedResidents: 12 },
  },
  {
    id: 'cc-3', name: '太極拳入門', instructor: '王師傅', schedule: '每週一、四 07:00-08:00',
    credits: 2, sessions: 24, fee: 1800, location: '社區公園',
    minStudents: 12, maxStudents: 25, currentStudents: 25, waitlistCount: 6,
    phase: 'in_progress', currentSession: 8,
    students: [
      { id: 's-6', name: '周先生', phone: '0977-***-007', registeredAt: '06/20', needs: [], attendanceRate: 88, attended: 7, total: 8 },
      { id: 's-7', name: '趙太太', phone: '0988-***-008', registeredAt: '06/22', needs: [{ type: 'beginner', resolved: true }], attendanceRate: 100, attended: 8, total: 8 },
      { id: 's-8', name: '魏伯伯', phone: '0911-***-009', registeredAt: '06/25', needs: [{ type: 'wheelchair', note: '右膝舊傷需特別注意', resolved: true }], attendanceRate: 63, attended: 5, total: 8 },
    ],
    aiWarning: { level: 'ok', message: '✅ 已開班，授課進度正常（第 8/24 堂）', matchedResidents: 0 },
  },
  {
    id: 'cc-4', name: '手工皂 DIY 進階', instructor: '林老師', schedule: '每週日 10:00-12:00',
    credits: 1, sessions: 6, fee: 2500, location: '社大 B102',
    minStudents: 8, maxStudents: 12, currentStudents: 5, waitlistCount: 0,
    phase: 'enrolling', currentSession: 0,
    students: [
      { id: 's-9', name: '邱小姐', phone: '0922-***-010', registeredAt: '08/01', needs: [{ type: 'material_purchase', note: '需代購精油材料包', resolved: false }], attendanceRate: 0, attended: 0, total: 6 },
    ],
    aiWarning: { level: 'warn', message: '⚠️ 離開班還差 3 人，已推薦給 8 位有「手作」興趣的居民', matchedResidents: 8 },
  },
  {
    id: 'cc-5', name: '生活日語會話', instructor: '田中老師', schedule: '每週二 19:00-21:00',
    credits: 2, sessions: 16, fee: 3200, location: '社大 A301',
    minStudents: 10, maxStudents: 20, currentStudents: 18, waitlistCount: 0,
    phase: 'in_progress', currentSession: 5,
    students: [
      { id: 's-10', name: '楊先生', phone: '0933-***-011', registeredAt: '06/15', needs: [{ type: 'beginner', note: '完全零基礎', resolved: true }], attendanceRate: 100, attended: 5, total: 5 },
      { id: 's-11', name: '沈小姐', phone: '0955-***-012', registeredAt: '06/18', needs: [], attendanceRate: 80, attended: 4, total: 5 },
    ],
    aiWarning: { level: 'ok', message: '✅ 授課中（第 5/16 堂），出席率 90%', matchedResidents: 0 },
  },
])

// ─── Actions ───
function resolveNeed(student: Student, need: StudentNeedItem) {
  need.resolved = true
  showToast(`✅ 已處理：${student.name} — ${getNeedLabel(need.type)}`)
}
function triggerAIMatch(course: ManagedCourse) {
  const matched = Math.floor(Math.random() * 10) + 5
  course.aiWarning = { level: course.aiWarning?.level || 'warn', message: `🤖 已重新推薦給 ${matched} 位興趣相符的居民`, matchedResidents: matched }
  showToast(`🤖 AI 媒合已觸發：${course.name} → 推薦給 ${matched} 位居民`)
}
function resetDemo() { location.reload() }
</script>

<template>
  <div class="w-full max-w-[430px] mx-auto min-h-screen bg-[#fafaf9] relative flex flex-col pb-20 shadow-xl border-x border-[#e2e8f0]">
    <header class="cc__header">
      <span class="cc__header-title">📚 社大教務處管理</span>
      <NuxtLink class="cc__header-link" to="/entertainment">📱 用戶端</NuxtLink>
    </header>

    <!-- 視角切換 -->
    <div class="cc__view-switch">
      <button class="cc__view-btn" :class="{ 'cc__view-btn--active': viewMode === 'overview' }" @click="viewMode = 'overview'; activeTab = 0">🏫 教務處總覽</button>
      <button class="cc__view-btn" :class="{ 'cc__view-btn--active': viewMode === 'instructor' }" @click="viewMode = 'instructor'; activeTab = 0">👨‍🏫 老師維度</button>
    </div>

    <!-- 老師篩選（老師維度時顯示） -->
    <div v-if="viewMode === 'instructor'" class="cc__instructor-filter">
      <select v-model="selectedInstructor" class="cc__select" aria-label="選擇授課教師">
        <option value="">-- 選擇教師 --</option>
        <option v-for="t in instructors" :key="t" :value="t">{{ t }}</option>
      </select>
    </div>

    <main class="cc__content" role="main">

      <!-- Tab -->
      <nav class="cc__tabs" role="tablist">
        <button v-for="(tab, idx) in tabs" :key="tab" class="cc__tab" :class="{ 'cc__tab--active': activeTab === idx }" @click="activeTab = idx">{{ tab }}</button>
      </nav>

      <!-- ═══ 教務處總覽 ═══ -->
      <template v-if="viewMode === 'overview'">

        <!-- Tab 1：成班率總覽 -->
        <section v-show="activeTab === 0">
          <div class="cc__summary-card">
            <h4 class="cc__summary-title">📊 全校成班率</h4>
            <div class="cc__summary-big">{{ overallEnrollRate }}%</div>
            <p class="cc__summary-sub">{{ courses.filter(c => c.currentStudents >= c.minStudents).length }} / {{ courses.length }} 門課程已達開班門檻</p>
          </div>
          <div v-for="c in courses" :key="c.id" class="cc__card">
            <div class="cc__card-top">
              <h4 class="cc__card-title">{{ c.name }}</h4>
              <span class="cc__rate-badge" :class="getEnrollRateClass(c)">{{ getEnrollRate(c) }}%</span>
            </div>
            <p class="cc__card-meta">👨‍🏫 {{ c.instructor }} · {{ c.schedule }}</p>
            <div class="cc__enroll-bar">
              <div class="cc__enroll-fill" :class="getEnrollRateClass(c)" :style="{ width: `${getCapacityPercent(c)}%` }"></div>
            </div>
            <div class="cc__enroll-info">
              <span>👥 {{ c.currentStudents }}/{{ c.maxStudents }}（最低 {{ c.minStudents }}）</span>
              <span v-if="c.waitlistCount > 0" class="cc__waitlist">候補 {{ c.waitlistCount }}</span>
              <span class="cc__phase">{{ getPhaseLabel(c.phase) }}<span v-if="c.phase === 'in_progress'">（第 {{ c.currentSession }}/{{ c.sessions }} 堂）</span></span>
            </div>
            <!-- AI 預警 -->
            <div v-if="c.aiWarning" class="cc__ai-warning" :class="'cc__ai-warning--' + c.aiWarning.level">
              <span>{{ c.aiWarning.message }}</span>
              <button v-if="c.aiWarning.level !== 'ok'" class="cc__ai-btn" @click="triggerAIMatch(c)">🤖 重新媒合</button>
            </div>
          </div>
        </section>

        <!-- Tab 2：報名管理 -->
        <section v-show="activeTab === 1">
          <div v-for="c in courses.filter(co => co.phase === 'enrolling')" :key="c.id" class="cc__card">
            <h4 class="cc__card-title">{{ c.name }}</h4>
            <p class="cc__card-meta">👨‍🏫 {{ c.instructor }} · 💰 ${{ c.fee.toLocaleString() }}</p>
            <div v-for="s in c.students" :key="s.id" class="cc__student-row">
              <span class="cc__student-name">{{ s.name }}</span>
              <span class="cc__student-phone">{{ s.phone }}</span>
              <span class="cc__student-date">{{ s.registeredAt }}</span>
            </div>
          </div>
        </section>

        <!-- Tab 3：AI 媒合 -->
        <section v-show="activeTab === 2">
          <div v-if="aiWarningCourses.length === 0" class="cc__empty">
            <p>🎉 所有課程報名順利，無需 AI 媒合</p>
          </div>
          <div v-for="c in aiWarningCourses" :key="c.id" class="cc__card">
            <h4 class="cc__card-title">{{ c.name }}</h4>
            <p class="cc__card-meta">👨‍🏫 {{ c.instructor }} · 目前 {{ c.currentStudents }}/{{ c.minStudents }} 人（需 {{ c.minStudents }} 人開班）</p>
            <div class="cc__ai-warning" :class="'cc__ai-warning--' + c.aiWarning!.level">
              {{ c.aiWarning!.message }}
            </div>
            <button class="cc__btn cc__btn--primary" @click="triggerAIMatch(c)">🤖 觸發 AI 動態媒合推薦</button>
          </div>
        </section>
      </template>

      <!-- ═══ 老師維度 ═══ -->
      <template v-else>
        <div v-if="!selectedInstructor" class="cc__empty"><p>👨‍🏫 請選擇授課教師</p></div>

        <!-- Tab 1：學員名單 -->
        <section v-show="activeTab === 0">
          <div v-for="c in filteredCourses" :key="c.id" class="cc__card">
            <h4 class="cc__card-title">{{ c.name }}</h4>
            <p class="cc__card-meta">{{ c.schedule }} · {{ c.location }} · {{ getPhaseLabel(c.phase) }}</p>
            <div v-for="s in c.students" :key="s.id" class="cc__student-row">
              <span class="cc__student-name">{{ s.name }}</span>
              <span class="cc__student-phone">{{ s.phone }}</span>
              <span v-if="s.attendanceRate > 0" class="cc__student-att" :class="{ 'cc__student-att--low': s.attendanceRate < 70 }">出席 {{ s.attendanceRate }}%</span>
            </div>
          </div>
        </section>

        <!-- Tab 2：出缺席 -->
        <section v-show="activeTab === 1">
          <div v-for="c in filteredCourses" :key="c.id" class="cc__card">
            <h4 class="cc__card-title">{{ c.name }}（第 {{ c.currentSession }}/{{ c.sessions }} 堂）</h4>
            <div v-for="s in c.students" :key="s.id" class="cc__att-row">
              <span class="cc__student-name">{{ s.name }}</span>
              <div class="cc__att-bar"><div class="cc__att-fill" :style="{ width: s.attendanceRate + '%' }" :class="{ 'cc__att-fill--low': s.attendanceRate < 70 }"></div></div>
              <span class="cc__att-text">{{ s.attended }}/{{ s.total }}</span>
            </div>
          </div>
        </section>

        <!-- Tab 3：特殊需求 -->
        <section v-show="activeTab === 2">
          <div v-for="c in filteredCourses" :key="c.id" class="cc__card">
            <h4 class="cc__card-title">{{ c.name }}</h4>
            <div v-for="s in c.students.filter(st => st.needs.length > 0)" :key="s.id" class="cc__need-section">
              <span class="cc__student-name">{{ s.name }}</span>
              <div v-for="need in s.needs" :key="need.type" class="cc__need-item" :class="{ 'cc__need-item--done': need.resolved }">
                <span>{{ getNeedLabel(need.type) }}</span>
                <span v-if="need.note" class="cc__need-note">{{ need.note }}</span>
                <button v-if="!need.resolved" class="cc__need-btn" @click="resolveNeed(s, need)">✅ 已處理</button>
                <span v-else class="cc__need-ok">✓</span>
              </div>
            </div>
          </div>
        </section>
      </template>

    </main>
    <Transition name="toast-fade"><div v-if="toastMessage" class="cc__toast">{{ toastMessage }}</div></Transition>
    <div class="cc__demo-panel"><button class="cc__demo-btn" @click="resetDemo">🔄 重設</button></div>
  </div>
</template>

<style scoped>
.cc__header { position: sticky; top: 0; z-index: 100; display: flex; align-items: center; justify-content: space-between; height: 50px; padding: 0 16px; background: #fff; border-bottom: 1px solid #e2e8f0; }
.cc__header-title { font-size: 13px; font-weight: 600; color: #1c1917; }
.cc__header-link { padding: 4px 10px; font-size: 11px; font-weight: 700; color: #8b5cf6; background: #f5f3ff; border: 1px solid rgba(139,92,246,.2); border-radius: 9999px; text-decoration: none; }
.cc__view-switch { display: flex; gap: 0; padding: 12px 16px 0; }
.cc__view-btn { flex: 1; padding: 10px; border: 1.5px solid #e2e8f0; background: #fff; font-size: 13px; font-weight: 600; font-family: inherit; cursor: pointer; }
.cc__view-btn:first-child { border-radius: 10px 0 0 10px; }
.cc__view-btn:last-child { border-radius: 0 10px 10px 0; border-left: none; }
.cc__view-btn--active { background: #8b5cf6; color: #fff; border-color: #8b5cf6; }
.cc__instructor-filter { padding: 12px 16px 0; }
.cc__select { width: 100%; padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 13px; font-family: inherit; }
.cc__content { display: flex; flex-direction: column; gap: 16px; padding: 16px; flex: 1; }
.cc__tabs { display: flex; background: #fff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; }
.cc__tab { flex: 1; padding: 10px 4px; border: none; background: transparent; font-size: 11px; font-weight: 600; font-family: inherit; color: #78716c; cursor: pointer; text-align: center; }
.cc__tab:not(:last-child) { border-right: 1px solid #e2e8f0; }
.cc__tab--active { background: #8b5cf6; color: #fff; }
.cc__card { background: #fff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 16px; display: flex; flex-direction: column; gap: 10px; margin-bottom: 12px; }
.cc__card:last-child { margin-bottom: 0; }
.cc__card-top { display: flex; align-items: center; justify-content: space-between; }
.cc__card-title { margin: 0; font-size: 15px; font-weight: 700; color: #1c1917; }
.cc__card-meta { margin: 0; font-size: 12px; color: #78716c; }
.cc__summary-card { background: linear-gradient(135deg, #f5f3ff, #ede9fe); border: 1px solid #8b5cf6; border-radius: 16px; padding: 20px; text-align: center; margin-bottom: 12px; }
.cc__summary-title { margin: 0 0 8px; font-size: 14px; font-weight: 700; color: #1c1917; }
.cc__summary-big { font-size: 36px; font-weight: 800; color: #8b5cf6; }
.cc__summary-sub { margin: 8px 0 0; font-size: 12px; color: #78716c; }

.cc__rate-badge { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 9999px; }
.cc__rate--ok { background: #dcfce7; color: #16a34a; }
.cc__rate--warn { background: #fef3c7; color: #d97706; }
.cc__rate--danger { background: #ffe4e6; color: #e11d48; }
.cc__enroll-bar { height: 8px; background: #f1f5f9; border-radius: 9999px; overflow: hidden; }
.cc__enroll-fill { height: 100%; border-radius: 9999px; transition: width .3s; }
.cc__enroll-fill.cc__rate--ok { background: #16a34a; }
.cc__enroll-fill.cc__rate--warn { background: #d97706; }
.cc__enroll-fill.cc__rate--danger { background: #e11d48; }
.cc__enroll-info { display: flex; flex-wrap: wrap; gap: 8px; font-size: 11px; color: #78716c; }
.cc__waitlist { color: #d97706; font-weight: 600; }
.cc__phase { color: #8b5cf6; font-weight: 600; }
.cc__ai-warning { font-size: 12px; padding: 8px 12px; border-radius: 10px; display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.cc__ai-warning--ok { background: #dcfce7; color: #16a34a; }
.cc__ai-warning--warn { background: #fef3c7; color: #d97706; }
.cc__ai-warning--danger { background: #ffe4e6; color: #e11d48; animation: pulse-danger 1s infinite; }
@keyframes pulse-danger { 0%,100% { opacity: 1; } 50% { opacity: .7; } }
.cc__ai-btn { padding: 4px 10px; border: none; border-radius: 8px; background: #8b5cf6; color: #fff; font-size: 10px; font-weight: 600; cursor: pointer; }
.cc__btn { width: 100%; padding: 12px; border: none; border-radius: 12px; font-size: 14px; font-weight: 700; font-family: inherit; cursor: pointer; }
.cc__btn--primary { background: #8b5cf6; color: #fff; }
.cc__student-row { display: flex; align-items: center; gap: 8px; padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 12px; }
.cc__student-row:last-child { border-bottom: none; }
.cc__student-name { font-weight: 600; color: #1c1917; min-width: 56px; }
.cc__student-phone { color: #78716c; flex: 1; }
.cc__student-date { color: #78716c; font-size: 10px; }
.cc__student-att { font-weight: 600; color: #16a34a; }
.cc__student-att--low { color: #e11d48; }
.cc__att-row { display: flex; align-items: center; gap: 8px; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
.cc__att-row:last-child { border-bottom: none; }
.cc__att-bar { flex: 1; height: 6px; background: #f1f5f9; border-radius: 9999px; overflow: hidden; }
.cc__att-fill { height: 100%; background: #8b5cf6; border-radius: 9999px; }
.cc__att-fill--low { background: #e11d48; }
.cc__att-text { font-size: 11px; color: #78716c; min-width: 36px; }
.cc__need-section { padding: 8px 0; border-bottom: 1px solid #f1f5f9; display: flex; flex-direction: column; gap: 4px; }
.cc__need-item { display: flex; align-items: center; gap: 6px; font-size: 12px; padding: 6px 10px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; }
.cc__need-item--done { background: #dcfce7; border-color: #86efac; opacity: .7; }
.cc__need-note { color: #92400e; font-style: italic; }
.cc__need-btn { padding: 2px 8px; border: none; border-radius: 6px; background: #16a34a; color: #fff; font-size: 10px; font-weight: 600; cursor: pointer; }
.cc__need-ok { font-size: 10px; color: #16a34a; font-weight: 600; }
.cc__empty { text-align: center; padding: 32px 16px; color: #78716c; font-size: 14px; }
.cc__toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); z-index: 200; padding: 12px 20px; background: #1e293b; color: #fff; font-size: 13px; font-weight: 600; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,.15); }
.cc__demo-panel { position: fixed; bottom: 20px; right: 20px; z-index: 999; }
.cc__demo-btn { padding: 8px 14px; border: none; border-radius: 20px; font-size: 13px; font-weight: 600; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,.15); background: #78716c; color: #fff; }
.toast-fade-enter-active, .toast-fade-leave-active { transition: all .3s ease; }
.toast-fade-enter-from, .toast-fade-leave-to { opacity: 0; transform: translateX(-50%) translateY(16px); }
.toast-fade-enter-to, .toast-fade-leave-from { opacity: 1; transform: translateX(-50%) translateY(0); }
</style>
