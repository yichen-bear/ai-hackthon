<script setup lang="ts">
/**
 * 興趣媒合（DB 版）
 * 篩選：未選=全列；選了=至少一個標籤匹配（OR）
 * 建立社群寫入 DB，團長可取消/發公告
 */
import type { MatchedGroup } from '~/types/entertainment'

const props = defineProps<{ userInterests: string[]; matchedGroups: MatchedGroup[] }>()
const emit = defineEmits<{ 'join-group': [payload: { groupId: string; matchScore: number }]; 'update-interests': [interests: string[]] }>()

const AVAILABLE_INTERESTS = ['攝影', '登山', '桌遊', '手作', '咖啡', '閱讀', '音樂', '運動', '料理', '旅行', '電影', '舞蹈']
const currentUserId = '00000000-0000-0000-0000-000000000001'
const currentUserName = '淇淇愛登山' // 社群暱稱

// ─── 篩選標籤（改為篩選制度：未選全列、選了 OR） ───
const localInterests = ref<string[]>([...props.userInterests])
watch(() => props.userInterests, (v) => { localInterests.value = [...v] })

function toggleInterest(interest: string) {
  const idx = localInterests.value.indexOf(interest)
  if (idx >= 0) localInterests.value.splice(idx, 1)
  else localInterests.value.push(interest)
  emit('update-interests', [...localInterests.value])
  fetchGroups()
}
function isSelected(interest: string) { return localInterests.value.includes(interest) }
function isMatchedTag(tag: string) { return localInterests.value.includes(tag) }

// ─── 從 DB 取得社群 ───
const dbGroups = ref<any[]>([])
const joinedGroups = ref<Set<string>>(new Set())

async function fetchGroups() {
  try {
    const data: any[] = await $fetch('/api/groups/discover', { params: { userId: currentUserId, tags: localInterests.value.join(',') } })
    dbGroups.value = data
    data.forEach(g => { if (g.isJoined) joinedGroups.value.add(g.id) })
  } catch { /* use props fallback */ }
}
onMounted(() => { fetchGroups() })

// 篩選邏輯：未選全列、選了至少一個匹配
const sortedGroups = computed(() => {
  let list = dbGroups.value
  if (localInterests.value.length > 0) {
    list = list.filter(g => g.tags && g.tags.some((t: string) => localInterests.value.includes(t)))
  }
  return [...list].sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))
})

// ─── 加入 ───
async function joinGroup(group: any) {
  if (group.isJoined) return
  try {
    await $fetch('/api/groups/join', { method: 'POST', body: { groupId: group.id, userId: currentUserId, userName: currentUserName } })
    joinedGroups.value.add(group.id)
    group.isJoined = true
    if (group.memberCount != null) group.memberCount++
    emit('join-group', { groupId: group.id, matchScore: group.matchScore || 50 })
  } catch { joinedGroups.value.add(group.id); group.isJoined = true }
}

// 導向會員中心社群
function goToMemberGroups() {
  navigateTo('/member?tab=groups')
}

// ─── 聊天（興趣模組不開聊天室，僅保留給會員中心） ───
const showGroupChat = ref(false)
const activeGroup = ref<any | null>(null)
const chatMessages = ref<{ author: string; content: string; time: string; isPinned?: boolean }[]>([])
const newMessage = ref('')

async function openGroupChat(group: any) {
  activeGroup.value = group
  showGroupChat.value = true
  try {
    const msgs: any[] = await $fetch(`/api/groups/${group.id}/messages`)
    chatMessages.value = msgs.filter(m => !m.content.startsWith('【')).map(m => ({
      author: m.senderId === currentUserId ? '我' : m.senderName,
      content: m.content,
      time: new Date(m.creTime).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }),
      isPinned: m.senderName === '📌 團長公告',
    }))
  } catch { chatMessages.value = [] }
}
function closeGroupChat() { showGroupChat.value = false; activeGroup.value = null }

async function sendMessage() {
  if (!newMessage.value.trim() || !activeGroup.value) return
  const content = newMessage.value.trim(); newMessage.value = ''
  chatMessages.value.push({ author: '我', content, time: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }) })
  try { await $fetch(`/api/groups/${activeGroup.value.id}/messages`, { method: 'POST', body: { senderId: currentUserId, senderName: currentUserName, content } }) } catch {}
}

// ─── 團長功能 ───
function isCreator(group: any) { return group?.creatorId === currentUserId }

async function sendAnnouncement() {
  if (!activeGroup.value) return
  const msg = prompt('輸入團長公告：')
  if (!msg) return
  chatMessages.value.push({ author: '📌 團長公告', content: msg, time: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }), isPinned: true })
  try { await $fetch(`/api/groups/${activeGroup.value.id}/messages`, { method: 'POST', body: { senderId: currentUserId, senderName: '📌 團長公告', content: msg } }) } catch {}
}

async function disbandGroup() {
  if (!activeGroup.value || !confirm(`確定解散「${activeGroup.value.name}」？`)) return
  try { await $fetch('/api/groups/leave', { method: 'POST', body: { groupId: activeGroup.value.id, userId: currentUserId, userName: currentUserName } }) } catch {}
  dbGroups.value = dbGroups.value.filter(g => g.id !== activeGroup.value!.id)
  closeGroupChat()
}

// ─── 創建社群 ───
const showCreate = ref(false)
const newGroupName = ref('')
const newGroupDate = ref('')
const newGroupLocation = ref('')
const newGroupTags = ref<string[]>([])
const isCreating = ref(false)

function openCreate() { showCreate.value = true }
function closeCreate() { showCreate.value = false; newGroupName.value = ''; newGroupDate.value = ''; newGroupLocation.value = ''; newGroupTags.value = [] }
function toggleCreateTag(tag: string) { const i = newGroupTags.value.indexOf(tag); if (i >= 0) newGroupTags.value.splice(i, 1); else newGroupTags.value.push(tag) }

async function createGroup() {
  if (!newGroupName.value.trim()) return
  isCreating.value = true
  try {
    await $fetch('/api/groups', { method: 'POST', body: { name: newGroupName.value.trim(), type: 'interest', icon: '💡', tags: newGroupTags.value, activityDate: newGroupDate.value || null, activityLocation: newGroupLocation.value || null, creatorId: currentUserId, creatorName: currentUserName } })
    closeCreate(); fetchGroups()
  } catch {}
  isCreating.value = false
}
</script>

<template>
  <section class="interest-match" aria-labelledby="interest-match-title">
    <div class="card-header">
      <h2 id="interest-match-title" class="card-title">興趣媒合</h2>
      <button class="btn-create-group" @click="openCreate">+ 建立社群</button>
    </div>

    <!-- 興趣標籤 -->
    <div class="interest-tags" role="group" aria-label="選擇你的興趣">
      <button
        v-for="interest in AVAILABLE_INTERESTS" :key="interest"
        class="interest-pill" :class="{ selected: isSelected(interest) }"
        :aria-pressed="isSelected(interest)"
        @click="toggleInterest(interest)"
      >{{ interest }}</button>
    </div>

    <!-- 推薦列表 -->
    <div v-if="localInterests.length > 0 && sortedGroups.length > 0" class="match-list">
      <article v-for="group in sortedGroups" :key="group.id" class="match-card">
        <div class="match-header">
          <h3 class="match-name">{{ group.name }}</h3>
          <span class="match-score">🎯 {{ group.matchScore }}%</span>
        </div>
        <p class="match-meta">{{ group.activityDate || group.date }} {{ group.activityTime || group.time }} · {{ group.activityLocation || group.location }}</p>
        <p class="match-participants">👥 {{ group.memberCount || group.participants }} 人加入</p>
        <div class="match-footer">
          <div class="match-tags">
            <span v-for="tag in group.tags" :key="tag" class="tag-pill" :class="{ highlighted: isMatchedTag(tag) }">{{ tag }}</span>
          </div>
          <!-- 已加入 → 前往會員中心 -->
          <button v-if="joinedGroups.has(group.id) || group.isJoined" class="btn-enter" @click="goToMemberGroups">
            ✅ 已加入 → 前往社群
          </button>
          <!-- 未加入 -->
          <button v-else class="btn-join" @click="joinGroup(group)">加入</button>
        </div>
      </article>
    </div>

    <!-- 引導 -->
    <div v-else-if="localInterests.length === 0" class="empty-state">
      <p>選擇你的興趣標籤，我們幫你找到同好！</p>
    </div>
    <div v-else class="empty-state">
      <p>暫無匹配社群，試試增加更多興趣標籤</p>
    </div>

    <!-- 群組互動 Overlay -->
    <Teleport to="body">
      <div v-if="showGroupChat" class="chat-overlay">
        <div class="chat-panel">
          <!-- Header -->
          <div class="chat-header">
            <button class="chat-back" @click="closeGroupChat">←</button>
            <div class="chat-title-area">
              <h3 class="chat-group-name">{{ activeGroup?.name }}</h3>
              <span class="chat-member-count">{{ activeGroup?.memberCount || activeGroup?.participants }} 位成員</span>
            </div>
          </div>

          <!-- 訊息列表 -->
          <div class="chat-messages">
            <div
              v-for="(msg, idx) in chatMessages" :key="idx"
              class="chat-msg" :class="{ pinned: msg.isPinned, mine: msg.author === '我' }"
            >
              <div v-if="msg.isPinned" class="pinned-badge">📌 置頂公告</div>
              <div class="msg-header" v-if="!msg.isPinned">
                <span class="msg-author">{{ msg.author }}</span>
                <span class="msg-time">{{ msg.time }}</span>
              </div>
              <p class="msg-content">{{ msg.content }}</p>
            </div>
          </div>

          <!-- 輸入框 -->
          <div class="chat-input-area">
            <input
              v-model="newMessage"
              class="chat-input"
              placeholder="輸入訊息..."
              @keydown.enter="sendMessage"
            />
            <button class="chat-send" :disabled="!newMessage.trim()" @click="sendMessage">送出</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 創建社群 Overlay -->
    <Teleport to="body">
      <div v-if="showCreate" class="overlay-backdrop" @click.self="closeCreate">
        <div class="overlay-panel" role="dialog" aria-modal="true">
          <h3 class="overlay-title">建立新社群</h3>
          <label class="form-label">社群名稱</label>
          <input v-model="newGroupName" class="form-input" placeholder="例：週末攝影散步團" />
          <label class="form-label">活動日期</label>
          <input v-model="newGroupDate" class="form-input" type="date" />
          <label class="form-label">集合地點</label>
          <input v-model="newGroupLocation" class="form-input" placeholder="例：大稻埕迪化街" />
          <label class="form-label">相關興趣</label>
          <div class="create-tags">
            <button
              v-for="tag in AVAILABLE_INTERESTS" :key="tag"
              class="create-tag-btn" :class="{ active: newGroupTags.includes(tag) }"
              @click="toggleCreateTag(tag)"
            >{{ tag }}</button>
          </div>
          <button class="btn-primary btn-confirm" :disabled="!newGroupName.trim()" @click="createGroup">建立社群</button>
          <button class="btn-cancel" @click="closeCreate">取消</button>
        </div>
      </div>
    </Teleport>
  </section>
</template>

<style scoped>
.interest-match { background: var(--color-bg-card, #ffffff); border-radius: var(--radius-lg, 12px); box-shadow: var(--shadow-card, 0 2px 8px rgba(0,0,0,0.08)); padding: var(--space-4, 16px); }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-3, 12px); }
.card-title { font-size: var(--text-lg, 17px); font-weight: 700; color: var(--color-text-primary, #1e293b); margin: 0; }

.btn-create-group { padding: 6px 14px; min-height: 36px; border: 1.5px solid var(--color-primary, #ec4899); border-radius: var(--radius-full, 9999px); background: transparent; color: var(--color-primary, #ec4899); font-size: var(--text-xs, 11px); font-weight: 600; cursor: pointer; transition: all 0.15s ease; }
.btn-create-group:hover { background: var(--color-primary-light, #fdf2f8); }

.interest-tags { display: flex; flex-wrap: wrap; gap: var(--space-2, 8px); margin-bottom: var(--space-4, 16px); }
.interest-pill { padding: 6px 14px; min-height: 36px; border: 1.5px solid var(--color-border, #e2e8f0); border-radius: var(--radius-full, 9999px); background: transparent; font-size: var(--text-sm, 13px); font-weight: 500; color: var(--color-text-secondary, #64748b); cursor: pointer; transition: all 0.15s ease; }
.interest-pill.selected { background: var(--color-primary, #ec4899); border-color: var(--color-primary, #ec4899); color: #ffffff; font-weight: 600; }
.interest-pill:hover:not(.selected) { border-color: var(--color-primary, #ec4899); color: var(--color-primary, #ec4899); }
.interest-pill:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }

.match-list { display: flex; flex-direction: column; gap: var(--space-3, 12px); }
.match-card { padding: var(--space-3, 12px); border: 1px solid var(--color-border, #e2e8f0); border-radius: var(--radius-md, 8px); }
.match-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.match-name { font-size: var(--text-base, 15px); font-weight: 600; color: var(--color-text-primary, #1e293b); margin: 0; }
.match-score { font-size: var(--text-xs, 11px); font-weight: 600; color: var(--color-primary, #ec4899); background: var(--color-primary-light, #fdf2f8); padding: 2px 8px; border-radius: var(--radius-full, 9999px); }
.match-meta { font-size: var(--text-sm, 13px); color: var(--color-text-secondary, #64748b); margin: 0 0 2px; }
.match-participants { font-size: var(--text-xs, 11px); color: var(--color-text-disabled, #94a3b8); margin: 0 0 8px; }
.match-footer { display: flex; justify-content: space-between; align-items: center; }
.match-tags { display: flex; gap: 4px; flex-wrap: wrap; }
.tag-pill { font-size: var(--text-xs, 11px); padding: 2px 8px; border-radius: var(--radius-full, 9999px); background: #f1f5f9; color: var(--color-text-secondary, #64748b); }
.tag-pill.highlighted { background: var(--color-primary-light, #fdf2f8); color: var(--color-primary, #ec4899); font-weight: 600; }

.btn-join { padding: var(--space-2, 8px) var(--space-4, 16px); min-height: 36px; border: none; border-radius: var(--radius-full, 9999px); background: var(--color-primary, #ec4899); color: #ffffff; font-size: var(--text-sm, 13px); font-weight: 600; cursor: pointer; flex-shrink: 0; transition: opacity 0.15s ease; }
.btn-join:hover { opacity: 0.85; }
.btn-enter { padding: var(--space-2, 8px) var(--space-3, 12px); min-height: 36px; border: 2px solid var(--color-secondary, #8b5cf6); border-radius: var(--radius-full, 9999px); background: var(--color-secondary-light, #f5f3ff); color: var(--color-secondary, #8b5cf6); font-size: var(--text-xs, 11px); font-weight: 600; cursor: pointer; flex-shrink: 0; transition: opacity 0.15s ease; }
.btn-enter:hover { opacity: 0.85; }

.empty-state { text-align: center; padding: var(--space-4, 16px) 0; }
.empty-state p { font-size: var(--text-sm, 13px); color: var(--color-text-secondary, #64748b); margin: 0; }

/* 群組聊天 */
.chat-overlay { position: fixed; inset: 0; z-index: 1100; background: #ffffff; display: flex; flex-direction: column; }
.chat-panel { display: flex; flex-direction: column; height: 100%; max-width: 430px; margin: 0 auto; width: 100%; }
.chat-header { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-bottom: 1px solid var(--color-border, #e2e8f0); background: var(--color-primary-light, #fdf2f8); }
.chat-back { border: none; background: transparent; font-size: 20px; cursor: pointer; padding: 8px; min-width: 44px; min-height: 44px; display: flex; align-items: center; justify-content: center; }
.chat-title-area { flex: 1; }
.chat-group-name { font-size: var(--text-base, 15px); font-weight: 700; margin: 0; color: var(--color-text-primary, #1e293b); }
.chat-member-count { font-size: var(--text-xs, 11px); color: var(--color-text-secondary, #64748b); }

.chat-messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.chat-msg { max-width: 85%; }
.chat-msg.mine { align-self: flex-end; }
.chat-msg.pinned { align-self: stretch; max-width: 100%; background: var(--color-secondary-light, #f5f3ff); border: 1px solid var(--color-secondary, #8b5cf6); border-radius: var(--radius-md, 8px); padding: 10px 12px; }
.pinned-badge { font-size: var(--text-xs, 11px); font-weight: 700; color: var(--color-secondary, #8b5cf6); margin-bottom: 4px; }
.msg-header { display: flex; align-items: center; gap: 8px; margin-bottom: 2px; }
.msg-author { font-size: var(--text-xs, 11px); font-weight: 600; color: var(--color-text-primary, #1e293b); }
.msg-time { font-size: var(--text-xs, 11px); color: var(--color-text-disabled, #94a3b8); }
.msg-content { font-size: var(--text-sm, 13px); color: var(--color-text-primary, #1e293b); margin: 0; padding: 8px 12px; background: #f1f5f9; border-radius: var(--radius-md, 8px) var(--radius-md, 8px) var(--radius-md, 8px) 4px; line-height: 1.5; white-space: pre-line; }
.chat-msg.mine .msg-content { background: var(--color-primary-light, #fdf2f8); border-radius: var(--radius-md, 8px) var(--radius-md, 8px) 4px var(--radius-md, 8px); }
.chat-msg.pinned .msg-content { background: transparent; padding: 0; }

.chat-input-area { display: flex; gap: 8px; padding: 12px 16px; border-top: 1px solid var(--color-border, #e2e8f0); }
.chat-input { flex: 1; padding: 10px 14px; min-height: 44px; border: 1px solid var(--color-border, #e2e8f0); border-radius: var(--radius-full, 9999px); font-size: var(--text-sm, 13px); outline: none; }
.chat-input:focus { border-color: var(--color-primary, #ec4899); }
.chat-send { padding: 0 16px; min-height: 44px; border: none; border-radius: var(--radius-full, 9999px); background: var(--color-primary, #ec4899); color: #fff; font-size: var(--text-sm, 13px); font-weight: 600; cursor: pointer; }
.chat-send:disabled { opacity: 0.4; cursor: not-allowed; }

/* 團長功能 */
.chat-leader-actions { display: flex; gap: 6px; padding: 6px 16px; border-bottom: 1px solid var(--color-border, #e2e8f0); }
.chat-leader-btn { padding: 4px 10px; font-size: 11px; font-weight: 600; border: 1px solid var(--color-primary, #ec4899); border-radius: 8px; background: transparent; color: var(--color-primary, #ec4899); cursor: pointer; }
.chat-leader-btn--danger { border-color: #e11d48; color: #e11d48; }

/* 創建社群 Overlay */
.overlay-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: flex-end; justify-content: center; z-index: 1000; }
.overlay-panel { background: #ffffff; border-radius: var(--radius-lg, 12px) var(--radius-lg, 12px) 0 0; padding: var(--space-5, 20px); width: 100%; max-width: 430px; max-height: 85vh; overflow-y: auto; animation: slide-up 0.3s ease; }
@keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
.overlay-title { font-size: var(--text-lg, 17px); font-weight: 700; margin: 0 0 16px; }
.form-label { display: block; font-size: var(--text-sm, 13px); font-weight: 600; margin-bottom: 6px; color: var(--color-text-primary, #1e293b); }
.form-input { width: 100%; padding: 10px 14px; min-height: 44px; border: 1px solid var(--color-border, #e2e8f0); border-radius: var(--radius-md, 8px); font-size: var(--text-sm, 13px); margin-bottom: 12px; outline: none; box-sizing: border-box; }
.form-input:focus { border-color: var(--color-primary, #ec4899); }
.create-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 16px; }
.create-tag-btn { padding: 4px 10px; border: 1px solid var(--color-border, #e2e8f0); border-radius: var(--radius-full, 9999px); background: transparent; font-size: var(--text-xs, 11px); color: var(--color-text-secondary, #64748b); cursor: pointer; }
.create-tag-btn.active { background: var(--color-primary, #ec4899); border-color: var(--color-primary, #ec4899); color: #fff; }
.btn-primary { width: 100%; padding: var(--space-3, 12px); min-height: 44px; border: none; border-radius: var(--radius-md, 8px); background: var(--color-primary, #ec4899); color: #ffffff; font-size: var(--text-sm, 13px); font-weight: 600; cursor: pointer; }
.btn-primary:hover { opacity: 0.85; }
.btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-confirm { margin-bottom: 8px; }
.btn-cancel { width: 100%; padding: var(--space-3, 12px); min-height: 44px; border: 1px solid var(--color-border, #e2e8f0); border-radius: var(--radius-md, 8px); background: transparent; color: var(--color-text-secondary, #64748b); font-size: var(--text-sm, 13px); cursor: pointer; }
</style>
