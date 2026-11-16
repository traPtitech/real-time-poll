<script setup lang="ts">
import { onMounted } from 'vue'
import PollList from '../components/PollList.vue'
import CreatePollForm from '../components/CreatePollForm.vue'
import { wsClient } from '../services/websocket'

// Connect to WebSocket on component mount
onMounted(() => {
  wsClient.connect()
})
</script>

<template>
  <main class="container mx-auto px-4 py-8">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
      <!-- Poll List (モバイルでは先頭に表示) -->
      <div class="order-2 md:order-1">
        <CreatePollForm />
      </div>

      <!-- Poll List -->
      <div class="order-1 md:order-2">
        <h2 class="text-2xl font-bold mb-4">作成済みの投票</h2>
        <PollList />
      </div>
    </div>
  </main>
</template>
