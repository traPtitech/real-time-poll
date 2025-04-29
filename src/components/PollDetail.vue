<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import type { Poll } from '../../server/src/domain'
import { wsClient } from '../services/websocket'
import { apiClient } from '../services/api'
import { userService } from '../services/user'
import PollOption from './PollOption.vue'
import { PencilIcon, ClipboardDocumentIcon, ArrowPathIcon } from '@heroicons/vue/24/outline'

const props = defineProps<{
  pollId: string
  initialPoll?: Poll
}>()

// Poll data
const poll = ref<Poll | null>(props.initialPoll || null)
const loading = ref(true)
const error = ref<string | null>(null)

// Edit mode state
const isEditMode = ref(false)
const editTitle = ref('')
const editDescription = ref('')
const isSaving = ref(false)

// Calculate total votes
const totalVotes = computed(() => {
  if (!poll.value) return 0
  return poll.value.options.reduce((sum, option) => sum + option.votes.length, 0)
})

// Load poll data
const loadPoll = async () => {
  loading.value = true
  error.value = null

  try {
    // Try to get poll from WebSocket if connected
    if (wsClient.isConnected.value) {
      wsClient.getPoll(props.pollId)
    } else {
      // Fallback to REST API
      const pollData = await apiClient.getPoll(props.pollId)
      poll.value = pollData
    }
  } catch (err) {
    console.error('Error loading poll:', err)
    error.value = 'Failed to load poll. Please try again.'
  } finally {
    loading.value = false
  }
}

// Handle vote
const handleVote = async (optionIndex: number) => {
  if (!poll.value) return

  try {
    // Try to add vote via WebSocket if connected
    if (wsClient.isConnected.value) {
      wsClient.addVote(props.pollId, optionIndex, userService.userId.value)
    } else {
      // Fallback to REST API
      const updatedPoll = await apiClient.addVote(
        props.pollId,
        optionIndex,
        userService.userId.value,
      )
      poll.value = updatedPoll
    }
  } catch (err) {
    console.error('Error adding vote:', err)
    error.value = 'Failed to add vote. Please try again.'
  }
}

// Handle unvote
const handleUnvote = async (optionIndex: number) => {
  if (!poll.value) return

  try {
    // Try to remove vote via WebSocket if connected
    if (wsClient.isConnected.value) {
      wsClient.removeVote(props.pollId, optionIndex, userService.userId.value)
    } else {
      // Fallback to REST API
      const updatedPoll = await apiClient.removeVote(
        props.pollId,
        optionIndex,
        userService.userId.value,
      )
      poll.value = updatedPoll
    }
  } catch (err) {
    console.error('Error removing vote:', err)
    error.value = 'Failed to remove vote. Please try again.'
  }
}

// Enter edit mode
const enterEditMode = () => {
  if (!poll.value) return

  editTitle.value = poll.value.title
  editDescription.value = poll.value.description || ''
  isEditMode.value = true
}

// Cancel edit mode
const cancelEditMode = () => {
  isEditMode.value = false
  editTitle.value = ''
  editDescription.value = ''
}

// Save poll changes
const savePollChanges = async () => {
  if (!poll.value) return

  // Validate title
  if (!editTitle.value.trim()) {
    error.value = 'Title is required'
    return
  }

  isSaving.value = true
  error.value = null

  try {
    const updatedPoll = await apiClient.updatePoll(poll.value.id, {
      title: editTitle.value.trim(),
      description: editDescription.value.trim(),
    })

    poll.value = updatedPoll
    isEditMode.value = false
  } catch (err) {
    console.error('Error updating poll:', err)
    error.value = 'Failed to update poll. Please try again.'
  } finally {
    isSaving.value = false
  }
}

const copyEmbedCode = () => {
  const embedCode = `<iframe src="${window.origin}/poll/${props.pollId}" width="600" height="600"></iframe>`
  navigator.clipboard.writeText(embedCode).then(() => {
    alert('埋め込みコードがクリップボードにコピーされました！')
  })
}

// Markdown形式で結果をコピー
const copyResult = () => {
  const getStamp = (option: string) =>
    ({
      賛成: ':agree:',
      反対: ':disagree:',
    })[option] ?? ''

  const measure = ':null::null::null::null::five::null::null::null::null::zero:'
  const repeatedMeasure = measure.repeat(Math.ceil(totalVotes.value / 10))
  const optionResult = poll.value?.options
    .map((option) => `${getStamp(option.text)}${option.votes.map((v) => `:@${v}:`).join('')}`)
    .join('\n')
  const resultMarkdown = `:::info
**${poll.value?.title}**
${poll.value?.description}

${repeatedMeasure}

${optionResult}
:::`

  navigator.clipboard.writeText(resultMarkdown).then(() => {
    alert('結果がクリップボードにコピーされました！')
  })
}

// Watch for changes to the current poll from WebSocket
watch(
  () => wsClient.currentPoll.value,
  (newPoll) => {
    if (newPoll && newPoll.id === props.pollId) {
      poll.value = newPoll
    }
  },
)

// Load poll on mount
onMounted(() => {
  loadPoll()
})
</script>

<template>
  <div class="poll-detail">
    <!-- Loading state -->
    <div v-if="loading" class="text-center py-8">
      <div
        class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-400 mx-auto"
      ></div>
      <p class="mt-4 text-gray-500">Loading poll...</p>
    </div>

    <!-- Error state -->
    <div
      v-else-if="error"
      class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
    >
      <strong class="font-bold">Error!</strong>
      <span class="block sm:inline"> {{ error }}</span>
      <button
        @click="loadPoll"
        class="mt-2 bg-red-400 hover:bg-red-500 text-white px-4 py-2 rounded flex items-center gap-1 mx-auto"
      >
        <ArrowPathIcon class="h-4 w-4" />
        <span>Try Again</span>
      </button>
    </div>

    <!-- Poll not found -->
    <div v-else-if="!poll" class="text-center py-8">
      <p class="text-xl text-gray-600">Poll not found</p>
    </div>

    <!-- Poll content -->
    <div v-else class="bg-white rounded-lg shadow-md p-6">
      <!-- View mode -->
      <div v-if="!isEditMode">
        <div class="flex justify-between items-start mb-2">
          <h1 class="text-2xl font-bold break-all">{{ poll.title }}</h1>
          <button
            @click="enterEditMode"
            class="px-3 py-1 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 flex items-center gap-1"
          >
            <PencilIcon class="h-4 w-4" />
            <span>編集</span>
          </button>
        </div>
        <p v-if="poll.description" class="text-gray-600 mb-6 break-all">{{ poll.description }}</p>
      </div>

      <!-- Edit mode -->
      <div v-else class="mb-6">
        <!-- Error message -->
        <div
          v-if="error"
          class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4"
        >
          {{ error }}
        </div>

        <!-- Title -->
        <div class="mb-4">
          <label for="edit-title" class="block text-gray-700 font-bold mb-2">タイトル</label>
          <input
            id="edit-title"
            v-model="editTitle"
            type="text"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="投票のタイトルを入力"
            required
          />
        </div>

        <!-- Description -->
        <div class="mb-4">
          <label for="edit-description" class="block text-gray-700 font-bold mb-2"
            >説明 (任意)</label
          >
          <textarea
            id="edit-description"
            v-model="editDescription"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="投票の説明を入力"
            rows="3"
          ></textarea>
        </div>

        <!-- Buttons -->
        <div class="flex space-x-2">
          <button
            @click="savePollChanges"
            class="px-4 py-2 bg-blue-400 text-white rounded-md hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300 flex items-center gap-1"
            :disabled="isSaving"
          >
            <span v-if="isSaving">保存中...</span>
            <span v-else>保存</span>
          </button>
          <button
            @click="cancelEditMode"
            class="px-4 py-2 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 flex items-center gap-1"
            :disabled="isSaving"
          >
            キャンセル
          </button>
        </div>
      </div>

      <div class="mb-4 text-sm text-gray-500">
        総投票数: {{ totalVotes }} ({{ ((totalVotes / 58) * 100).toFixed(0) }}%)
      </div>

      <!-- Poll options -->
      <div class="flex flex-col gap-2">
        <div v-for="(option, index) in poll.options" :key="option.id">
          <PollOption
            :option="option"
            :option-index="index"
            :poll-id="poll.id"
            @vote="handleVote"
            @unvote="handleUnvote"
          />
        </div>
      </div>

      <div class="mt-4 flex gap-2">
        <button
          @click="copyEmbedCode"
          class="px-4 py-2 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 inline-flex items-center gap-1"
        >
          <ClipboardDocumentIcon class="h-4 w-4" />
          <span>埋め込みコードをコピー</span>
        </button>
        <button
          @click="copyResult"
          class="px-4 py-2 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 inline-flex items-center gap-1"
        >
          <ClipboardDocumentIcon class="h-4 w-4" />
          <span>結果をコピー</span>
        </button>
      </div>
    </div>
  </div>
</template>
