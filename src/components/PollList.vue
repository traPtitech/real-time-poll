<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { wsClient } from '../services/websocket'
import { apiClient } from '../services/api'
import type { Poll } from '../../server/src/domain'
import { useRouter } from 'vue-router'
import {
  ArrowPathIcon,
  ClockIcon,
  DocumentTextIcon,
  UserGroupIcon,
} from '@heroicons/vue/24/outline'

const router = useRouter()

// Polls data
const polls = ref<Poll[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

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
    error.value = 'Failed to load polls. Please try again.'
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
    if (newPolls && newPolls.length > 0) {
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
      <div
        class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-400 mx-auto"
      ></div>
      <p class="mt-4 text-gray-500">Loading polls...</p>
    </div>

    <!-- Error state -->
    <div
      v-else-if="error"
      class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
    >
      <strong class="font-bold">Error!</strong>
      <span class="block sm:inline"> {{ error }}</span>
      <button
        @click="loadPolls"
        class="mt-2 bg-red-400 hover:bg-red-500 text-white px-4 py-2 rounded flex items-center gap-1 mx-auto"
      >
        <ArrowPathIcon class="h-4 w-4" />
        <span>Try Again</span>
      </button>
    </div>

    <!-- No polls -->
    <div v-else-if="polls.length === 0" class="text-center py-8">
      <p class="text-xl text-gray-600">No polls available</p>
    </div>

    <!-- Polls list -->
    <div v-else class="space-y-4">
      <div
        v-for="poll in polls"
        :key="poll.id"
        class="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow"
        @click="goToPoll(poll.id)"
      >
        <h2 class="text-xl font-bold mb-2">{{ poll.title }}</h2>
        <p v-if="poll.description" class="text-gray-600 mb-4 line-clamp-2">
          {{ poll.description }}
        </p>

        <div class="flex justify-between items-center text-sm text-gray-500">
          <span class="flex items-center gap-1">
            <DocumentTextIcon class="h-4 w-4" />
            {{ poll.options.length }} options
          </span>
          <span class="flex items-center gap-1">
            <UserGroupIcon class="h-4 w-4" />
            {{ poll.options.reduce((sum, option) => sum + option.votes.length, 0) }} votes
          </span>
          <span class="flex items-center gap-1">
            <ClockIcon class="h-4 w-4" />
            {{ new Date(poll.createdAt).toLocaleDateString() }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
