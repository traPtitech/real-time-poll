export interface PollOption {
  id: string;
  // 選択肢のテキスト
  text: string;
  votes: string[];
}

export interface Poll {
  id: string;
  title: string;
  description: string;
  options: PollOption[];
  createdAt: string;
}
