import { Poll } from "./domain";

export interface Database {
  getPolls: () => Promise<Poll[]>;
  getPoll: (id: string) => Promise<Poll | null>;
  createPoll: (poll: Poll) => Promise<void>;
  updatePoll: (id: string, poll: Poll) => Promise<void>;
  deletePoll: (id: string) => Promise<void>;
  addVote: (
    pollId: string,
    optionIndex: number,
    userId: string,
  ) => Promise<void>;
  removeVote: (
    pollId: string,
    optionIndex: number,
    userId: string,
  ) => Promise<void>;
  getVotes: (pollId: string, optionIndex: number) => Promise<string[]>;
}

export class InMemoryDatabase implements Database {
  private polls: Poll[] = [];

  async getPolls(): Promise<Poll[]> {
    return this.polls;
  }

  async getPoll(id: string): Promise<Poll | null> {
    return this.polls.find((poll) => poll.id === id) || null;
  }
  async createPoll(poll: Poll): Promise<void> {
    this.polls.push(poll);
  }
  async updatePoll(id: string, poll: Poll): Promise<void> {
    const index = this.polls.findIndex((p) => p.id === id);
    if (index !== -1) {
      this.polls[index] = poll;
    }
  }
  async deletePoll(id: string): Promise<void> {
    this.polls = this.polls.filter((poll) => poll.id !== id);
  }
  async addVote(
    pollId: string,
    optionIndex: number,
    userId: string,
  ): Promise<void> {
    const poll = await this.getPoll(pollId);
    if (poll) {
      const option = poll.options[optionIndex];
      if (option) {
        option.votes.push(userId);
      }
    }
  }
  async removeVote(
    pollId: string,
    optionIndex: number,
    userId: string,
  ): Promise<void> {
    const poll = await this.getPoll(pollId);
    if (poll) {
      const option = poll.options[optionIndex];
      if (option) {
        option.votes = option.votes.filter((vote) => vote !== userId);
      }
    }
  }
  async getVotes(pollId: string, optionIndex?: number): Promise<string[]> {
    const poll = await this.getPoll(pollId);
    if (poll) {
      if (optionIndex === undefined) {
        return poll.options.flatMap((option) => option.votes);
      }
      const option = poll.options[optionIndex];
      if (option) {
        return option.votes;
      }
    }
    return [];
  }
}
