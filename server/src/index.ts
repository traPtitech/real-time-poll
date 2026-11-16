import { Hono } from "hono";
import { createBunWebSocket } from "hono/bun";
import type { ServerWebSocket } from "bun";
import { InMemoryDatabase } from "./database";
import { Poll } from "./domain";
import { cors } from "hono/cors";
import { createMiddleware } from "hono/factory";
import { getExecutiveInfo, isEnforcementEnabled } from "./traq";
import {
  isAddVoteMessage,
  isGetPollMessage,
  isGetPollsMessage,
  isRemoveVoteMessage,
  WebSocketMessageType,
} from "./event";
import { WSContext } from "hono/ws";

const { upgradeWebSocket, websocket } = createBunWebSocket<ServerWebSocket>();

const EXECUTIVE_ONLY_MESSAGE =
  "このサービスは役員会メンバーのみ利用できます。";

// リクエストユーザー名を取得する
// アクセス制限が有効な場合 (トークン設定済み) は、信頼できるヘッダーがないユーザーを拒否する
const getUserNameFromHeader = (header: string | undefined): string => {
  if (header) return header;
  return isEnforcementEnabled ? "" : "cp20";
};

const app = new Hono();
const db = new InMemoryDatabase();

// Enable CORS
app.use("*", cors());

const wsClients: WSContext<ServerWebSocket>[] = [];
const notifyAllClients = (message: string) => {
  for (const ws of wsClients) {
    ws.send(message);
  }
};

// 役員会メンバーのみアクセスできるミドルウェア
const executiveOnly = createMiddleware(async (c, next) => {
  const username = getUserNameFromHeader(c.req.header("X-Forwarded-User"));
  try {
    const info = await getExecutiveInfo(username);
    if (!info.isExecutive) {
      return c.json({ error: EXECUTIVE_ONLY_MESSAGE }, 403);
    }
  } catch (error) {
    console.error("Failed to verify executive status:", error);
    // traQ API の障害時は安全側に倒して拒否する
    return c.json({ error: "アクセス権限の確認に失敗しました。" }, 503);
  }
  await next();
});

// 投票の閲覧・作成・編集・投票操作はすべて役員会メンバー限定
app.use("polls", executiveOnly);
app.use("polls/*", executiveOnly);

// WebSocket connection for real-time updates
// 本番は Caddy が /api プレフィックスを除去して /ws で届く。
// ローカル開発では Vite が /api/ws の WebSocket をそのまま転送するため、両方のパスで受け付ける。
const wsUpgrade = upgradeWebSocket((c) => {
    // WebSocket接続ユーザーの名前 (X-Forwarded-User は認証プロキシによって設定される)
    const username = getUserNameFromHeader(c.req.header("X-Forwarded-User"));

    // 役員会メンバーでなければ接続を切断する
    const rejectIfNotExecutive = async (ws: WSContext<ServerWebSocket>) => {
      try {
        const info = await getExecutiveInfo(username);
        if (!info.isExecutive) {
          ws.send(
            JSON.stringify({
              type: WebSocketMessageType.ERROR,
              message: EXECUTIVE_ONLY_MESSAGE,
            }),
          );
          ws.close();
          return false;
        }
      } catch (error) {
        console.error("Failed to verify executive status:", error);
        ws.close();
        return false;
      }
      return true;
    };

    return {
      onMessage: async (event, ws) => {
        try {
          const messageData = JSON.parse(event.data.toString());

          // Use type guards to handle different message types
          if (isGetPollsMessage(messageData)) {
            const polls = await db.getPolls();
            ws.send(JSON.stringify({
              type: WebSocketMessageType.POLLS,
              data: polls,
            }));
          } else if (isGetPollMessage(messageData)) {
            const poll = await db.getPoll(messageData.data.id);
            ws.send(JSON.stringify({
              type: WebSocketMessageType.POLL,
              data: poll,
            }));
          } else if (isAddVoteMessage(messageData)) {
            if (!(await rejectIfNotExecutive(ws))) {
              return;
            }
            const voters = await db.getVotes(
              messageData.data.pollId,
              messageData.data.optionIndex,
            );
            if (voters.includes(messageData.data.userId)) {
              return ws.send(
                JSON.stringify({
                  type: WebSocketMessageType.ERROR,
                  message: "この選択肢にはすでに投票済みです",
                }),
              );
            }
            await db.addVote(
              messageData.data.pollId,
              messageData.data.optionIndex,
              messageData.data.userId,
            );
            // Broadcast updated poll to all clients
            const updatedPoll = await db.getPoll(messageData.data.pollId);
            notifyAllClients(
              JSON.stringify({
                type: WebSocketMessageType.POLL_UPDATED,
                data: updatedPoll,
              }),
            );
          } else if (isRemoveVoteMessage(messageData)) {
            if (!(await rejectIfNotExecutive(ws))) {
              return;
            }
            await db.removeVote(
              messageData.data.pollId,
              messageData.data.optionIndex,
              messageData.data.userId,
            );
            // Broadcast updated poll to all clients
            const pollAfterRemove = await db.getPoll(messageData.data.pollId);
            notifyAllClients(
              JSON.stringify({
                type: WebSocketMessageType.POLL_UPDATED,
                data: pollAfterRemove,
              }),
            );
          } else {
            ws.send(
              JSON.stringify({
                type: WebSocketMessageType.ERROR,
                message: "Unknown message type",
              }),
            );
          }
        } catch (error) {
          console.error("WebSocket error:", error);
          ws.send(
            JSON.stringify({
              type: WebSocketMessageType.ERROR,
              message: "Invalid request",
            }),
          );
        }
      },
      onOpen: (event, ws) => {
        void rejectIfNotExecutive(ws).then((allowed) => {
          if (allowed) {
            wsClients.push(ws);
          }
        });
      },
      onClose: (event, ws) => {
        const index = wsClients.indexOf(ws);
        if (index !== -1) {
          wsClients.splice(index, 1);
        }
      },
      onError: (ws, error) => {
        console.error("WebSocket error:", error);
      },
    };
});

app.get("/ws", wsUpgrade);
app.get("/api/ws", wsUpgrade);

// REST API endpoints
// Get all polls
app.get("polls", async (c) => {
  try {
    const polls = await db.getPolls();
    return c.json(polls);
  } catch (error) {
    console.error("Error getting polls:", error);
    return c.json({ error: "Failed to get polls" }, 500);
  }
});

// Get a specific poll
app.get("polls/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const poll = await db.getPoll(id);

    if (!poll) {
      return c.json({ error: "Poll not found" }, 404);
    }

    return c.json(poll);
  } catch (error) {
    console.error("Error getting poll:", error);
    return c.json({ error: "Failed to get poll" }, 500);
  }
});

// Create a new poll
app.post("polls", async (c) => {
  try {
    const body = await c.req.json();

    // Validate required fields
    if (!body.title || !body.options || body.options.length < 2) {
      return c.json({
        error: "Invalid poll data. Title and at least 2 options are required.",
      }, 400);
    }

    const poll: Poll = {
      id: crypto.randomUUID(),
      title: body.title,
      description: body.description || "",
      options: body.options.map((option: string) => ({
        id: crypto.randomUUID(),
        text: option,
        votes: [],
      })),
      createdAt: new Date().toISOString(),
    };

    await db.createPoll(poll);

    // Broadcast updated polls list to all clients
    notifyAllClients(
      JSON.stringify({
        type: WebSocketMessageType.POLLS,
        data: await db.getPolls(),
      }),
    );

    return c.json(poll, 201);
  } catch (error) {
    console.error("Error creating poll:", error);
    return c.json({ error: "Failed to create poll" }, 500);
  }
});

// Update a poll
app.put("polls/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();

    const existingPoll = await db.getPoll(id);
    if (!existingPoll) {
      return c.json({ error: "Poll not found" }, 404);
    }

    // Update poll properties while preserving votes
    const updatedPoll: Poll = {
      ...existingPoll,
      title: body.title || existingPoll.title,
      description: body.description || existingPoll.description,
      // If options are provided, update them while preserving votes for unchanged options
      options: body.options
        ? body.options.map(
          (option: { id?: string; text: string }, index: number) => {
            // If this is an existing option, preserve its votes
            if (
              existingPoll.options[index] &&
              option.id === existingPoll.options[index].id
            ) {
              return {
                ...existingPoll.options[index],
                text: option.text || existingPoll.options[index].text,
              };
            }
            // Otherwise create a new option
            return {
              id: option.id || crypto.randomUUID(),
              text: option.text,
              votes: [],
            };
          },
        )
        : existingPoll.options,
    };

    await db.updatePoll(id, updatedPoll);

    // Broadcast updated poll to all clients
    notifyAllClients(
      JSON.stringify({
        type: WebSocketMessageType.POLL_UPDATED,
        data: updatedPoll,
      }),
    );

    return c.json(updatedPoll);
  } catch (error) {
    console.error("Error updating poll:", error);
    return c.json({ error: "Failed to update poll" }, 500);
  }
});

// Get current user information
app.get("me", async (c) => {
  try {
    // Get the X-Forwarded-User header
    const name = getUserNameFromHeader(c.req.header("X-Forwarded-User"));

    const info = await getExecutiveInfo(name);

    return c.json({
      name: name || "unknown",
      isExecutive: info.isExecutive,
      // 役員グループに登録されているメンバー数 (取得できない場合は 0)
      executiveTotal: info.total,
    });
  } catch (error) {
    console.error("Error getting user info:", error);
    return c.json({ error: "Failed to get user info" }, 500);
  }
});

// Delete a poll
app.delete("polls/:id", async (c) => {
  try {
    const id = c.req.param("id");

    const existingPoll = await db.getPoll(id);
    if (!existingPoll) {
      return c.json({ error: "Poll not found" }, 404);
    }

    await db.deletePoll(id);

    // Broadcast updated polls list to all clients
    notifyAllClients(
      JSON.stringify({
        type: WebSocketMessageType.POLLS,
        data: await db.getPolls(),
      }),
    );

    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting poll:", error);
    return c.json({ error: "Failed to delete poll" }, 500);
  }
});

// Add a vote to a poll option
app.post("polls/:id/vote", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();

    if (typeof body.optionIndex !== "number" || !body.userId) {
      return c.json({ error: "Option index and user ID are required" }, 400);
    }

    const poll = await db.getPoll(id);
    if (!poll) {
      return c.json({ error: "Poll not found" }, 404);
    }

    if (body.optionIndex < 0 || body.optionIndex >= poll.options.length) {
      return c.json({ error: "Invalid option index" }, 400);
    }

    // すでに同じ選択肢に投票済みの場合は拒否する
    const voters = await db.getVotes(id, body.optionIndex);
    if (voters.includes(body.userId)) {
      return c.json({ error: "この選択肢にはすでに投票済みです" }, 409);
    }

    await db.addVote(id, body.optionIndex, body.userId);

    // Broadcast updated poll to all clients
    const updatedPoll = await db.getPoll(id);
    if (updatedPoll) {
      notifyAllClients(
        JSON.stringify({
          type: WebSocketMessageType.POLL_UPDATED,
          data: updatedPoll,
        }),
      );
    }

    return c.json(updatedPoll);
  } catch (error) {
    console.error("Error adding vote:", error);
    return c.json({ error: "Failed to add vote" }, 500);
  }
});

// Remove a vote from a poll option
app.delete("polls/:id/vote", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();

    if (typeof body.optionIndex !== "number" || !body.userId) {
      return c.json({ error: "Option index and user ID are required" }, 400);
    }

    const poll = await db.getPoll(id);
    if (!poll) {
      return c.json({ error: "Poll not found" }, 404);
    }

    if (body.optionIndex < 0 || body.optionIndex >= poll.options.length) {
      return c.json({ error: "Invalid option index" }, 400);
    }

    await db.removeVote(id, body.optionIndex, body.userId);

    // Broadcast updated poll to all clients
    const pollAfterRemove = await db.getPoll(id);
    if (pollAfterRemove) {
      notifyAllClients(
        JSON.stringify({
          type: WebSocketMessageType.POLL_UPDATED,
          data: pollAfterRemove,
        }),
      );
    }

    return c.json(pollAfterRemove);
  } catch (error) {
    console.error("Error removing vote:", error);
    return c.json({ error: "Failed to remove vote" }, 500);
  }
});

export default {
  fetch: app.fetch,
  websocket,
};
