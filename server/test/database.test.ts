import { beforeEach, describe, expect, test } from "bun:test";
import { InMemoryDatabase } from "../src/database";
import { Poll, PollOption } from "../src/domain";

describe("InMemoryDatabase", () => {
  let db: InMemoryDatabase;
  let samplePoll: Poll;

  beforeEach(() => {
    db = new InMemoryDatabase();
    samplePoll = {
      id: "poll-1",
      title: "Favorite Programming Language",
      description: "What is your favorite programming language?",
      options: [
        { id: "option-1", text: "JavaScript", votes: [] },
        { id: "option-2", text: "TypeScript", votes: [] },
        { id: "option-3", text: "Python", votes: [] },
        { id: "option-4", text: "Rust", votes: [] },
      ],
      createdAt: new Date().toISOString(),
    };
  });

  describe("getPolls", () => {
    test("should return empty array initially", async () => {
      const polls = await db.getPolls();
      expect(polls).toEqual([]);
    });

    test("should return all polls", async () => {
      await db.createPoll(samplePoll);

      const anotherPoll: Poll = {
        id: "poll-2",
        title: "Favorite Framework",
        description: "What is your favorite framework?",
        options: [
          { id: "option-1", text: "React", votes: [] },
          { id: "option-2", text: "Vue", votes: [] },
          { id: "option-3", text: "Angular", votes: [] },
          { id: "option-4", text: "Svelte", votes: [] },
        ],
        createdAt: new Date().toISOString(),
      };

      await db.createPoll(anotherPoll);

      const polls = await db.getPolls();
      expect(polls).toHaveLength(2);
      expect(polls).toContainEqual(samplePoll);
      expect(polls).toContainEqual(anotherPoll);
    });
  });

  describe("getPoll", () => {
    test("should return null for non-existent poll", async () => {
      const poll = await db.getPoll("non-existent-id");
      expect(poll).toBeNull();
    });

    test("should return poll by id", async () => {
      await db.createPoll(samplePoll);
      const poll = await db.getPoll(samplePoll.id);
      expect(poll).toEqual(samplePoll);
    });
  });

  describe("createPoll", () => {
    test("should create a new poll", async () => {
      await db.createPoll(samplePoll);
      const polls = await db.getPolls();
      expect(polls).toHaveLength(1);
      expect(polls[0]).toEqual(samplePoll);
    });
  });

  describe("updatePoll", () => {
    test("should update an existing poll", async () => {
      await db.createPoll(samplePoll);

      const updatedPoll: Poll = {
        ...samplePoll,
        title: "Updated Title",
        description: "Updated Description",
      };

      await db.updatePoll(samplePoll.id, updatedPoll);

      const poll = await db.getPoll(samplePoll.id);
      expect(poll).toEqual(updatedPoll);
    });

    test("should do nothing for non-existent poll", async () => {
      await db.updatePoll("non-existent-id", samplePoll);
      const polls = await db.getPolls();
      expect(polls).toHaveLength(0);
    });
  });

  describe("deletePoll", () => {
    test("should delete an existing poll", async () => {
      await db.createPoll(samplePoll);
      await db.deletePoll(samplePoll.id);

      const polls = await db.getPolls();
      expect(polls).toHaveLength(0);

      const poll = await db.getPoll(samplePoll.id);
      expect(poll).toBeNull();
    });

    test("should do nothing for non-existent poll", async () => {
      await db.createPoll(samplePoll);
      await db.deletePoll("non-existent-id");

      const polls = await db.getPolls();
      expect(polls).toHaveLength(1);
    });
  });

  describe("addVote", () => {
    test("should add a vote to a poll option", async () => {
      await db.createPoll(samplePoll);

      const userId = "user-1";
      const optionIndex = 1; // TypeScript option

      await db.addVote(samplePoll.id, optionIndex, userId);

      const poll = await db.getPoll(samplePoll.id);
      expect(poll?.options[optionIndex].votes).toContain(userId);
    });

    test("should do nothing for non-existent poll", async () => {
      const userId = "user-1";
      const optionIndex = 1;

      await db.addVote("non-existent-id", optionIndex, userId);

      // No error should be thrown
      expect(true).toBe(true);
    });

    test("should do nothing for non-existent option", async () => {
      await db.createPoll(samplePoll);

      const userId = "user-1";
      const optionIndex = 10; // Non-existent option

      await db.addVote(samplePoll.id, optionIndex, userId);

      const poll = await db.getPoll(samplePoll.id);
      expect(poll).toEqual(samplePoll); // Poll should remain unchanged
    });
  });

  describe("removeVote", () => {
    test("should remove a vote from a poll option", async () => {
      await db.createPoll(samplePoll);

      const userId = "user-1";
      const optionIndex = 1; // TypeScript option

      // Add a vote first
      await db.addVote(samplePoll.id, optionIndex, userId);

      // Then remove it
      await db.removeVote(samplePoll.id, optionIndex, userId);

      const poll = await db.getPoll(samplePoll.id);
      expect(poll?.options[optionIndex].votes).not.toContain(userId);
    });

    test("should do nothing for non-existent poll", async () => {
      const userId = "user-1";
      const optionIndex = 1;

      await db.removeVote("non-existent-id", optionIndex, userId);

      // No error should be thrown
      expect(true).toBe(true);
    });

    test("should do nothing for non-existent option", async () => {
      await db.createPoll(samplePoll);

      const userId = "user-1";
      const optionIndex = 10; // Non-existent option

      await db.removeVote(samplePoll.id, optionIndex, userId);

      const poll = await db.getPoll(samplePoll.id);
      expect(poll).toEqual(samplePoll); // Poll should remain unchanged
    });

    test("should do nothing for non-existent vote", async () => {
      await db.createPoll(samplePoll);

      const userId = "user-1";
      const optionIndex = 1; // TypeScript option

      // No vote was added, so there's nothing to remove
      await db.removeVote(samplePoll.id, optionIndex, userId);

      const poll = await db.getPoll(samplePoll.id);
      expect(poll?.options[optionIndex].votes).not.toContain(userId);
    });
  });

  describe("getVotes", () => {
    test("should return votes for a poll option", async () => {
      await db.createPoll(samplePoll);

      const userId1 = "user-1";
      const userId2 = "user-2";
      const optionIndex = 1; // TypeScript option

      await db.addVote(samplePoll.id, optionIndex, userId1);
      await db.addVote(samplePoll.id, optionIndex, userId2);

      const votes = await db.getVotes(samplePoll.id, optionIndex);
      expect(votes).toHaveLength(2);
      expect(votes).toContain(userId1);
      expect(votes).toContain(userId2);
    });

    test("should return empty array for non-existent poll", async () => {
      const votes = await db.getVotes("non-existent-id", 0);
      expect(votes).toEqual([]);
    });

    test("should return empty array for non-existent option", async () => {
      await db.createPoll(samplePoll);

      const votes = await db.getVotes(samplePoll.id, 10); // Non-existent option
      expect(votes).toEqual([]);
    });
  });
});
