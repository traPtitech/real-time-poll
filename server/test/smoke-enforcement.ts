// モック traQ API + real-time-poll サーバーの動作確認スクリプト
import { serve } from "bun";
import { spawn } from "node:child_process";

const group = {
  id: "g-1",
  name: "executive26",
  type: "user",
  members: [
    { id: "u-1", role: "member" },
    { id: "u-2", role: "member" },
  ],
};

// モック traQ API (ポート 9999)
const mock = serve({
  port: 9999,
  async fetch(req) {
    const url = new URL(req.url);
    if (req.method !== "GET") return new Response("ng", { status: 405 });
    if (!req.headers.get("authorization")) {
      return new Response("unauthorized", { status: 401 });
    }
    if (url.pathname === "/api/v3/users") {
      const name = url.searchParams.get("name");
      const users =
        name === "cp20"
          ? [{ id: "u-1", name: "cp20" }]
          : name === "other"
            ? [{ id: "u-9", name: "other" }]
            : [];
      return Response.json(users);
    }
    if (url.pathname === "/api/v3/groups") {
      return Response.json([group]);
    }
    return new Response("not found", { status: 404 });
  },
});

// 検証対象サーバー (ポート 3100、アクセス制限有効) を子プロセスで起動
const child = spawn("bun", ["src/index.ts"], {
  cwd: import.meta.dir + "/..",
  env: {
    ...process.env,
    TRAQ_API_ORIGIN: "http://localhost:9999/api/v3",
    TRAQ_API_TOKEN: "mock-token",
    EXECUTIVE_GROUP_NAME: "executive26",
    PORT: "3100",
  },
  stdio: ["ignore", "inherit", "inherit"],
});

const base = "http://localhost:3100";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// サーバー起動待ち
for (let i = 0; i < 50; i++) {
  await sleep(200);
  try {
    await fetch(`${base}/me`);
    break;
  } catch {
    /* retry */
  }
}

const post = (path: string, body: unknown) =>
  fetch(base + path, {
    method: "POST",
    headers: { "content-type": "application/json", "X-Forwarded-User": "cp20" },
    body: JSON.stringify(body),
  });

// 1) /me (役員)
const me = await fetch(`${base}/me`, { headers: { "X-Forwarded-User": "cp20" } });
console.log("me(cp20):", await me.json());

// 2) /me (役員以外)
const me2 = await fetch(`${base}/me`, {
  headers: { "X-Forwarded-User": "other" },
});
console.log("me(other):", await me2.json());

// 3) /me (ヘッダーなし → 拒否)
const me3 = await fetch(`${base}/me`);
console.log("me(none):", await me3.json());

// 4) 投票作成 (役員)
const created = await post("/polls", {
  title: "テスト投票",
  description: "説明",
  options: ["賛成", "反対"],
});
const poll = await created.json();
console.log("create(cp20):", created.status, poll.id);

// 5) 投票作成 (役員以外 → 403)
const denied = await fetch(`${base}/polls`, {
  method: "POST",
  headers: { "content-type": "application/json", "X-Forwarded-User": "other" },
  body: JSON.stringify({ title: "x", options: ["a", "b"] }),
});
console.log("create(other):", denied.status, await denied.json());

// 6) 投票 (役員)
const voted = await post(`/polls/${poll.id}/vote`, {
  optionIndex: 0,
  userId: "cp20",
});
console.log("vote(cp20):", voted.status, (await voted.json()).options[0].votes);

// 7) 一覧 (役員以外 → 403)
const listDenied = await fetch(`${base}/polls`, {
  headers: { "X-Forwarded-User": "other" },
});
console.log("list(other):", listDenied.status);

// 8) ヘッダーなしで投票作成 → 403
const noHeader = await fetch(`${base}/polls`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ title: "x", options: ["a", "b"] }),
});
console.log("create(no-header):", noHeader.status);

// 9) WebSocket (役員・ヘッダー付き)
// Bun の WebSocket クライアントは第2引数にオプションオブジェクトを渡せる
type HeaderWebSocket = new (
  url: string,
  options: { headers: Record<string, string> },
) => WebSocket;
const HeaderWS = WebSocket as unknown as HeaderWebSocket;

const ws = new HeaderWS(`ws://localhost:3100/ws`, {
  headers: { "X-Forwarded-User": "cp20" },
});
const wsResult = await new Promise<string>((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error("ws timeout")), 5000);
  ws.onopen = () => ws.send(JSON.stringify({ type: "GET_POLLS" }));
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.type === "POLLS") {
      clearTimeout(timer);
      resolve(`POLLS(${m.data.length}件)`);
    } else if (m.type === "ERROR") {
      clearTimeout(timer);
      resolve(`ERROR: ${m.message}`);
    }
  };
  ws.onclose = () => resolve("closed");
});
console.log("ws(cp20):", wsResult);
ws.close();

// 10) WebSocket (役員以外 → 切断される)
const ws2 = new HeaderWS(`ws://localhost:3100/ws`, {
  headers: { "X-Forwarded-User": "other" },
});
const ws2result = await new Promise<string>((resolve) => {
  const timer = setTimeout(() => resolve("no-message"), 5000);
  ws2.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.type === "ERROR") {
      clearTimeout(timer);
      resolve(`ERROR: ${m.message}`);
    }
  };
  ws2.onclose = () => resolve("closed");
});
console.log("ws(other):", ws2result);
ws2.close();

mock.stop(true);
child.kill();
process.exit(0);
