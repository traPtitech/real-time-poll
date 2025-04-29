<script setup lang="ts">
import { ref } from 'vue'
import { apiClient } from '../services/api'
import { useRouter } from 'vue-router'
import { PlusIcon, XMarkIcon, DocumentPlusIcon } from '@heroicons/vue/24/outline'

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
    error.value = 'A poll must have at least 2 options'
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
    error.value = 'Title is required'
    return false
  }

  // Check options
  if (options.value.length < 2) {
    error.value = 'A poll must have at least 2 options'
    return false
  }

  // Check for empty options
  const emptyOptions = options.value.filter((option) => !option.trim())
  if (emptyOptions.length > 0) {
    error.value = 'All options must have text'
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
    error.value = 'Failed to create poll. Please try again.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="create-poll-form bg-white rounded-lg shadow-md p-6">
    <h1 class="text-2xl font-bold mb-6">Create a New Poll</h1>

    <!-- Error message -->
    <div
      v-if="error"
      class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4"
    >
      {{ error }}
    </div>

    <form @submit.prevent="submitForm">
      <!-- Title -->
      <div class="mb-4">
        <label for="title" class="block text-gray-700 font-bold mb-2">Title</label>
        <input
          id="title"
          v-model="title"
          type="text"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter poll title"
          required
        />
      </div>

      <!-- Description -->
      <div class="mb-4">
        <label for="description" class="block text-gray-700 font-bold mb-2"
          >Description (optional)</label
        >
        <textarea
          id="description"
          v-model="description"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter poll description"
          rows="3"
        ></textarea>
      </div>

      <!-- Options -->
      <div class="mb-4">
        <label class="block text-gray-700 font-bold mb-2">Options</label>

        <div v-for="(option, index) in options" :key="index" class="flex items-center mb-2">
          <input
            v-model="options[index]"
            type="text"
            class="flex-grow px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            :placeholder="`Option ${index + 1}`"
            @input="(e) => updateOption(index, (e.target as HTMLInputElement).value)"
            required
          />
          <button
            type="button"
            @click="removeOption(index)"
            class="ml-2 text-red-400 hover:text-red-600"
            :disabled="options.length <= 2"
          >
            <XMarkIcon class="h-5 w-5" />
          </button>
        </div>

        <button
          type="button"
          @click="addOption"
          class="mt-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 flex items-center gap-1"
        >
          <PlusIcon class="h-4 w-4" />
          <span>Add Option</span>
        </button>
      </div>

      <!-- Submit button -->
      <div class="mt-6">
        <button
          type="submit"
          class="w-full px-4 py-2 bg-blue-400 text-white rounded-md hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300 flex items-center justify-center gap-1"
          :disabled="submitting"
        >
          <DocumentPlusIcon class="h-5 w-5" />
          <span v-if="submitting">Creating...</span>
          <span v-else>Create Poll</span>
        </button>
      </div>
    </form>
  </div>
</template>
