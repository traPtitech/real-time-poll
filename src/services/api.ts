import type { Poll } from '../../server/src/domain'
import { mockMode, mockApi } from './mock'

// Base API URL
const API_BASE_URL = '/api'

// サーバー停止時などに読み込みが永遠に止まらないようタイムアウトを設定する
const FETCH_TIMEOUT_MS = 10_000

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

// API client class
class ApiClient {
  // Get all polls
  public async getPolls(): Promise<Poll[]> {
    if (mockMode) return mockApi.getPolls()
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/polls`)

      if (!response.ok) {
        throw new Error(`Failed to fetch polls: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching polls:', error)
      throw error
    }
  }

  // Get a specific poll
  public async getPoll(id: string): Promise<Poll | null> {
    if (mockMode) return mockApi.getPoll(id)
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/polls/${id}`)

      if (response.status === 404) {
        return null
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch poll: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error(`Error fetching poll ${id}:`, error)
      throw error
    }
  }

  // Create a new poll
  public async createPoll(title: string, description: string, options: string[]): Promise<Poll> {
    if (mockMode) return mockApi.createPoll(title, description, options)
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/polls`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          description,
          options,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to create poll: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error creating poll:', error)
      throw error
    }
  }

  // Update a poll
  public async updatePoll(
    id: string,
    updates: {
      title?: string
      description?: string
      options?: Array<{ id?: string; text: string }>
    },
  ): Promise<Poll> {
    if (mockMode) return mockApi.updatePoll(id, updates)
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/polls/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        throw new Error(`Failed to update poll: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error(`Error updating poll ${id}:`, error)
      throw error
    }
  }

  // Delete a poll
  public async deletePoll(id: string): Promise<void> {
    if (mockMode) return mockApi.deletePoll(id)
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/polls/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error(`Failed to delete poll: ${response.statusText}`)
      }
    } catch (error) {
      console.error(`Error deleting poll ${id}:`, error)
      throw error
    }
  }

  // Add a vote to a poll option
  public async addVote(pollId: string, optionIndex: number, userId: string): Promise<Poll> {
    if (mockMode) return mockApi.addVote(pollId, optionIndex, userId)
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/polls/${pollId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          optionIndex,
          userId,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to add vote: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error(`Error adding vote to poll ${pollId}:`, error)
      throw error
    }
  }

  // Remove a vote from a poll option
  public async removeVote(pollId: string, optionIndex: number, userId: string): Promise<Poll> {
    if (mockMode) return mockApi.removeVote(pollId, optionIndex, userId)
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/polls/${pollId}/vote`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          optionIndex,
          userId,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to remove vote: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error(`Error removing vote from poll ${pollId}:`, error)
      throw error
    }
  }

  // Get current user information
  public async getMe(): Promise<{
    name: string
    isExecutive: boolean
    executiveTotal: number
  }> {
    if (mockMode) return mockApi.getMe()
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/me`)

      if (!response.ok) {
        throw new Error(`Failed to fetch user info: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching user info:', error)
      throw error
    }
  }
}

// Create and export a singleton instance
export const apiClient = new ApiClient()
