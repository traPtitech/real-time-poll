<script setup lang="ts">
import { computed } from 'vue'
import type { PollOption } from '../../server/src/domain'
import { userService } from '../services/user'
import { iconUrl } from '../services/mock'
import { IconThumbUp, IconX } from '@tabler/icons-vue'

const props = defineProps<{
  option: PollOption
  optionIndex: number
  pollId: string
  disabled?: boolean
  // 全役員数 (0 の場合はパーセントを表示しない)
  totalEligible?: number
}>()

const emit = defineEmits<{
  (e: 'vote', optionIndex: number): void
  (e: 'unvote', optionIndex: number): void
}>()

// Check if the current user has voted for this option
const hasVoted = computed(() => {
  return props.option.votes.includes(userService.userId.value)
})

// この選択肢への票の割合 (全役員数が不明な場合は null)
const percentage = computed(() => {
  const total = props.totalEligible ?? 0
  if (total <= 0) return null
  return Math.min(100, Math.round((props.option.votes.length / total) * 100))
})

// Handle vote button click
const handleVoteClick = () => {
  if (props.disabled) return

  if (hasVoted.value) {
    emit('unvote', props.optionIndex)
  } else {
    emit('vote', props.optionIndex)
  }
}
</script>

<template>
  <div class="card bg-base-100 border-2" :class="hasVoted ? 'border-primary' : 'border-base-300'">
    <div class="card-body p-4">
      <div class="flex justify-between items-center gap-3">
        <div class="min-w-0">
          <h3
            class="text-lg font-bold break-words"
            :class="{
              'text-primary': option.text === '賛成',
              'text-error': option.text === '反対',
            }"
          >
            {{ option.text }}
            <span v-if="hasVoted" class="badge badge-primary badge-sm align-middle ml-1"
              >投票済み</span
            >
          </h3>
          <p class="text-sm text-base-content/60">
            投票数 {{ option.votes.length
            }}<span v-if="percentage !== null"> ({{ percentage }}%)</span>
          </p>
        </div>

        <button
          v-if="!disabled"
          type="button"
          class="btn shrink-0"
          :class="hasVoted ? 'btn-error' : 'btn-primary'"
          @click="handleVoteClick"
        >
          <IconX v-if="hasVoted" class="h-5 w-5" />
          <IconThumbUp v-else class="h-5 w-5" />
          <span>{{ hasVoted ? 'キャンセル' : '投票' }}</span>
        </button>
      </div>

      <!-- Voters (折り返して全員表示・見切れ防止) -->
      <div v-if="option.votes.length > 0" class="flex flex-wrap gap-1">
        <img
          v-for="userId in option.votes"
          :key="userId"
          :src="iconUrl(userId)"
          :alt="userId"
          :title="userId"
          loading="lazy"
          class="w-6 h-6 rounded-full border border-base-300"
          :class="userId === userService.userId.value ? 'ring-2 ring-primary' : ''"
        />
      </div>
    </div>
  </div>
</template>
