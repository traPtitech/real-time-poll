<script setup lang="ts">
import { ref } from 'vue'
import { apiClient } from '../services/api'
import { useRouter } from 'vue-router'
import { IconFilePlus, IconPlus, IconX } from '@tabler/icons-vue'

const router = useRouter()

// Form data
const title = ref('')
const description = ref('')
const options = ref(['賛成', '反対'])
const submitting = ref(false)
const error = ref<string | null>(null)

// Add a new option
const addOption = () => {
  options.value.push('')
}

// Remove an option
const removeOption = (index: number) => {
  if (options.value.length <= 2) {
    error.value = '選択肢は2つ以上必要です'
    return
  }
  options.value.splice(index, 1)
}

// Update an option
const updateOption = (index: number, value: string) => {
  options.value[index] = value
}

// Validate form
const validateForm = (): boolean => {
  // Reset error
  error.value = null

  // Check title
  if (!title.value.trim()) {
    error.value = 'タイトルを入力してください'
    return false
  }

  // Check options
  if (options.value.length < 2) {
    error.value = '選択肢は2つ以上必要です'
    return false
  }

  // Check for empty options
  const emptyOptions = options.value.filter((option) => !option.trim())
  if (emptyOptions.length > 0) {
    error.value = 'すべての選択肢にテキストを入力してください'
    return false
  }

  return true
}

// Submit form
const submitForm = async () => {
  // Validate form
  if (!validateForm()) {
    return
  }

  // Set submitting state
  submitting.value = true

  try {
    // Filter out empty options and trim whitespace
    const validOptions = options.value
      .map((option) => option.trim())
      .filter((option) => option.length > 0)

    // Create poll
    const poll = await apiClient.createPoll(
      title.value.trim(),
      description.value.trim(),
      validOptions,
    )

    // Navigate to the new poll
    router.push({ name: 'poll', params: { id: poll.id } })
  } catch (err) {
    console.error('Error creating poll:', err)
    error.value = '投票の作成に失敗しました。'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="create-poll-form card bg-base-100 border border-base-300">
    <div class="card-body">
      <h1 class="card-title text-2xl mb-2">新しい投票を作成</h1>

      <!-- Error message -->
      <div v-if="error" class="alert alert-error py-2 text-sm mb-2">
        <span>{{ error }}</span>
      </div>

      <form @submit.prevent="submitForm">
        <!-- Title -->
        <fieldset class="mb-4">
          <legend class="text-sm font-bold text-base-content/80 mb-2">タイトル</legend>
          <input
            v-model="title"
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
            v-model="description"
            class="textarea w-full"
            placeholder="投票の説明を入力"
            rows="3"
          ></textarea>
        </fieldset>

        <!-- Options -->
        <fieldset class="mb-4">
          <legend class="text-sm font-bold text-base-content/80 mb-2">選択肢</legend>

          <div v-for="(option, index) in options" :key="index" class="flex items-center gap-2 mb-2">
            <input
              :value="option"
              type="text"
              class="input min-w-0 flex-grow"
              :placeholder="`選択肢 ${index + 1}`"
              @input="updateOption(index, ($event.target as HTMLInputElement).value)"
              required
            />
            <button
              type="button"
              class="btn btn-ghost btn-sm shrink-0 text-error"
              :disabled="options.length <= 2"
              :title="options.length <= 2 ? '選択肢は2つ以上必要です' : '選択肢を削除'"
              @click="removeOption(index)"
            >
              <IconX class="h-5 w-5" />
            </button>
          </div>

          <button type="button" class="btn btn-outline btn-sm mt-2" @click="addOption">
            <IconPlus class="h-4 w-4" />
            選択肢を追加
          </button>
        </fieldset>

        <!-- Submit button -->
        <div class="mt-6">
          <button type="submit" class="btn btn-primary w-full" :disabled="submitting">
            <IconFilePlus class="h-5 w-5" />
            <span>{{ submitting ? '作成中…' : '投票を作成' }}</span>
          </button>
          <p class="mt-3 text-xs text-base-content/50">
            ※
            作成した投票はサーバーのメモリ上にのみ保存されます。サーバーの再起動・再デプロイ時にすべて消去されます。
          </p>
        </div>
      </form>
    </div>
  </div>
</template>
