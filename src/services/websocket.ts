import { computed, ref } from "vue";
import { WebSocketMessageType } from "../../server/src/event";
import type { Poll } from "../../server/src/domain";

// Connection status
export enum ConnectionStatus {
  DISCONNECTED = "disconnected",
  CONNECTING = "connecting",
  CONNECTED = "connected",
  ERROR = "error",
}

const protocol = location.protocol === "https:" ? "wss:" : "ws:";
const defaultUrl = protocol + "//" + location.host + "/api/ws";

// WebSocket client class
class WebSocketClient {
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: number | null = null;

  // Reactive state
  public status = ref<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  public error = ref<string | null>(null);
  public polls = ref<Poll[]>([]);
  public currentPoll = ref<Poll | null>(null);

  // Computed properties
  public isConnected = computed(() =>
    this.status.value === ConnectionStatus.CONNECTED
  );

  // Connect to WebSocket server
  public connect(url: string = defaultUrl): void {
    if (this.socket && this.isConnected.value) {
      return;
    }

    this.status.value = ConnectionStatus.CONNECTING;
    this.error.value = null;

    try {
      this.socket = new WebSocket(url);

      this.socket.onopen = this.handleOpen.bind(this);
      this.socket.onmessage = this.handleMessage.bind(this);
      this.socket.onclose = this.handleClose.bind(this);
      this.socket.onerror = this.handleError.bind(this);
    } catch (err) {
      this.handleError(err);
    }
  }

  // Disconnect from WebSocket server
  public disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.status.value = ConnectionStatus.DISCONNECTED;
  }

  // Send message to WebSocket server
  public send(message: object): void {
    if (!this.socket || !this.isConnected.value) {
      console.error("Cannot send message: WebSocket not connected");
      return;
    }

    this.socket.send(JSON.stringify(message));
  }

  // Get all polls
  public getPolls(): void {
    this.send({
      type: WebSocketMessageType.GET_POLLS,
    });
  }

  // Get a specific poll
  public getPoll(id: string): void {
    this.send({
      type: WebSocketMessageType.GET_POLL,
      data: { id },
    });
  }

  // Add a vote to a poll option
  public addVote(pollId: string, optionIndex: number, userId: string): void {
    this.send({
      type: WebSocketMessageType.ADD_VOTE,
      data: { pollId, optionIndex, userId },
    });
  }

  // Remove a vote from a poll option
  public removeVote(pollId: string, optionIndex: number, userId: string): void {
    this.send({
      type: WebSocketMessageType.REMOVE_VOTE,
      data: { pollId, optionIndex, userId },
    });
  }

  // Handle WebSocket open event
  private handleOpen(): void {
    this.status.value = ConnectionStatus.CONNECTED;
    this.reconnectAttempts = 0;

    // Get all polls when connected
    this.getPolls();
  }

  // Handle WebSocket message event
  private handleMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case WebSocketMessageType.POLLS:
          this.polls.value = message.data;
          break;

        case WebSocketMessageType.POLL:
          this.currentPoll.value = message.data;
          break;

        case WebSocketMessageType.POLL_UPDATED:
          this.handlePollUpdated(message.data);
          break;

        case WebSocketMessageType.ERROR:
          console.error("WebSocket error:", message.message);
          this.error.value = message.message;
          break;

        default:
          console.warn("Unknown message type:", message.type);
      }
    } catch (err) {
      console.error("Error parsing WebSocket message:", err);
    }
  }

  // Handle poll updated event
  private handlePollUpdated(updatedPoll: Poll): void {
    // Update current poll if it's the one that was updated
    if (
      !this.currentPoll.value || this.currentPoll.value.id === updatedPoll.id
    ) {
      this.currentPoll.value = updatedPoll;
    }

    // Update poll in polls list
    const index = this.polls.value.findIndex((poll) =>
      poll.id === updatedPoll.id
    );
    if (index !== -1) {
      this.polls.value[index] = updatedPoll;
    }
  }

  // Handle WebSocket close event
  private handleClose(event: CloseEvent): void {
    this.socket = null;
    this.status.value = ConnectionStatus.DISCONNECTED;

    // Attempt to reconnect if not a normal closure
    if (
      event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts
    ) {
      this.attemptReconnect();
    }
  }

  // Handle WebSocket error event
  private handleError(event: Event | Error | unknown): void {
    console.error("WebSocket error:", event);
    this.error.value = "Connection error";
    this.status.value = ConnectionStatus.ERROR;

    // Attempt to reconnect
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.attemptReconnect();
    }
  }

  // Attempt to reconnect to WebSocket server
  private attemptReconnect(): void {
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

    this.reconnectTimeout = window.setTimeout(() => {
      this.connect();
    }, delay);
  }
}

// Create and export a singleton instance
export const wsClient = new WebSocketClient();
