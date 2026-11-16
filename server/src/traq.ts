// traQ API クライアント
// 役員会メンバー (traQユーザーグループ) かどうかの判定を行う

export interface ExecutiveInfo {
  isExecutive: boolean
  // グループに登録されている全役員数 (不明な場合は 0)
  total: number
}

interface TraQUser {
  id: string
  name: string
  displayName?: string
}

interface TraQGroupMember {
  id: string
  role?: string
}

interface TraQGroup {
  id: string
  name: string
  type?: string
  members: TraQGroupMember[]
}

const TRAQ_API_BASE = process.env.TRAQ_API_ORIGIN || 'https://q.trap.jp/api/v3'
const EXECUTIVE_GROUP_NAME = (process.env.EXECUTIVE_GROUP_NAME || 'executive26').toLowerCase()
const TRAQ_API_TOKEN = process.env.TRAQ_API_TOKEN || ''

// トークンが設定されていない場合はアクセス制限を無効化する (ローカル開発用)
export const isEnforcementEnabled = TRAQ_API_TOKEN !== ''

const CACHE_TTL_MS = 60 * 1000

interface CacheEntry {
  promise: Promise<unknown>
  expiresAt: number
}

const cache = new Map<string, CacheEntry>()

const logGroupNotFoundOnce = { done: false }
const logDevModeOnce = { done: false }

function cached<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const hit = cache.get(key)
  const now = Date.now()
  if (hit && hit.expiresAt > now) {
    return hit.promise as Promise<T>
  }
  // 失敗した結果はキャッシュしない (次のリクエストで再試行される)
  const promise = fetcher().catch((error) => {
    cache.delete(key)
    throw error
  })
  cache.set(key, { promise, expiresAt: now + CACHE_TTL_MS })
  return promise
}

async function traqFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${TRAQ_API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${TRAQ_API_TOKEN}` },
  })
  if (!response.ok) {
    throw new Error(`traQ API error: ${response.status} ${path}`)
  }
  return (await response.json()) as T
}

function getUserByName(name: string): Promise<TraQUser | null> {
  return cached(`user:${name}`, async () => {
    const users = await traqFetch<TraQUser[]>(`/users?name=${encodeURIComponent(name)}`)
    return users[0] ?? null
  })
}

function getExecutiveGroup(): Promise<TraQGroup | null> {
  return cached('group', async () => {
    const groups = await traqFetch<TraQGroup[]>('/groups')
    const group = groups.find((g) => g.name.toLowerCase() === EXECUTIVE_GROUP_NAME) ?? null
    if (!group && !logGroupNotFoundOnce.done) {
      logGroupNotFoundOnce.done = true
      console.error(
        `⚠️ traQグループ "${EXECUTIVE_GROUP_NAME}" が見つかりません。` +
          ` EXECUTIVE_GROUP_NAME を確認してください。` +
          ` 登録されているグループ: ${groups.map((g) => g.name).join(', ')}`,
      )
    }
    return group
  })
}

async function fetchExecutiveInfo(username: string): Promise<ExecutiveInfo> {
  if (!isEnforcementEnabled) {
    if (!logDevModeOnce.done) {
      logDevModeOnce.done = true
      console.warn(
        '⚠️ TRAQ_API_TOKEN が設定されていないため、役員会メンバー限定のアクセス制限は無効になっています (開発モード)。',
      )
    }
    return { isExecutive: true, total: 0 }
  }

  if (!username) {
    return { isExecutive: false, total: 0 }
  }

  const [user, group] = await Promise.all([getUserByName(username), getExecutiveGroup()])

  if (!user || !group) {
    return { isExecutive: false, total: 0 }
  }

  const isExecutive = group.members.some((member) => member.id === user.id)
  return { isExecutive, total: group.members.length }
}

// ユーザー名から役員会メンバー情報を取得する (60秒キャッシュ)
export function getExecutiveInfo(username: string): Promise<ExecutiveInfo> {
  return cached(`exec:${username}`, () => fetchExecutiveInfo(username))
}
