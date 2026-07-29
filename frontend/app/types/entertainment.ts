/**
 * 樂模組共用型別定義
 */

/** 活動類型 */
export type EventType = 'baseball' | 'exhibition' | 'concert' | 'theater'

/** 門市體驗類型 */
export type ExperienceType = 'coffee' | 'baking' | 'craft' | 'tasting'

/** 票券狀態 */
export type TicketStatus = 'unused' | 'used' | 'expired'

/** AI 推薦情境 */
export type RecommendScenario = 'weekend' | 'date' | 'family' | 'friends'

/** 優惠券類型 */
export type CouponType = 'drink' | 'food' | 'discount' | 'gift'

/** 貼文類型 */
export type PostType = 'discussion' | 'team-up' | 'review'

/** 社大課程狀態 */
export type CourseStatus = 'open' | 'almost-full' | 'full'

/** 獎品類型 */
export type PrizeType = 'ticket' | 'coupon' | 'points' | 'cash' | 'none'

/** 導航列 Tab Key */
export type EntertainmentNavKey = 'ticket' | 'recommend' | 'points' | 'community' | 'board'

/** 票種價格 */
export interface TicketPrice {
  id: string
  name: string
  price: number
  remaining: number
}

/** 活動項目（球賽/展演） */
export interface EventItem {
  id: string
  type: EventType
  title: string
  date: string
  time: string
  venue: string
  venueAddress: string
  priceRange: string
  prices: TicketPrice[]
  remainingTickets: number
  coverImage: string
  tags?: string[]
  opponent?: string
}

/** 門市體驗活動 */
export interface StoreExperience {
  id: string
  name: string
  type: ExperienceType
  storeName: string
  storeAddress: string
  timeSlot: string
  fee: number
  maxParticipants: number
  currentParticipants: number
  description?: string
}

/** 電子票券 */
export interface EntertainmentTicket {
  id: string
  eventType: EventType | 'experience'
  eventName: string
  date: string
  time: string
  venue: string
  venueAddress: string
  seatInfo?: string
  ticketType: string
  quantity: number
  qrCode: string
  status: TicketStatus
  purchaseDate: string
  totalAmount: number
}

/** AI 推薦活動 */
export interface RecommendedEvent {
  id: string
  type: EventType | 'experience'
  title: string
  date: string
  venue: string
  price: string
  coverImage: string
}

/** AI 推薦結果 */
export interface EntertainmentRecommendation {
  scenario: RecommendScenario
  message: string
  events: RecommendedEvent[]
  triggerText?: string
}

/** 憑票優惠券 */
export interface TicketCoupon {
  id: string
  ticketId: string
  description: string
  discount: string
  storeName: string
  validUntil: string
  couponType: CouponType
}

/** 獎品定義 */
export interface Prize {
  id: string
  name: string
  type: PrizeType
  value?: number
  description?: string
  probability: number
}

/** 任務定義 */
export interface PointTask {
  id: string
  name: string
  description: string
  reward: number
  completed: boolean
  icon?: string
}

/** 娛樂成就徽章 */
export interface EntertainmentBadge {
  id: string
  icon: string
  name: string
  description: string
  unlocked: boolean
  unlockedAt?: string
}

/** 社區活動 */
export interface CommunityEvent {
  id: string
  name: string
  date: string
  time: string
  location: string
  organizer: string
  fee: number
  currentParticipants: number
  maxParticipants: number
  description?: string
}

/** 社大課程 */
export interface CommunityCourse {
  id: string
  name: string
  instructor: string
  schedule: string
  credits: number
  sessions: number
  fee: number
  status: CourseStatus
  description?: string
  location?: string
}

/** 媒合社群/活動 */
export interface MatchedGroup {
  id: string
  name: string
  matchScore: number
  date: string
  time: string
  location: string
  participants: number
  tags: string[]
  type: 'activity' | 'community'
  description?: string
}

/** 揪團資訊 */
export interface TeamInfo {
  eventName: string
  date: string
  current: number
  target: number
}

/** 留言板貼文 */
export interface BoardPost {
  id: string
  author: string
  avatar: string
  content: string
  tags: string[]
  createdAt: string
  likes: number
  comments: number
  type: PostType
  teamInfo?: TeamInfo
}
