# server

Bun + Hono によるリアルタイム投票 API サーバー。

## 起動

```sh
bun install
bun run dev    # http://localhost:3000
```

## 環境変数

| 変数 | 既定値 | 説明 |
| --- | --- | --- |
| `TRAQ_API_TOKEN` | (なし) | traQ API トークン。設定すると役員会メンバー限定モードになる |
| `EXECUTIVE_GROUP_NAME` | `executive26` | 役員会メンバーの traQ ユーザーグループ名 |
| `TRAQ_API_ORIGIN` | `https://q.trap.jp/api/v3` | traQ API のオリジン |
| `PORT` | (Bun 既定) | 待ち受けポート |

### アクセス制限の挙動

- `TRAQ_API_TOKEN` が設定されている場合、`X-Forwarded-User` ヘッダー (認証プロキシが設定) のユーザー名を traQ API (`GET /users?name=`, `GET /groups`) で照会し、`EXECUTIVE_GROUP_NAME` グループのメンバーのみアクセスを許可する。判定結果は 60 秒キャッシュ
- 役員会メンバー以外は REST が 403、WebSocket は接続直後に切断される
- トークン未設定の場合は制限なし (ローカル開発用)。起動ログに警告が出る
- traQ API が障害中で判定できない場合は安全側に倒して拒否する (fail-closed)

## テスト

```sh
bun test    # InMemoryDatabase のユニットテスト

# アクセス制限の動作確認 (モック traQ API を PORT=9999 で立てて検証するスクリプト)
bun ./test/smoke-enforcement.ts
```
