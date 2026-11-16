import type { Poll } from '../../server/src/domain'

// 画面確認用モック
// URL に ?mock=executive (役員として閲覧) / ?mock=guest (役員以外として閲覧) を付けると有効になる。
// 実データ・サーバー・traQ API には一切アクセスせず、ローカルのデモデータを表示する。

export type MockMode = 'executive' | 'guest'

const mode = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '').get(
  'mock',
)

export const mockMode: MockMode | null = mode === 'executive' || mode === 'guest' ? mode : null

// モック上の全役員数
export const MOCK_EXECUTIVE_TOTAL = 25

// モック用アバター (traQ の公開アイコンに依存しないローカル生成 SVG)
const AVATAR_BG = '#e5e7eb'
const AVATAR_FG = '#475569'

function mockAvatarUrl(userId: string): string {
  const initials =
    userId
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 2)
      .toUpperCase() || '??'
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>` +
    `<rect width='64' height='64' fill='${AVATAR_BG}'/>` +
    `<text x='32' y='41' font-family='system-ui,sans-serif' font-size='24' font-weight='700' fill='${AVATAR_FG}' text-anchor='middle'>${initials}</text>` +
    `</svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

// アイコン URL (通常は traQ の公開アイコン、モック時はローカル生成)
export const iconUrl = (userId: string): string =>
  mockMode ? mockAvatarUrl(userId) : `https://q.trap.jp/api/v3/public/icon/${userId}`

// ---------------------------------------------------------------------------
// デモデータ
// ---------------------------------------------------------------------------

// 役員会メンバーのロースター (cp20 が現在ユーザー)
const ROSTER = [
  'cp20',
  'akari24',
  'bunta',
  'chihiro',
  'daiki-s',
  'erimono',
  'fuku6',
  'gomenne',
  'hatsune',
  'ibuki',
  'jyugemu',
  'kabosu',
  'lemon-tea',
  'miyako',
  'nanashino',
  'omusubi',
  'penpine',
  'q-pot',
  'raicho',
  'shiromi',
  'tsubuan',
  'usamaru',
  'vicugna',
  'wakaba',
  'xylitol',
]

// 選択肢ごとの投票者はロースターのスライスで割り当てる (一部オプション間で重複あり)
const sliceVoters = (start: number, end: number): string[] => ROSTER.slice(start, end)

const budgetPoll: Poll = {
  id: 'mock-budget',
  title: '26年度 追加予算の承認',
  description: '物品購入費の追加支出について承認をお願いします。',
  options: [
    // index 0 = cp20 (現在ユーザー) → 賛成済みの状態で表示される
    { id: 'mock-budget-agree', text: '賛成', votes: sliceVoters(0, 17) },
    { id: 'mock-budget-disagree', text: '反対', votes: sliceVoters(17, 23) },
  ],
  createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
}

const partyPoll: Poll = {
  id: 'mock-party',
  title: '忘年会 開催日投票',
  description: '出席できる日を選んでください (複数選択OK)。',
  options: [
    { id: 'mock-party-1218', text: '12/18 (木)', votes: sliceVoters(0, 12) },
    { id: 'mock-party-1219', text: '12/19 (金)', votes: sliceVoters(12, 21) },
    { id: 'mock-party-1225', text: '12/25 (木)', votes: sliceVoters(19, 23) },
  ],
  createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
}

let polls: Poll[] = [budgetPoll, partyPoll]

const findPoll = (id: string) => polls.find((poll) => poll.id === id) ?? null

// Vue のリアクティブシステムに変更を検知させるため、参照ではなくコピーを返す
const snapshot = (poll: Poll | null): Poll | null =>
  poll ? (JSON.parse(JSON.stringify(poll)) as Poll) : null

// ---------------------------------------------------------------------------
// モック API (apiClient と同じ形状)
// ---------------------------------------------------------------------------

export interface MockMe {
  name: string
  isExecutive: boolean
  executiveTotal: number
}

export const mockApi = {
  getMe(): MockMe {
    return mockMode === 'executive'
      ? { name: 'cp20', isExecutive: true, executiveTotal: MOCK_EXECUTIVE_TOTAL }
      : { name: 'guest', isExecutive: false, executiveTotal: MOCK_EXECUTIVE_TOTAL }
  },

  async getPolls(): Promise<Poll[]> {
    return JSON.parse(JSON.stringify(polls)) as Poll[]
  },

  async getPoll(id: string): Promise<Poll | null> {
    return snapshot(findPoll(id))
  },

  async createPoll(title: string, description: string, options: string[]): Promise<Poll> {
    const poll: Poll = {
      id: `mock-${Date.now()}`,
      title,
      description,
      options: options.map((text, index) => ({
        id: `mock-opt-${Date.now()}-${index}`,
        text,
        votes: [],
      })),
      createdAt: new Date().toISOString(),
    }
    polls = [...polls, poll]
    return snapshot(poll) as Poll
  },

  async updatePoll(
    id: string,
    updates: {
      title?: string
      description?: string
      options?: Array<{ id?: string; text: string }>
    },
  ): Promise<Poll> {
    const poll = findPoll(id)
    if (!poll) throw new Error('投票が見つかりません')
    if (updates.title !== undefined) poll.title = updates.title
    if (updates.description !== undefined) poll.description = updates.description
    return snapshot(poll) as Poll
  },

  async deletePoll(id: string): Promise<void> {
    polls = polls.filter((poll) => poll.id !== id)
  },

  async addVote(pollId: string, optionIndex: number, userId: string): Promise<Poll> {
    const poll = findPoll(pollId)
    if (!poll) throw new Error('投票が見つかりません')
    const option = poll.options[optionIndex]
    if (!option) throw new Error('選択肢が見つかりません')
    if (option.votes.includes(userId)) {
      throw new Error('この選択肢にはすでに投票済みです')
    }
    option.votes = [...option.votes, userId]
    return snapshot(poll) as Poll
  },

  async removeVote(pollId: string, optionIndex: number, userId: string): Promise<Poll> {
    const poll = findPoll(pollId)
    if (!poll) throw new Error('投票が見つかりません')
    const option = poll.options[optionIndex]
    if (!option) throw new Error('選択肢が見つかりません')
    option.votes = option.votes.filter((vote) => vote !== userId)
    return snapshot(poll) as Poll
  },
}
