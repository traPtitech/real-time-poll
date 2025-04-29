import { ref } from "vue";
import { apiClient } from "./api";

// User service class
class UserService {
  // Reactive user name
  public userName = ref<string>("");

  // Reactive user ID (will be the same as userName for simplicity)
  public userId = ref<string>("");

  constructor() {
    // Fetch user info from API
    this.fetchUserInfo();
  }

  // Fetch user info from API
  private async fetchUserInfo(): Promise<void> {
    try {
      const userInfo = await apiClient.getMe();
      this.userName.value = userInfo.name;
      // Use the name as the ID as well for simplicity
      this.userId.value = userInfo.name;
    } catch (error) {
      console.error("Error fetching user info:", error);
      // Set default values in case of error
      this.userName.value = "User";
      this.userId.value = "User";
    }
  }

  // Refresh user info from API
  public async refreshUserInfo(): Promise<void> {
    await this.fetchUserInfo();
  }
}

// Create and export a singleton instance
export const userService = new UserService();
