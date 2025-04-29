import { Poll } from "./domain";

// WebSocket message types
export enum WebSocketMessageType {
  // Client -> Server
  GET_POLLS = "GET_POLLS",
  GET_POLL = "GET_POLL",
  ADD_VOTE = "ADD_VOTE",
  REMOVE_VOTE = "REMOVE_VOTE",

  // Server -> Client
  POLLS = "POLLS",
  POLL = "POLL",
  POLL_UPDATED = "POLL_UPDATED",
  ERROR = "ERROR",
}

// Base interface for all WebSocket messages
export interface WebSocketMessage {
  type: WebSocketMessageType;
}

// Client -> Server message interfaces
export interface GetPollsMessage extends WebSocketMessage {
  type: WebSocketMessageType.GET_POLLS;
}

export interface GetPollMessage extends WebSocketMessage {
  type: WebSocketMessageType.GET_POLL;
  data: {
    id: string;
  };
}

export interface AddVoteMessage extends WebSocketMessage {
  type: WebSocketMessageType.ADD_VOTE;
  data: {
    pollId: string;
    optionIndex: number;
    userId: string;
  };
}

export interface RemoveVoteMessage extends WebSocketMessage {
  type: WebSocketMessageType.REMOVE_VOTE;
  data: {
    pollId: string;
    optionIndex: number;
    userId: string;
  };
}

// Server -> Client message interfaces
export interface PollsMessage extends WebSocketMessage {
  type: WebSocketMessageType.POLLS;
  data: Poll[];
}

export interface PollMessage extends WebSocketMessage {
  type: WebSocketMessageType.POLL;
  data: Poll | null;
}

export interface PollUpdatedMessage extends WebSocketMessage {
  type: WebSocketMessageType.POLL_UPDATED;
  data: Poll;
}

export interface ErrorMessage extends WebSocketMessage {
  type: WebSocketMessageType.ERROR;
  message: string;
}

// Type guards for client messages
export function isGetPollsMessage(
  message: unknown,
): message is GetPollsMessage {
  return typeof message === "object" &&
    message !== null &&
    "type" in message &&
    message.type === WebSocketMessageType.GET_POLLS;
}

export function isGetPollMessage(message: unknown): message is GetPollMessage {
  return typeof message === "object" &&
    message !== null &&
    "type" in message &&
    message.type === WebSocketMessageType.GET_POLL &&
    "data" in message &&
    typeof message.data === "object" &&
    message.data !== null &&
    "id" in message.data &&
    typeof message.data.id === "string";
}

export function isAddVoteMessage(message: unknown): message is AddVoteMessage {
  return typeof message === "object" &&
    message !== null &&
    "type" in message &&
    message.type === WebSocketMessageType.ADD_VOTE &&
    "data" in message &&
    typeof message.data === "object" &&
    message.data !== null &&
    "pollId" in message.data &&
    typeof message.data.pollId === "string" &&
    "optionIndex" in message.data &&
    typeof message.data.optionIndex === "number" &&
    "userId" in message.data &&
    typeof message.data.userId === "string";
}

export function isRemoveVoteMessage(
  message: unknown,
): message is RemoveVoteMessage {
  return typeof message === "object" &&
    message !== null &&
    "type" in message &&
    message.type === WebSocketMessageType.REMOVE_VOTE &&
    "data" in message &&
    typeof message.data === "object" &&
    message.data !== null &&
    "pollId" in message.data &&
    typeof message.data.pollId === "string" &&
    "optionIndex" in message.data &&
    typeof message.data.optionIndex === "number" &&
    "userId" in message.data &&
    typeof message.data.userId === "string";
}
