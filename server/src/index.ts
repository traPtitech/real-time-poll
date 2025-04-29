import { Hono } from "hono";
import { createBunWebSocket } from "hono/bun";
import type { ServerWebSocket } from "bun";
import { InMemoryDatabase } from "./database";
import { Poll } from "./domain";
import { cors } from "hono/cors";
import {
  isAddVoteMessage,
  isGetPollMessage,
  isGetPollsMessage,
  isRemoveVoteMessage,
  WebSocketMessageType,
} from "./event";
import { WSContext } from "hono/ws";

const { upgradeWebSocket, websocket } = createBunWebSocket<ServerWebSocket>();

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

// WebSocket connection for real-time updates
app.get(
  "/ws",
  upgradeWebSocket((c) => {
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
            const voters = await db.getVotes(messageData.data.pollId);
            if (voters.includes(messageData.data.userId)) {
              return ws.send(
                JSON.stringify({
                  type: WebSocketMessageType.ERROR,
                  message: "User has already voted for this option",
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
        wsClients.push(ws);
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
  }),
);

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
    return c.json(updatedPoll);
  } catch (error) {
    console.error("Error updating poll:", error);
    return c.json({ error: "Failed to update poll" }, 500);
  }
});

// Get current user information
app.get("me", async (c) => {
  try {
    // Get the X-Forwarded-User header or use "cp20" as fallback
    const name = c.req.header("X-Forwarded-User") || "cp20";

    return c.json({ name });
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

    await db.addVote(id, body.optionIndex, body.userId);

    // Return the updated poll
    const updatedPoll = await db.getPoll(id);
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

    // Return the updated poll
    const updatedPoll = await db.getPoll(id);
    return c.json(updatedPoll);
  } catch (error) {
    console.error("Error removing vote:", error);
    return c.json({ error: "Failed to remove vote" }, 500);
  }
});

export default {
  fetch: app.fetch,
  websocket,
};
