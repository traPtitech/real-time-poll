<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { wsClient } from '../services/websocket'
import { apiClient } from '../services/api'
import type { Poll } from '../../server/src/domain'
import { useRouter } from 'vue-router'
import { IconClock, IconList, IconRefresh, IconUsers } from '@tabler/icons-vue'

const router = useRouter()

// Polls data
const polls = ref<Poll[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

const totalVotes = (poll: Poll) =>
  poll.options.reduce((sum, option) => sum + option.votes.length, 0)

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(iso))

// Load polls
const loadPolls = async () => {
  loading.value = true
  error.value = null

  try {
    // Try to get polls from WebSocket if connected
    if (wsClient.isConnected.value) {
      wsClient.getPolls()
    } else {
      // Fallback to REST API
      const pollsData = await apiClient.getPolls()
      polls.value = pollsData
    }
  } catch (err) {
    console.error('Error loading polls:', err)
    error.value = '投票の読み込みに失敗しました。'
  } finally {
    loading.value = false
  }
}

// Navigate to poll detail
const goToPoll = (pollId: string) => {
  router.push({ name: 'poll', params: { id: pollId } })
}

// Watch for changes to polls from WebSocket
watch(
  () => wsClient.polls.value,
  (newPolls) => {
    if (newPolls) {
      polls.value = newPolls
    }
  },
)

// Load polls on mount
onMounted(() => {
  loadPolls()
})
</script>

<template>
  <div class="poll-list">
    <!-- Loading state -->
    <div v-if="loading" class="text-center py-8">
      <span class="loading loading-spinner loading-lg text-primary"></span>
      <p class="mt-4 text-base-content/60">読み込み中…</p>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="alert alert-error text-sm">
      <span>{{ error }}</span>
      <button type="button" class="btn btn-sm" @click="loadPolls">
        <IconRefresh class="h-4 w-4" />
        再試行
      </button>
    </div>

    <!-- No polls -->
    <div v-else-if="polls.length === 0" class="text-center py-8">
      <p class="text-lg text-base-content/60">投票はまだありません</p>
    </div>

    <!-- Polls list -->
    <div v-else class="space-y-4">
      <div
        v-for="poll in polls"
        :key="poll.id"
        class="card bg-base-100 border border-base-300 hover:border-primary/50 transition-colors cursor-pointer"
        @click="goToPoll(poll.id)"
      >
        <div class="card-body p-5">
          <h3 class="card-title text-lg break-words">{{ poll.title }}</h3>
          <p v-if="poll.description" class="text-sm text-base-content/70 line-clamp-2 break-words">
            {{ poll.description }}
          </p>

          <div class="flex flex-wrap gap-x-4 gap-y-1 text-sm text-base-content/60">
            <span class="flex items-center gap-1">
              <IconList class="h-4 w-4" />
              {{ poll.options.length }} 選択肢
            </span>
            <span class="flex items-center gap-1">
              <IconUsers class="h-4 w-4" />
              {{ totalVotes(poll) }} 票
            </span>
            <span class="flex items-center gap-1">
              <IconClock class="h-4 w-4" />
              {{ formatDate(poll.createdAt) }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
