<script setup lang="ts">
import { RouterView } from 'vue-router'
import { userService } from './services/user'
import { iconUrl, mockMode } from './services/mock'
import { IconAlertTriangle, IconLock, IconRefresh } from '@tabler/icons-vue'

const retryUserInfo = async () => {
  await userService.refreshUserInfo()
}
</script>

<template>
  <!-- ユーザー情報の読み込み中 -->
  <div v-if="!userService.initialized.value" class="text-center py-8">
    <span class="loading loading-spinner loading-lg text-primary"></span>
    <p class="mt-4 text-base-content/60">読み込み中…</p>
  </div>

  <!-- ユーザー情報の取得に失敗 -->
  <div v-else-if="userService.loadFailed.value" class="container mx-auto px-4 py-8">
    <div class="alert alert-error max-w-md mx-auto text-sm">
      <IconAlertTriangle class="h-5 w-5 shrink-0" />
      <span><strong>接続エラー</strong> サーバーに接続できませんでした。</span>
      <button type="button" class="btn btn-sm" @click="retryUserInfo">
        <IconRefresh class="h-4 w-4" />
        再試行
      </button>
    </div>
  </div>

  <!-- 役員会メンバー以外はアクセス不可 -->
  <div v-else-if="!userService.isExecutive.value" class="container mx-auto px-4 py-16">
    <div class="card bg-base-100 border border-base-300 max-w-md mx-auto">
      <div class="card-body items-center text-center">
        <IconLock class="h-10 w-10 text-error" />
        <h1 class="card-title">アクセス権がありません</h1>
        <p class="text-sm text-base-content/70">
          このサービスは<b>役員会メンバーのみ</b>利用できます。
        </p>
        <p
          v-if="userService.userName.value"
          class="mt-2 text-sm text-base-content/70 flex items-center gap-2"
        >
          現在のユーザー:
          <img
            :src="iconUrl(userService.userName.value)"
            :alt="userService.userName.value"
            class="w-6 h-6 rounded-full border border-base-300"
          />
          <span class="font-mono font-bold text-base-content">{{
            userService.userName.value
          }}</span>
        </p>
      </div>
    </div>
  </div>

  <!-- アプリ本体 -->
  <template v-else>
    <!-- 永続化されていないことの警告 (全ページで常時表示) -->
    <div class="container mx-auto px-4 pt-4">
      <div class="alert alert-warning alert-vertical sm:alert-horizontal py-3 text-sm" role="alert">
        <IconAlertTriangle class="h-5 w-5 shrink-0" />
        <span>
          <strong class="font-bold">注意: データは一切保存されません。</strong>
          投票データはサーバーのメモリ上にのみ存在するため、<strong class="font-bold underline"
            >サーバーの再起動や再デプロイで全て消去されます</strong
          >。必要な結果は随時「結果をコピー」で控えてください。
          <span
            v-if="mockMode"
            class="badge badge-info badge-sm align-middle ml-1"
            title="URL に ?mock=executive / ?mock=guest を付けるとデモデータを表示します"
            >モック表示中</span
          >
        </span>
      </div>
    </div>

    <RouterView />
  </template>
</template>

<style scoped></style>
