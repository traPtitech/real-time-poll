<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute } from 'vue-router'
import PollDetail from '../components/PollDetail.vue'
import { wsClient } from '../services/websocket'

const route = useRoute()
const pollId = route.params.id as string

// Connect to WebSocket on component mount
onMounted(() => {
  wsClient.connect()
})
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <PollDetail :poll-id="pollId" />
  </div>
</template>
