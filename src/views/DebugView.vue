<script setup lang="ts">
import { onMounted, ref } from 'vue'
import PollDetail from '../components/PollDetail.vue'
import PollList from '../components/PollList.vue'
import CreatePollForm from '../components/CreatePollForm.vue'
import { wsClient } from '../services/websocket'
import { userService } from '../services/user'

// Active component
const activeComponent = ref<'list' | 'detail' | 'create'>('list')
const testPollId = ref('')

// Connect to WebSocket on component mount
onMounted(() => {
  wsClient.connect()
})
</script>

<template>
  <main class="container mx-auto px-4 py-8">
    <div class="bg-white rounded-lg shadow-md p-6 mb-8">
      <h1 class="text-2xl font-bold mb-4">Debug View</h1>

      <!-- Debug Controls -->
      <div class="flex flex-wrap gap-4 mb-6">
        <button
          @click="activeComponent = 'list'"
          class="px-4 py-2 rounded-md"
          :class="activeComponent === 'list' ? 'bg-blue-500 text-white' : 'bg-gray-200'"
        >
          Poll List
        </button>

        <button
          @click="activeComponent = 'detail'"
          class="px-4 py-2 rounded-md"
          :class="activeComponent === 'detail' ? 'bg-blue-500 text-white' : 'bg-gray-200'"
        >
          Poll Detail
        </button>

        <button
          @click="activeComponent = 'create'"
          class="px-4 py-2 rounded-md"
          :class="activeComponent === 'create' ? 'bg-blue-500 text-white' : 'bg-gray-200'"
        >
          Create Poll
        </button>
      </div>

      <!-- WebSocket Status -->
      <div class="mb-6">
        <h2 class="text-lg font-bold mb-2">WebSocket Status</h2>
        <div class="flex items-center gap-2">
          <div
            class="w-3 h-3 rounded-full"
            :class="{
              'bg-green-500': wsClient.status.value === 'connected',
              'bg-yellow-500': wsClient.status.value === 'connecting',
              'bg-red-500':
                wsClient.status.value === 'disconnected' || wsClient.status.value === 'error',
            }"
          ></div>
          <span>{{ wsClient.status.value }}</span>

          <button
            v-if="wsClient.status.value !== 'connected'"
            @click="wsClient.connect()"
            class="ml-4 px-3 py-1 bg-blue-500 text-white text-sm rounded-md"
          >
            Connect
          </button>

          <button
            v-else
            @click="wsClient.disconnect()"
            class="ml-4 px-3 py-1 bg-gray-500 text-white text-sm rounded-md"
          >
            Disconnect
          </button>
        </div>

        <div v-if="wsClient.error.value" class="mt-2 text-red-500">
          Error: {{ wsClient.error.value }}
        </div>
      </div>

      <!-- User Information -->
      <div class="mb-6">
        <h2 class="text-lg font-bold mb-2">User Information</h2>
        <div class="mb-2">
          <span class="font-semibold">Name:</span>
          <div class="font-mono bg-gray-100 p-2 rounded mb-2">
            {{ userService.userName.value }}
          </div>
          <button
            @click="userService.refreshUserInfo()"
            class="px-3 py-1 bg-blue-500 text-white text-sm rounded-md"
          >
            Refresh User Info
          </button>
        </div>
        <div class="mt-4">
          <span class="font-semibold">ID:</span>
          <div class="font-mono bg-gray-100 p-2 rounded">
            {{ userService.userId.value }}
          </div>
        </div>
      </div>

      <!-- Poll ID Input (for detail view) -->
      <div v-if="activeComponent === 'detail'" class="mb-6">
        <h2 class="text-lg font-bold mb-2">Poll ID</h2>
        <div class="flex gap-2">
          <input
            v-model="testPollId"
            type="text"
            placeholder="Enter poll ID"
            class="flex-grow px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
      </div>
    </div>

    <!-- Component Display -->
    <div class="bg-white rounded-lg shadow-md p-6">
      <PollList v-if="activeComponent === 'list'" />
      <PollDetail v-else-if="activeComponent === 'detail' && testPollId" :poll-id="testPollId" />
      <div v-else-if="activeComponent === 'detail'" class="text-center py-8 text-gray-500">
        Enter a poll ID above to view a specific poll
      </div>
      <CreatePollForm v-else-if="activeComponent === 'create'" />
    </div>
  </main>
</template>
