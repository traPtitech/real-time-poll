<script setup lang="ts">
import { onMounted } from 'vue'
import PollList from '../components/PollList.vue'
import CreatePollForm from '../components/CreatePollForm.vue'
import { wsClient } from '../services/websocket'
import { userService } from '../services/user'

// Connect to WebSocket on component mount
onMounted(() => {
  wsClient.connect()
})
</script>

<template>
  <main class="container mx-auto px-4 py-8">
    <div
      class="grid grid-cols-1 gap-8"
      :class="userService.isExecutive.value ? 'md:grid-cols-2' : ''"
    >
      <!-- 作成フォーム (役員会メンバーのみ) -->
      <div v-if="userService.isExecutive.value" class="order-2 md:order-1">
        <CreatePollForm />
      </div>

      <!-- Poll List -->
      <div :class="userService.isExecutive.value ? 'order-1 md:order-2' : ''">
        <h2 class="text-2xl font-bold mb-4">作成済みの投票</h2>
        <PollList />
      </div>
    </div>
  </main>
</template>
