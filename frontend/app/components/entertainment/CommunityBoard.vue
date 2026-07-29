<script setup lang="ts">
/**
 * 社群留言板
 * 討論/揪團/心得分享
 */
import type { BoardPost, TeamInfo, PostType } from '~/types/entertainment'

const props = defineProps<{
  posts: BoardPost[]
}>()

const emit = defineEmits<{
  'post-created': [payload: { content: string; tags: string[]; teamInfo?: TeamInfo }]
  'join-team': [postId: string]
  'like-post': [postId: string]
}>()

// Tab 篩選
const tabs = [
  { key: 'all', label: '熱門🔥' },
  { key: 'team-up', label: '揪團🙋' },
  { key: 'review', label: '心得📝' },
] as const

type TabKey = typeof tabs[number]['key']
const activeTab = ref<TabKey>('all')

const filteredPosts = computed(() => {
  if (activeTab.value === 'all') return props.posts
  return props.posts.filter(p => p.type === activeTab.value)
})

// 發文
const newContent = ref('')
const newTag = ref<PostType>('discussion')

const canPost = computed(() => newContent.value.trim().length > 0)

function createPost() {
  if (!canPost.value) return
  emit('post-created', {
    content: newContent.value.trim(),
    tags: [newTag.value],
    teamInfo: undefined,
  })
  newContent.value = ''
}

// 相對時間
function relativeTime(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return '剛剛'
  if (diffMin < 60) return `${diffMin} 分鐘前`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr} 小時前`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 30) return `${diffDay} 天前`
  return dateStr.split('T')[0] ?? dateStr
}

function getTagClass(type: PostType) {
  switch (type) {
    case 'team-up': return 'tag-team'
    case 'review': return 'tag-review'
    default: return 'tag-discussion'
  }
}

function getTagLabel(type: PostType) {
  switch (type) {
    case 'team-up': return '揪團'
    case 'review': return '心得'
    default: return '討論'
  }
}

function teamProgress(info: TeamInfo) {
  return Math.min((info.current / info.target) * 100, 100)
}
</script>

<template>
  <section class="community-board" aria-labelledby="community-board-title">
    <div class="card-header">
      <h2 id="community-board-title" class="card-title">社群討論</h2>
      <span class="card-badge">💬 聊聊</span>
    </div>

    <!-- 分類 Tab -->
    <nav class="tab-nav" aria-label="貼文分類">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="tab-btn"
        :class="{ active: activeTab === tab.key }"
        :aria-current="activeTab === tab.key ? 'true' : undefined"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
      </button>
    </nav>

    <!-- 發文區 -->
    <div class="compose-area">
      <textarea
        v-model="newContent"
        class="compose-input"
        placeholder="分享活動心得或發起揪團..."
        rows="2"
        maxlength="500"
      ></textarea>
      <div class="compose-footer">
        <div class="compose-tags">
          <button
            class="compose-tag-btn"
            :class="{ active: newTag === 'team-up' }"
            @click="newTag = 'team-up'"
          >揪團</button>
          <button
            class="compose-tag-btn"
            :class="{ active: newTag === 'review' }"
            @click="newTag = 'review'"
          >心得</button>
          <button
            class="compose-tag-btn"
            :class="{ active: newTag === 'discussion' }"
            @click="newTag = 'discussion'"
          >討論</button>
        </div>
        <button
          class="btn-post"
          :disabled="!canPost"
          aria-label="發佈貼文"
          @click="createPost"
        >
          發佈
        </button>
      </div>
    </div>

    <!-- 貼文列表 -->
    <div class="post-list" aria-live="polite">
      <article
        v-for="post in filteredPosts"
        :key="post.id"
        class="post-card"
      >
        <!-- 作者資訊 -->
        <div class="post-header">
          <div class="author-avatar" :style="{ background: post.avatar }"></div>
          <div class="author-info">
            <span class="author-name">{{ post.author }}</span>
            <span class="post-time">{{ relativeTime(post.createdAt) }}</span>
          </div>
          <span class="post-type-tag" :class="getTagClass(post.type)">
            {{ getTagLabel(post.type) }}
          </span>
        </div>

        <!-- 貼文內容 -->
        <p class="post-content">{{ post.content }}</p>

        <!-- 揪團資訊 -->
        <div v-if="post.type === 'team-up' && post.teamInfo" class="team-info" aria-live="polite">
          <p class="team-event">{{ post.teamInfo.eventName }} · {{ post.teamInfo.date }}</p>
          <div class="team-progress">
            <div class="progress-bar">
              <div
                class="progress-fill"
                :style="{ width: `${teamProgress(post.teamInfo)}%` }"
              ></div>
            </div>
            <span class="progress-text">{{ post.teamInfo.current }}/{{ post.teamInfo.target }} 人</span>
          </div>
          <button
            v-if="post.teamInfo.current < post.teamInfo.target"
            class="btn-join-team"
            @click="emit('join-team', post.id)"
            :aria-label="`參加 ${post.teamInfo.eventName} 揪團`"
          >
            +1 參加
          </button>
          <span v-else class="team-full">已成團 ✓</span>
        </div>

        <!-- 互動列 -->
        <div class="post-actions">
          <button class="action-btn" @click="emit('like-post', post.id)">
            ❤️ {{ post.likes }}
          </button>
          <span class="action-btn">💬 {{ post.comments }}</span>
          <button class="action-btn">🔗 分享</button>
        </div>
      </article>

      <!-- 空狀態 -->
      <div v-if="filteredPosts.length === 0" class="empty-state">
        <p>還沒有人發文，成為第一個分享的人吧！</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.community-board {
  background: var(--color-bg-card, #ffffff);
  border-radius: var(--radius-lg, 12px);
  box-shadow: var(--shadow-card, 0 2px 8px rgba(0,0,0,0.08));
  padding: var(--space-4, 16px);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-3, 12px);
}

.card-title {
  font-size: var(--text-lg, 17px);
  font-weight: 700;
  color: var(--color-text-primary, #1e293b);
  margin: 0;
}

.card-badge {
  font-size: var(--text-xs, 11px);
  color: var(--color-text-secondary, #64748b);
  background: var(--color-primary-light, #fdf2f8);
  padding: 2px 8px;
  border-radius: var(--radius-full, 9999px);
}

/* Tab */
.tab-nav {
  display: flex;
  gap: var(--space-2, 8px);
  margin-bottom: var(--space-3, 12px);
}

.tab-btn {
  flex: 1;
  padding: var(--space-2, 8px);
  min-height: 44px;
  border: none;
  border-radius: var(--radius-full, 9999px);
  background: transparent;
  font-size: var(--text-sm, 13px);
  font-weight: 500;
  color: var(--color-text-disabled, #cbd5e1);
  cursor: pointer;
  transition: all 0.15s ease;
}
.tab-btn.active {
  color: #ffffff;
  background-color: var(--color-primary, #ec4899);
  font-weight: 600;
}
.tab-btn:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }

/* 發文區 */
.compose-area {
  margin-bottom: var(--space-4, 16px);
  padding: var(--space-3, 12px);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: var(--radius-md, 8px);
}

.compose-input {
  width: 100%;
  border: none;
  outline: none;
  resize: none;
  font-size: var(--text-sm, 13px);
  color: var(--color-text-primary, #1e293b);
  font-family: inherit;
  line-height: 1.5;
}
.compose-input::placeholder { color: var(--color-text-disabled, #94a3b8); }

.compose-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: var(--space-2, 8px);
}

.compose-tags {
  display: flex;
  gap: 4px;
}

.compose-tag-btn {
  padding: 4px 10px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: var(--radius-full, 9999px);
  background: transparent;
  font-size: var(--text-xs, 11px);
  color: var(--color-text-secondary, #64748b);
  cursor: pointer;
  transition: all 0.15s ease;
}
.compose-tag-btn.active {
  background: var(--color-primary, #ec4899);
  border-color: var(--color-primary, #ec4899);
  color: #ffffff;
}

.btn-post {
  padding: var(--space-2, 8px) var(--space-4, 16px);
  min-height: 36px;
  border: none;
  border-radius: var(--radius-full, 9999px);
  background: var(--color-primary, #ec4899);
  color: #ffffff;
  font-size: var(--text-sm, 13px);
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s ease;
}
.btn-post:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-post:hover:not(:disabled) { opacity: 0.85; }
.btn-post:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }

/* 貼文列表 */
.post-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3, 12px);
}

.post-card {
  padding: var(--space-3, 12px);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: var(--radius-md, 8px);
}

/* 作者 */
.post-header {
  display: flex;
  align-items: center;
  gap: var(--space-2, 8px);
  margin-bottom: var(--space-2, 8px);
}

.author-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  flex-shrink: 0;
}

.author-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.author-name {
  font-size: var(--text-sm, 13px);
  font-weight: 600;
  color: var(--color-text-primary, #1e293b);
}

.post-time {
  font-size: var(--text-xs, 11px);
  color: var(--color-text-disabled, #94a3b8);
}

.post-type-tag {
  font-size: var(--text-xs, 11px);
  font-weight: 600;
  padding: 2px 8px;
  border-radius: var(--radius-full, 9999px);
  flex-shrink: 0;
}
.tag-team { background: var(--color-secondary-light, #f5f3ff); color: var(--color-secondary, #8b5cf6); }
.tag-review { background: var(--color-primary-light, #fdf2f8); color: var(--color-primary, #ec4899); }
.tag-discussion { background: #f1f5f9; color: var(--color-text-secondary, #64748b); }

/* 內容 */
.post-content {
  font-size: var(--text-sm, 13px);
  color: var(--color-text-primary, #1e293b);
  line-height: 1.6;
  margin: 0 0 var(--space-2, 8px);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 揪團 */
.team-info {
  padding: var(--space-2, 8px) var(--space-3, 12px);
  background: var(--color-secondary-light, #f5f3ff);
  border-radius: var(--radius-md, 8px);
  margin-bottom: var(--space-2, 8px);
}

.team-event {
  font-size: var(--text-sm, 13px);
  font-weight: 600;
  color: var(--color-secondary, #8b5cf6);
  margin: 0 0 6px;
}

.team-progress {
  display: flex;
  align-items: center;
  gap: var(--space-2, 8px);
  margin-bottom: 8px;
}

.progress-bar {
  flex: 1;
  height: 6px;
  background: rgba(139, 92, 246, 0.15);
  border-radius: var(--radius-full, 9999px);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--color-secondary, #8b5cf6);
  border-radius: var(--radius-full, 9999px);
  transition: width 0.3s ease;
}

.progress-text {
  font-size: var(--text-xs, 11px);
  color: var(--color-secondary, #8b5cf6);
  font-weight: 600;
  flex-shrink: 0;
}

.btn-join-team {
  padding: 6px 14px;
  min-height: 32px;
  border: none;
  border-radius: var(--radius-full, 9999px);
  background: var(--color-secondary, #8b5cf6);
  color: #ffffff;
  font-size: var(--text-xs, 11px);
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s ease;
}
.btn-join-team:hover { opacity: 0.85; }
.btn-join-team:focus-visible { outline: 2px solid var(--color-secondary); outline-offset: 2px; }

.team-full {
  font-size: var(--text-xs, 11px);
  color: var(--color-text-disabled, #94a3b8);
  font-weight: 500;
}

/* 互動列 */
.post-actions {
  display: flex;
  gap: var(--space-4, 16px);
  padding-top: var(--space-2, 8px);
  border-top: 1px solid var(--color-border, #e2e8f0);
}

.action-btn {
  border: none;
  background: transparent;
  font-size: var(--text-xs, 11px);
  color: var(--color-text-secondary, #64748b);
  cursor: pointer;
  padding: 4px 0;
  transition: color 0.15s ease;
}
.action-btn:hover { color: var(--color-primary, #ec4899); }

/* 空狀態 */
.empty-state {
  text-align: center;
  padding: var(--space-4, 16px) 0;
}
.empty-state p {
  font-size: var(--text-sm, 13px);
  color: var(--color-text-secondary, #64748b);
  margin: 0;
}
</style>
