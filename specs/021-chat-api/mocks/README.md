# Spec 021 "Show it": the chat API's shapes and states

These are the shapes the API will send, for Gate 1. The values are examples. The chat window that shows them is slice 4.3.

## 1. Getting a challenge

```http
GET /challenge
Origin: https://bradthome--next-abc123.web.app
```

```json
200 OK
Access-Control-Allow-Origin: https://bradthome--next-abc123.web.app
Cache-Control: no-store

{
  "parameters": { "algorithm": "PBKDF2/SHA-256", "nonce": "…", "salt": "…", "cost": 5000, "keyLength": 32, "expiresAt": 1762560300 },
  "signature": "…"
}
```

The browser solves it with ALTCHA's worker, served from the site itself, in about a second on a phone.

## 2. Asking

```http
POST /chat
Origin: https://bradthome--next-abc123.web.app
Content-Type: application/json

{
  "altcha": "eyJjaGFsbGVuZ2UiOnsi…",
  "messages": [
    { "id": "m1", "role": "user", "parts": [{ "type": "text", "text": "What did Brad build at Hopper?" }] }
  ]
}
```

`messages` is the AI SDK's UI message list, so 4.3's `useChat` sends it as is: at most 10, the last one the visitor's.

## 3. An answer

Server-sent events, the AI SDK's UI message stream, shortened:

```text
data: {"type":"start","messageId":"a1"}
data: {"type":"text-start","id":"t1"}
data: {"type":"text-delta","id":"t1","delta":"At Hopper, Brad launched Capital One Travel's first post-booking Disruption Assistance purchase flow"}
data: {"type":"text-delta","id":"t1","delta":", as its sole engineering owner, and 5 more partners adopted it."}
data: {"type":"text-end","id":"t1"}
data: {"type":"source-url","sourceId":"hopper-disruption-assistance-1","url":"https://bradthome.com/#receipt-hopper-disruption-assistance-1","title":"Résumé · Hopper, Disruption Assistance"}
data: {"type":"data-meta","data":{"state":"answered","model":"claude-haiku-5-5","inputTokens":214,"cacheReadTokens":11873,"cacheWriteTokens":0,"outputTokens":96,"ms":1840}}
data: {"type":"finish"}
data: [DONE]
```

Every `source-url` is a corpus ID, checked in code. A cited ID the corpus doesn't have is dropped.

### No source

The model says the fixed sentence, and `state` is `no-source`:

> The site doesn't cover that. You could ask Brad at brad@bradthome.com.

### A boundary

Salary, start dates and promises, and anything not about Brad's work, get a fixed reply, and `state` is `boundary`:

> That's one to ask Brad directly, at brad@bradthome.com.

> This chat only answers questions about Brad's work, from the site.

## 4. Each refusal

Every refusal is JSON, and no model is called.

| When | Status | Body |
| --- | --- | --- |
| bradthome.com, another site, or no `Origin` | 403 | `{"state":"origin","message":"This chat isn't available here yet."}` (no CORS header, so the browser sees a network error) |
| A malformed or oversized body | 400 | `{"state":"invalid","message":"That question couldn't be read. Try a shorter one."}` |
| No ALTCHA solution, a wrong, expired or reused one | 403 | `{"state":"altcha","message":"The check didn't pass. Try again."}` |
| The visitor's 20 questions today are used | 429 | `{"state":"limit","message":"That's today's 20 questions.","resetsAt":"2026-11-09T00:00:00Z"}` |
| Today's spend reached $2.50 | 503 | `{"state":"paused","scope":"day","message":"The chat is resting until tomorrow.","resetsAt":"2026-11-09T00:00:00Z"}` |
| This month's spend reached $20 | 503 | `{"state":"paused","scope":"month","message":"The chat is resting until next month.","resetsAt":"2026-12-01T00:00:00Z"}` |
| The spend totals can't be read | 503 | `{"state":"paused","scope":"unknown","message":"The chat is resting for now."}` |
| The model fails mid-answer | 200, then an error part | `data: {"type":"error","errorText":"failed"}` |

4.3 turns each into its designed state (D173): the limit with links to the résumé and email, paused with the PDF and email, failed with Try again.

## 5. A log line

One per question, answered or refused, to Cloud Logging, kept 30 days:

```json
{"severity":"INFO","event":"chat.answer","state":"answered","model":"claude-haiku-5-5","inputTokens":214,"cacheReadTokens":11873,"cacheWriteTokens":0,"outputTokens":96,"costUsd":0.000188,"ms":1840,"sources":["hopper-disruption-assistance-1"],"droppedSources":0}
```

```json
{"severity":"INFO","event":"chat.answer","state":"limit","model":"claude-haiku-5-5","inputTokens":0,"cacheReadTokens":0,"cacheWriteTokens":0,"outputTokens":0,"costUsd":0,"ms":3,"sources":[],"droppedSources":0}
```

No question, no answer, no address, no daily code. Cloud Run's own request logs for the service, which would hold the address, are excluded by a Logging rule.

## 6. The spend documents

Firestore, `chat-spend/day-2026-11-08` and `chat-spend/month-2026-11`:

```json
{ "usd": 0.0412, "answers": 87 }
```

## 7. The privacy note's chat section

**The chat, Ask about Brad**

The chat isn't on bradthome.com yet. When it is:

- It answers questions about Brad from the site's public facts. Your question, and the conversation so far, go to Anthropic, whose Claude model writes the answer. Anthropic doesn't train its models on them.
- The site doesn't store what you type or the answers.
- For each answer it logs numbers only: the tokens used and their cost, the time taken, the model, the sources cited, and whether it declined and why. Google Cloud keeps those lines for 30 days.
- Each visitor can ask 20 questions a day. To count them, the chat turns your network address into a one-way code that changes every day, and keeps it in memory only. Your address isn't stored.
- Before a question is sent, your browser solves a small puzzle, ALTCHA, that slows bots down. It runs on this site and sets no cookies.
