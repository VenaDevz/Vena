# VENA Agent — Robinhood Chain + Virtuals

**Recommended name:** **VENA Agent** (display) · subtitle *Mining Protocol Operator*  
**Token:** existing `$VENA` — do **not** launch a second agent token.  
**Agent page:** https://app.virtuals.io/virtuals/95873

---

## Architecture (3 layers)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Virtuals (app.virtuals.io)                               │
│    Persona, knowledge base, chat UI, inference billing      │
│    Token = $VENA (already live on Robinhood Chain)          │
├─────────────────────────────────────────────────────────────┤
│ 2. VENA site APIs (read-only)                               │
│    GET /api/agent/pool                                      │
│    GET /api/agent/user/0x…                                  │
├─────────────────────────────────────────────────────────────┤
│ 3. Robinhood Chain (source of truth)                        │
│    VenaMiningV2 pool, VPICK NFTs, VenaForge                 │
└─────────────────────────────────────────────────────────────┘
```

Agent **never** holds user keys. It reads chain data and guides users to  
https://venaprotocol.com/miner for stake / claim (manual wallet actions).

---

## What you need

| Item | Purpose |
|------|---------|
| Virtuals account + deployer wallet | Edit agent 95873 profile |
| $VIRTUAL (small amount) | Virtuals module fees if enabling paid features |
| Robinhood Chain wallet | Same wallet that deployed VENA |
| `NEXT_PUBLIC_VIRTUALS_AGENT_URL` | Already in env |
| Deployed site APIs | `/api/agent/pool` after Vercel deploy |
| `docs/agent-knowledge-base.md` | Paste into Virtuals knowledge / system prompt |

Optional later:

- OpenAI / Anthropic API key (if Virtuals lets you bring your own model)
- Custom chat widget on venaprotocol.com/miner
- X API for automated weekly pool reports

---

## Phase 1 — Today (Virtuals dashboard, ~1 hour)

1. Open https://app.virtuals.io/virtuals/95873 → **Edit agent**
2. Set **display name:** `VENA Agent`
3. Set **tagline:** `Mining Protocol Operator on Robinhood Chain`
4. Upload robot/banner asset from `/public/miner/`
5. Paste **Introduction** + **How it works** from `docs/agent-knowledge-base.md`
6. Paste **System prompt** section into persona / instructions field
7. Add links:
   - Website: https://venaprotocol.com
   - Miner: https://venaprotocol.com/miner
   - Mint: https://venaprotocol.com/mint
   - X: https://x.com/VenaHub
8. Enable Robinhood Chain if prompted in Agent Console
9. Test chat: “What is the staking pool size?” → should describe buyback-fed pool

No new token. You are **upgrading** the existing $VENA agent page.

---

## Phase 2 — After deploy (API tools)

Public endpoints (read-only):

```bash
curl https://venaprotocol.com/api/agent/pool
curl https://venaprotocol.com/api/agent/user/0xYourWallet
```

In Virtuals builder (when custom tools / webhooks are available on RH):

- Tool `get_pool` → `GET /api/agent/pool`
- Tool `get_user_stake` → `GET /api/agent/user/{wallet}`

Until Virtuals exposes tool wiring on Robinhood, paste API JSON into knowledge  
or answer from system prompt + manual refresh.

---

## Phase 3 — Product (later)

- Embedded “Ask VENA Agent” on `/miner`
- Stratum / upgrade ROI calculator tool
- Weekly treasury thread drafted from `/api/agent/pool`

---

## Agent rules (compliance)

- Never promise fixed APY
- Staking & claim are **manual** — link to Miner Command
- Read-only on-chain — no “I staked for you”
- Distinguish **preview yield** vs **live pool share**

---

## Contracts (mainnet)

| | Address |
|--|---------|
| $VENA | `0xFbD1Bf9d354CD8197Ab54f80778C03cc468ADAaf` |
| VPICK NFT | `0xe250751a2514e0d1267AcBEBF43787aF579b6F4c` |
| VenaForge | `0x99A1ac88eeB9eFFF12Be0607F4089c40F6765823` |
| VenaMiningV2 | `0x1dDA64bd76165400Ad929D4d94E0D8285288D37B` |
| Virtuals agent | https://app.virtuals.io/virtuals/95873 |
