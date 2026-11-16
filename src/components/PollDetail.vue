<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import type { Poll } from '../../server/src/domain'
import { wsClient } from '../services/websocket'
import { apiClient } from '../services/api'
import { userService } from '../services/user'
import PollOption from './PollOption.vue'
import { IconCopy, IconPencil, IconRefresh } from '@tabler/icons-vue'

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

// 全役員数 (traQ の役員グループから取得、不明な場合は 0)
const executiveTotal = userService.executiveTotal

// Calculate total votes
const totalVotes = computed(() => {
  if (!poll.value) return 0
  return poll.value.options.reduce((sum, option) => sum + option.votes.length, 0)
})

// 投票に参加した人数 (重複を除いた投票者の数)
const participants = computed(() => {
  if (!poll.value) return 0
  return new Set(poll.value.options.flatMap((option) => option.votes)).size
})

// 全役員のうち投票に参加している割合 (%)
const participationPct = computed(() => {
  if (executiveTotal.value <= 0) return null
  return Math.min(100, Math.round((participants.value / executiveTotal.value) * 100))
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
    error.value = '投票の読み込みに失敗しました。'
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
    error.value = '投票の送信に失敗しました。'
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
    error.value = '投票の取消に失敗しました。'
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
    error.value = 'タイトルは必須です'
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
    error.value = '投票の更新に失敗しました。'
  } finally {
    isSaving.value = false
  }
}

const copyEmbedCode = () => {
  const embedCode = `<iframe src="${window.origin}/poll/${props.pollId}" width="600" height="600" style="border: none" allow="clipboard-write"></iframe>`
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
  const repeatedMeasure = ':null:' + measure.repeat(Math.ceil(totalVotes.value / 10))
  const optionResult = poll.value?.options
    .map((option) => `${getStamp(option.text)}${option.votes.map((v) => `:@${v}:`).join('')}`)
    .join('\n')
  const resultMarkdown = `:::info
**${poll.value?.title}**
${poll.value?.description}

${repeatedMeasure}

${optionResult}

⚠️ この投票はメモリ上にのみ保存されています (サーバー再起動で消去)
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
      <span class="loading loading-spinner loading-lg text-primary"></span>
      <p class="mt-4 text-base-content/60">読み込み中…</p>
    </div>

    <!-- Error state -->
    <div v-else-if="error && !poll" class="alert alert-error text-sm">
      <span>{{ error }}</span>
      <button type="button" class="btn btn-sm" @click="loadPoll">
        <IconRefresh class="h-4 w-4" />
        再試行
      </button>
    </div>

    <!-- Poll not found -->
    <div v-else-if="!poll" class="text-center py-8">
      <p class="text-lg text-base-content/60">投票が見つかりません</p>
      <p class="mt-1 text-sm text-base-content/50">
        投票データはメモリ上にのみ保存されているため、サーバー再起動時に削除されています
      </p>
    </div>

    <!-- Poll content -->
    <div v-else class="card bg-base-100 border border-base-300">
      <div class="card-body">
        <!-- View mode -->
        <div v-if="!isEditMode">
          <div class="flex justify-between items-start gap-3">
            <h1 class="text-2xl font-bold break-all min-w-0">{{ poll.title }}</h1>
            <button type="button" class="btn btn-ghost btn-sm shrink-0" @click="enterEditMode">
              <IconPencil class="h-4 w-4" />
              編集
            </button>
          </div>
          <p v-if="poll.description" class="text-sm text-base-content/70 mt-1 break-all">
            {{ poll.description }}
          </p>
        </div>

        <!-- Edit mode -->
        <div v-else>
          <!-- Error message -->
          <div v-if="error" class="alert alert-error py-2 text-sm mb-4">
            <span>{{ error }}</span>
          </div>

          <!-- Title -->
          <fieldset class="mb-4">
            <legend class="text-sm font-bold text-base-content/80 mb-2">タイトル</legend>
            <input
              v-model="editTitle"
              type="text"
              class="input w-full"
              placeholder="投票のタイトルを入力"
              required
            />
          </fieldset>

          <!-- Description -->
          <fieldset class="mb-4">
            <legend class="text-sm font-bold text-base-content/80 mb-2">説明 (任意)</legend>
            <textarea
              v-model="editDescription"
              class="textarea w-full"
              placeholder="投票の説明を入力"
              rows="3"
            ></textarea>
          </fieldset>

          <!-- Buttons -->
          <div class="flex gap-2">
            <button
              type="button"
              class="btn btn-primary"
              :disabled="isSaving"
              @click="savePollChanges"
            >
              <span v-if="isSaving" class="loading loading-spinner"></span>
              <span>{{ isSaving ? '保存中…' : '保存' }}</span>
            </button>
            <button
              type="button"
              class="btn btn-ghost"
              :disabled="isSaving"
              @click="cancelEditMode"
            >
              キャンセル
            </button>
          </div>
        </div>

        <!-- 参加状況 -->
        <div class="mt-2 mb-4 text-sm text-base-content/60">
          <div class="flex flex-wrap items-baseline gap-x-3">
            <span>
              総投票数: {{ totalVotes }} 票<span v-if="executiveTotal > 0">
                ・ 参加者 {{ participants }}/{{ executiveTotal }} 名 ({{ participationPct }}%)</span
              >
            </span>
          </div>
          <progress
            v-if="executiveTotal > 0"
            class="progress progress-primary h-2 mt-2"
            :value="participants"
            :max="executiveTotal"
          ></progress>
        </div>

        <!-- Poll options -->
        <div class="flex flex-col gap-2">
          <PollOption
            v-for="(option, index) in poll.options"
            :key="option.id"
            :option="option"
            :option-index="index"
            :poll-id="poll.id"
            :total-eligible="executiveTotal"
            @vote="handleVote"
            @unvote="handleUnvote"
          />
        </div>

        <div class="mt-4 flex flex-wrap gap-2">
          <button type="button" class="btn btn-outline" @click="copyEmbedCode">
            <IconCopy class="h-4 w-4" />
            埋め込みコードをコピー
          </button>
          <button type="button" class="btn btn-outline" @click="copyResult">
            <IconCopy class="h-4 w-4" />
            結果をコピー
          </button>
        </div>

        <p class="mt-4 text-xs text-base-content/50">
          ※
          投票データはサーバーのメモリ上にのみ保存されています。サーバーの再起動・再デプロイ時にすべて消去されます。
        </p>
      </div>
    </div>
  </div>
</template>
