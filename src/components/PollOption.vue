<script setup lang="ts">
import { computed } from 'vue'
import type { PollOption } from '../../server/src/domain'
import { userService } from '../services/user'
import { HandThumbUpIcon, XMarkIcon } from '@heroicons/vue/24/outline'

const props = defineProps<{
  option: PollOption
  optionIndex: number
  pollId: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'vote', optionIndex: number): void
  (e: 'unvote', optionIndex: number): void
}>()

// Check if the current user has voted for this option
const hasVoted = computed(() => {
  return props.option.votes.includes(userService.userId.value)
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
  <div class="poll-option border border-gray-300 rounded-lg p-4 relative overflow-hidden">
    <!-- Option content -->
    <div class="relative z-10 flex justify-between items-center">
      <div>
        <div
          class="text-lg font-bold"
          :class="{
            'text-blue-500': option.text === '賛成',
            'text-red-500': option.text === '反対',
          }"
        >
          {{ option.text }}
        </div>
        <div class="text-sm text-gray-500">投票数 {{ option.votes.length }}</div>
      </div>

      <button
        @click="handleVoteClick"
        :disabled="disabled"
        :class="[
          'px-4 py-2 rounded-md transition-colors flex items-center gap-1 font-bold',
          hasVoted
            ? 'bg-red-400 hover:bg-red-500 text-white'
            : 'bg-blue-400 hover:bg-blue-500 text-white',
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
        ]"
      >
        <XMarkIcon v-if="hasVoted" class="h-4 w-4" />
        <HandThumbUpIcon v-else class="h-4 w-4" />
        <span>{{ hasVoted ? 'キャンセル' : '投票' }}</span>
      </button>
    </div>
    <div class="mt-2 flex flex-wrap gap-1 h-6">
      <div v-for="userId in option.votes" :key="userId" class="flex items-center" :title="userId">
        <img
          :src="`https://q.trap.jp/api/v3/public/icon/${userId}`"
          :alt="userId"
          class="w-6 h-6 rounded-full border border-gray-200"
        />
      </div>
    </div>
  </div>
</template>
