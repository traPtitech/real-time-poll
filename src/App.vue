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

  <!-- アプリ本体 (閲覧は全ユーザー可、投票・作成・編集は役員会メンバーのみ) -->
  <template v-else>
    <div class="container mx-auto px-4 pt-4 flex flex-col gap-2">
      <!-- 永続化されていないことの警告 (全ページで常時表示) -->
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

      <!-- 役員会メンバー以外は閲覧のみ -->
      <div
        v-if="!userService.isExecutive.value"
        class="alert alert-info alert-vertical sm:alert-horizontal py-3 text-sm"
        role="status"
      >
        <IconLock class="h-5 w-5 shrink-0" />
        <span>
          <strong class="font-bold">閲覧モード</strong>
          役員会メンバー以外は閲覧のみ可能です（投票・作成・編集はできません）。
          <span
            v-if="userService.userName.value"
            class="ml-1 inline-flex items-center gap-1 align-middle"
          >
            現在のユーザー:
            <img
              :src="iconUrl(userService.userName.value)"
              :alt="userService.userName.value"
              class="w-5 h-5 rounded-full border border-base-300"
            />
            <span class="font-mono font-bold">{{ userService.userName.value }}</span>
          </span>
        </span>
      </div>
    </div>

    <RouterView />
  </template>
</template>

<style scoped></style>
