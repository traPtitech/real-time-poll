import { ref } from 'vue'
import { apiClient } from './api'
import { mockMode, mockApi } from './mock'

// User service class
class UserService {
  // Reactive user name
  public userName = ref<string>('')

  // Reactive user ID (will be the same as userName for simplicity)
  public userId = ref<string>('')

  // 役員会メンバーかどうか (サーバーが traQ グループで判定する)
  public isExecutive = ref<boolean>(false)

  // 役員グループに登録されている全役員数 (取得できない場合は 0)
  public executiveTotal = ref<number>(0)

  // 初回ユーザー情報の取得が完了したか
  public initialized = ref<boolean>(false)

  // ユーザー情報の取得に失敗したか
  public loadFailed = ref<boolean>(false)

  constructor() {
    // 画面確認用モック (?mock= 付き URL) はサーバーにアクセスしない
    if (mockMode) {
      this.applyMockUser()
      return
    }
    // Fetch user info from API
    void this.fetchUserInfo()
  }

  // モックユーザー情報を適用する
  private applyMockUser(): void {
    const me = mockApi.getMe()
    this.userName.value = me.name
    this.userId.value = me.name
    this.isExecutive.value = me.isExecutive
    this.executiveTotal.value = me.executiveTotal
    this.initialized.value = true
    this.loadFailed.value = false
  }

  // Fetch user info from API
  private async fetchUserInfo(): Promise<void> {
    try {
      const userInfo = await apiClient.getMe()
      this.userName.value = userInfo.name
      // Use the name as the ID as well for simplicity
      this.userId.value = userInfo.name
      this.isExecutive.value = userInfo.isExecutive
      this.executiveTotal.value = userInfo.executiveTotal ?? 0
      this.loadFailed.value = false
    } catch (error) {
      console.error('Error fetching user info:', error)
      this.loadFailed.value = true
    } finally {
      this.initialized.value = true
    }
  }

  // Refresh user info from API
  public async refreshUserInfo(): Promise<void> {
    if (mockMode) {
      this.applyMockUser()
      return
    }
    this.initialized.value = false
    await this.fetchUserInfo()
  }
}

// Create and export a singleton instance
export const userService = new UserService()
