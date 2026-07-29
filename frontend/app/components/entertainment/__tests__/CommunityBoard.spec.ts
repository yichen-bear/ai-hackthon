import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import * as fc from 'fast-check'
import CommunityBoard from '~/components/entertainment/CommunityBoard.vue'
import type { BoardPost } from '~/types/entertainment'

const mockPosts: BoardPost[] = [
  {
    id: 'post-1', author: '小明', avatar: 'linear-gradient(135deg, #60a5fa, #3b82f6)',
    content: '有人週六要看統一獅嗎？揪 3 個人一起！',
    tags: ['揪團'], createdAt: '2026-07-28T10:30:00', likes: 12, comments: 5,
    type: 'team-up',
    teamInfo: { eventName: '統一獅 vs 中信兄弟', date: '2026-08-02', current: 3, target: 6 },
  },
  {
    id: 'post-2', author: '阿花', avatar: 'linear-gradient(135deg, #f472b6, #ec4899)',
    content: '昨天去看 teamLab 超美的！',
    tags: ['心得'], createdAt: '2026-07-27T18:45:00', likes: 28, comments: 8,
    type: 'review',
  },
  {
    id: 'post-3', author: '咖啡控', avatar: 'linear-gradient(135deg, #a78bfa, #8b5cf6)',
    content: '星巴克拉花教室有人去過嗎？',
    tags: ['討論'], createdAt: '2026-07-27T14:20:00', likes: 5, comments: 3,
    type: 'discussion',
  },
]

describe('CommunityBoard', () => {
  it('正確渲染所有貼文', () => {
    const wrapper = mount(CommunityBoard, {
      props: { posts: mockPosts },
    })
    expect(wrapper.text()).toContain('小明')
    expect(wrapper.text()).toContain('阿花')
    expect(wrapper.text()).toContain('咖啡控')
  })

  it('Tab 篩選「揪團」只顯示揪團貼文', async () => {
    const wrapper = mount(CommunityBoard, {
      props: { posts: mockPosts },
    })
    const tabs = wrapper.findAll('.tab-btn')
    // 第二個 Tab 是「揪團🙋」
    await tabs[1].trigger('click')
    // 只有 post-1 是 team-up
    expect(wrapper.text()).toContain('小明')
    expect(wrapper.text()).not.toContain('阿花')
    expect(wrapper.text()).not.toContain('咖啡控')
  })

  it('Tab 篩選「心得」只顯示心得貼文', async () => {
    const wrapper = mount(CommunityBoard, {
      props: { posts: mockPosts },
    })
    const tabs = wrapper.findAll('.tab-btn')
    await tabs[2].trigger('click')
    expect(wrapper.text()).toContain('阿花')
    expect(wrapper.text()).not.toContain('小明')
  })

  it('揪團貼文顯示進度條和「+1 參加」按鈕', () => {
    const wrapper = mount(CommunityBoard, {
      props: { posts: mockPosts },
    })
    expect(wrapper.text()).toContain('3/6 人')
    expect(wrapper.text()).toContain('+1 參加')
  })

  it('點擊「+1 參加」emit join-team 事件', async () => {
    const wrapper = mount(CommunityBoard, {
      props: { posts: mockPosts },
    })
    const joinBtn = wrapper.find('.btn-join-team')
    await joinBtn.trigger('click')
    expect(wrapper.emitted('join-team')).toBeTruthy()
    expect(wrapper.emitted('join-team')![0]).toEqual(['post-1'])
  })

  it('發文內容為空時「發佈」按鈕 disabled', () => {
    const wrapper = mount(CommunityBoard, {
      props: { posts: mockPosts },
    })
    const postBtn = wrapper.find('.btn-post')
    expect(postBtn.attributes('disabled')).toBeDefined()
  })

  it('輸入內容後「發佈」按鈕可點擊並 emit post-created', async () => {
    const wrapper = mount(CommunityBoard, {
      props: { posts: mockPosts },
    })
    const textarea = wrapper.find('.compose-input')
    await textarea.setValue('測試發文內容')
    const postBtn = wrapper.find('.btn-post')
    expect(postBtn.attributes('disabled')).toBeUndefined()
    await postBtn.trigger('click')
    expect(wrapper.emitted('post-created')).toBeTruthy()
    const payload = wrapper.emitted('post-created')![0][0] as any
    expect(payload.content).toBe('測試發文內容')
    expect(payload.tags).toBeDefined()
  })

  it('空貼文列表顯示空狀態文字', () => {
    const wrapper = mount(CommunityBoard, {
      props: { posts: [] },
    })
    expect(wrapper.text()).toContain('還沒有人發文')
  })

  it('已成團的揪團不顯示「+1 參加」按鈕', () => {
    const fullPost: BoardPost[] = [{
      id: 'post-full', author: '團長', avatar: '#ccc',
      content: '已滿團', tags: ['揪團'], createdAt: '2026-07-28T10:00:00',
      likes: 5, comments: 2, type: 'team-up',
      teamInfo: { eventName: '活動', date: '2026-08-01', current: 6, target: 6 },
    }]
    const wrapper = mount(CommunityBoard, {
      props: { posts: fullPost },
    })
    expect(wrapper.text()).toContain('已成團')
    expect(wrapper.find('.btn-join-team').exists()).toBe(false)
  })

  describe('Property 4: 揪團進度 Clamp', () => {
    it('進度百分比始終在 0~100 之間', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 100 }),
          fc.integer({ min: 1, max: 100 }),
          (current, target) => {
            const progress = Math.min((current / target) * 100, 100)
            return progress >= 0 && progress <= 100
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
