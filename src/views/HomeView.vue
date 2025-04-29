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
      <!-- Create Poll Form -->
      <div>
        <CreatePollForm />
      </div>

      <!-- Poll List -->
      <div>
        <h2 class="text-2xl font-bold mb-4">Available Polls</h2>
        <PollList />
      </div>
    </div>
  </main>
</template>
