# VENA Protocol — Proje Durumu & Antigravity Handoff

> **Son güncelleme:** 7 Temmuz 2026  
> **Repo:** `/Users/macintoshi/Desktop/ai-agents/vena`  
> **Ağ:** Robinhood Chain (chainId `4663`)  
> **Token:** `$VENA` — Virtuals launch (canlı)

Bu belge, projede **ne yaptığımızı**, **hangi adımda olduğumuzu** ve **Antigravity’de devam etmek için verilecek prompt’u** içerir.

---

## 1. Proje özeti

**VENA**, Robinhood Chain üzerinde bir mining protocol’üdür. Ana site Next.js 16 (`/`) ile çalışır.

| Modül | Route | Durum |
|-------|-------|-------|
| Ana site (mint, forge, tokenomics) | `/` | GitHub’da, canlı |
| Miner Command (staking UI) | `/miner` | GitHub’da, canlı |
| Mint sayfası | `/mint` | GitHub’da |
| Agent API (read-only) | `/api/agent/*` | GitHub’da |
| **VenaLand / Command Base** (idle mine oyunu) | `/farm` | **Yerel — henüz commit/push yok** |
| Marketplace (Seaport test app) | `marketplace-app/` | Ayrı Next app, WIP |

---

## 2. Canlı protokol (main branch — push edilmiş)

Son anlamlı commit’ler:

```
1b278fc Fix ForgeUpgradePanel BigInt literal for ES2017 target
6fc6b4e Fix VenaForge: Gold için 4 Silver + 1M $VENA (1 Silver değil)
9584fd7 Agent API: pool + user stake snapshot endpoints
… (staking V2/V3, treasury buyback, Virtuals launch, vb.)
```

### On-chain (Robinhood mainnet)

| Kontrat | Adres (env default) |
|---------|---------------------|
| VPICK NFT | `0xe250751a2514e0d1267AcBEBF43787aF579b6F4c` |
| VenaForge | `0xF61C1a1959FDAf77F1A3FaE3F62a6163b2e1248C` |
| Staking (V2 aktif) | `0x1dDA64bd76165400Ad929D4d94E0D8285288D37B` |
| $VENA token | `0xFbD1Bf9d354CD8197Ab54f80778C03cc468ADAaf` |
| Treasury | `0x882db6c850f866Af6f050335540bf3da4CB0dfcA` |

### Forge düzeltmesi (deploy edildi)

Gold upgrade artık **4 Silver Pickaxe + 1M $VENA** yakıyor (önceden yanlışlıkla 1 Silver’dı). UI: `src/components/ForgeUpgradePanel.tsx`.

---

## 3. VenaLand (Command Base) — `/farm`

**Tamamen `src/features/farm/` altında.** Git’te **untracked** (`?? src/features/farm/`). Kullanıcı isteği: **farm işi henüz GitHub’a push edilmedi.**

### Oyun konsepti

- Izometrik grid üzerinde idle mining / base building
- Kaynak zinciri: **Ore → Iron → Gold → Crystal → Prime Crystal (◆)**
- `$VENA` hold ile giriş; **VPICK opsiyonel bonus** (zorunlu değil)
- Kintara.com’dan ilham: trade post, daily cache, tutorial, leaderboard, season intel

### Giriş modeli (güncel)

| Kural | Değer |
|-------|-------|
| Minimum `$VENA` hold | **50.000** (`FARM_MIN_VENA_HOLD`) |
| VPICK zorunlu mu? | **Hayır** — sadece bonus |
| Başlangıç Crystal (VENA-only) | **750** |
| Başlangıç Crystal (VPICK holder) | **1.500** |
| Demo mod | `NODE_ENV=development` iken otomatik açık (`FARM_DEMO_MODE`) |
| Demo başlangıç Crystal | **5.000** |

### VPICK bonus tier’ları (son oturumda tamamlandı)

| Tier | Üretim bonusu | Daily Cache Crystal bonusu |
|------|---------------|----------------------------|
| Yok | — | — |
| Any VPICK | +10% | +10% |
| Emerald VPICK | +25% | +25% |

Tier okuma: `useWalletPickaxes()` → `tokenTier` on-chain → `vpickTierFromRarities()` in `farm-config.ts`.

### Tamamlanan farm özellikleri

#### Core gameplay
- [x] Grid build / upgrade / demolish / replace (`FarmGrid`, `FarmBuildModal`, `FarmManageModal`)
- [x] Kaynak üretimi + offline accrual (8 saat cap)
- [x] Conveyor adjacency +25% bonus (`farm-math.ts`)
- [x] Rally commander (2×, 30s / 180s cooldown)
- [x] Power Cores (prestige, 6 core max)
- [x] Grid expansion tier’ları (2×2 → 5×5)
- [x] localStorage save (`farm-storage.ts`)

#### Ekonomi & market
- [x] **Command Store** — Crystal + VENA ile kozmetik/perk/premium (`FarmMarketPanel`, `FARM_MARKET`)
- [x] **Commander Trade Post** — simüle P2P order book, %5 fee (`FarmTradePanel`, `farm-trade.ts`)
- [x] **Crystal → USDC Exchange** — localStorage pool simülasyonu (`FarmExchangePanel`, `farm-exchange.ts`)
- [x] VENA market satın alımları → treasury `payVena()` (live modda on-chain)

#### Retention (Kintara-inspired)
- [x] 5 adımlı tutorial overlay (`FarmTutorial`, `farm-tutorial.ts`)
- [x] Daily Supply Cache — günde 1 claim, UTC reset (`FarmDailyCachePanel`)
- [x] Daily quests + streak multiplier (`FarmQuestPanel`, `farm-quests.ts`)
- [x] Multi-tab leaderboard (Prime / Crystal / Base / Streak) — **simüle data**
- [x] Season Intel panel (`FarmSeasonPanel`)

#### UI / UX (son oturumlar)
- [x] **Bazaar stili** — Trade Post + Command Store ortak `.farm-bazaar*` shell
- [x] Daily Cache → bazaar shell (altın tent)
- [x] **Mobil side panel** — 4 tab: Base | Missions | Market | Season
- [x] FarmHeader hydration fix (`mounted` guard)
- [x] Emerald VPICK tier detection

### Side panel sırası (desktop)

1. Commander (+ rally, power cores)  
2. Base Stats (+ expand base)  
3. Daily Supply Cache  
4. Daily Quests  
5. Commander Trade Post  
6. Command Store  
7. Season Rankings  
8. Season Intel  
9. Crystal → USDC Exchange  

### Dosya haritası

```
src/features/farm/
├── config/
│   ├── farm-config.ts       # binalar, market, VPICK, grid tier’ları
│   ├── farm-trade.ts        # trade order book
│   ├── farm-exchange.ts     # USDC pool simülasyonu
│   ├── farm-daily-cache.ts  # günlük ödül roll
│   ├── farm-quests.ts       # quest + streak
│   └── farm-tutorial.ts
├── hooks/
│   └── useFarmGame.ts       # ana state machine (~1000 satır)
├── lib/
│   ├── farm-math.ts         # üretim, conveyor, tick
│   └── farm-storage.ts      # localStorage schema
├── components/
│   ├── FarmLayout.tsx       # ana layout + mobil tablar
│   ├── FarmWorld.tsx        # izometrik dünya + HUD
│   ├── FarmGate.tsx         # erişim kapısı
│   ├── FarmTradePanel.tsx   # bazaar trade
│   ├── FarmMarketPanel.tsx  # bazaar store
│   ├── FarmDailyCachePanel.tsx
│   ├── FarmQuestPanel.tsx
│   ├── FarmLeaderboard.tsx
│   ├── FarmSeasonPanel.tsx
│   ├── FarmExchangePanel.tsx
│   └── … (modals, tutorial, grid, header)
├── farm.css                 # tüm farm stilleri (~2500 satır)
└── (page entry: src/app/farm/page.tsx)
```

### State / persistence

- Kayıt anahtarı: wallet address → `localStorage`
- Demo address: `0xDEMO000000000000000000000000000000000000`
- Exchange pool/quota: global localStorage (tüm kullanıcılar paylaşır — simülasyon)

### Bilinen sınırlamalar / teknik borç

| Konu | Detay |
|------|-------|
| Leaderboard | Hardcoded `SIM` data — gerçek on-chain/indexer yok |
| Exchange payout | localStorage sim — gerçek USDC transfer yok |
| Trade Post | Deterministik sim order book — gerçek P2P yok |
| `FarmCommanderCard.tsx` | Kullanılmıyor (commander `FarmLayout` içinde inline) |
| `pickaxeRequired` | Her zaman `false` — dead export |
| Build | Ana proje compile OK; `marketplace-app/` ayrı TS hatası var (`order-store`) |
| Farm commit | **Henüz git’e eklenmedi** |

---

## 4. Marketplace (ayrı app)

`marketplace-app/` — Seaport tabanlı NFT marketplace denemesi. Ana `vena` build’ini etkileyebilir; farm ile doğrudan bağlı değil.

Docs: `docs/MARKETPLACE_DEV.md`, `docs/MARKETPLACE_TESTNET_PLAN.md`

---

## 5. Ortam değişkenleri (farm)

Farm config çoğunlukla kod içi default kullanır. Opsiyonel override’lar:

```bash
# .env.local
NEXT_PUBLIC_FARM_MIN_VENA=50000
NEXT_PUBLIC_FARM_DEMO_MODE=true   # dev’de default true
NEXT_PUBLIC_TREASURY=0x882db6c850f866Af6f050335540bf3da4CB0dfcA
NEXT_PUBLIC_PICKAXE_NFT=0xe250751a2514e0d1267AcBEBF43787aF579b6F4c
NEXT_PUBLIC_VENA_TOKEN=0xFbD1Bf9d354CD8197Ab54f80778C03cc468ADAaf
NEXT_PUBLIC_CHAIN_ID=4663
NEXT_PUBLIC_REOWN_PROJECT_ID=...
```

### Dev server

```bash
cd /Users/macintoshi/Desktop/ai-agents/vena
npm install
npm run dev
# → http://localhost:3000/farm  (demo mod otomatik)
```

---

## 6. Hangi adımdayız?

**Faz:** VenaLand MVP — oynanabilir local prototype, UI polish devam ediyor.

```
[✓] Protokol çekirdeği (mint, forge fix, staking, treasury) — LIVE
[✓] VenaLand core loop (grid, resources, save/load)
[✓] Giriş modeli: VENA-only gate + VPICK optional bonus
[✓] Kintara-inspired retention (tutorial, cache, quests, trade, LB, season)
[✓] Bazaar UI (Trade + Store + Daily Cache)
[✓] Mobil tab panel + VPICK Emerald tier + hydration fix
[ ] Bazaar shell → Quests, Leaderboard, Exchange, Season panelleri
[ ] Gerçek leaderboard (indexer / API)
[ ] On-chain exchange veya en azından treasury-backed claim
[ ] Farm’ı git commit + (kullanıcı onayıyla) push
[ ] Production deploy (/farm route)
```

**Son tamamlanan iş (7 Temmuz 2026):**
1. Emerald VPICK tier → +25% prod/cache; any VPICK → +10%
2. FarmHeader SSR hydration düzeltmesi
3. Mobil side panel 4-tab layout
4. Daily Cache bazaar stiline geçirildi

---

## 7. Sıradaki önerilen adımlar

1. **Quests + Leaderboard + Exchange + Season** panellerine `.farm-bazaar` shell (Trade/Store ile görsel tutarlılık)
2. **Leaderboard API** — en azından wallet bazlı localStorage skorları veya basit backend
3. **Exchange** — treasury’den USDC claim flow (veya “coming soon” netleştirme)
4. **Dead code temizliği** — `FarmCommanderCard.tsx`, unused CSS (`.farm-vault-*` tier rules)
5. **`git add src/features/farm`** — kullanıcı onayından sonra commit + push
6. **Nav/metadata** — `farm/page.tsx` description hâlâ “Hold VPICK to play” diyor; VENA-only gate’e güncelle

---

## 8. Antigravity için başlangıç prompt’u

Aşağıdaki bloğu olduğu gibi Antigravity’ye yapıştır:

---

```
Sen VENA Protocol reposunda çalışan bir geliştirici agentsın.

## Repo
- Path: vena (Next.js 16, Robinhood Chain chainId 4663)
- Ana site: /, /mint, /miner — canlı ve GitHub’da
- VenaLand idle game: /farm — src/features/farm/ altında, HENÜZ GIT’E COMMIT EDİLMEDİ

## Oku (sırayla)
1. docs/VENALAND_HANDOFF.md — tam proje durumu
2. src/features/farm/hooks/useFarmGame.ts — ana oyun state
3. src/features/farm/config/farm-config.ts — ekonomi sabitleri
4. src/features/farm/components/FarmLayout.tsx — layout + mobil tablar
5. src/features/farm/farm.css — bazaar + responsive stiller

## Kurallar
- AGENTS.md: Next.js 16 breaking changes — node_modules/next/dist/docs/ oku
- Farm koduna dokunurken mevcut convention’ları koru (minimal diff)
- Farm için GitHub push/commit YAPMA — kullanıcı açıkça istemedikçe
- Türkçe konuşan kullanıcı; açıklamaları Türkçe yap, kod/komment İngilizce kalabilir

## Tamamlanmış (tekrar yapma)
- VENA-only gate (50K hold), VPICK optional bonus
- Trade Post + Command Store bazaar UI
- Daily Cache bazaar UI
- Emerald VPICK tier (+25%) vs any VPICK (+10%)
- Mobil 4-tab side panel (Base/Missions/Market/Season)
- FarmHeader hydration fix
- Forge Gold fix (4 Silver + 1M VENA) — ayrı, zaten deploy edildi

## Şimdi yapılacaklar (öncelik sırasıyla)

### 1. Bazaar shell genişletme
Quests (`FarmQuestPanel.tsx`), Leaderboard (`FarmLeaderboard.tsx`), Exchange (`FarmExchangePanel.tsx`), Season Intel (`FarmSeasonPanel.tsx`) panellerini Trade Post / Command Store ile aynı `.farm-bazaar` shell’e geçir.
- Ortak pattern: `farm-bazaar`, `farm-bazaar-awning--{variant}`, kicker, title, badge, stats, footer
- Her panele farklı awning rengi (quest=amber, lb=purple, exchange=green, season=cyan)

### 2. Metadata & copy düzeltmeleri
- `src/app/farm/page.tsx` metadata: "Hold $VENA" (VPICK zorunlu değil)
- Tutarsız VPICK metinlerini tara ve düzelt

### 3. Dead code temizliği
- `FarmCommanderCard.tsx` kullanılmıyorsa sil veya wire et
- `farm.css` içindeki kullanılmayan `.farm-vault-tier*` kuralları (Exchange vault class alias kullanıyor)

### 4. Exchange / Leaderboard iyileştirme (sim seviyesinde)
- Leaderboard: oyuncunun kendi skorunu SIM listesine ekle (address bazlı)
- Exchange: `exchangeCrystal` içinde quota guard (UI ile uyumlu)

### 5. Doğrulama
- `npm run dev` → http://localhost:3000/farm (demo mod)
- Mobil (<900px) tab geçişlerini kontrol et
- Lint temiz

## Başarı kriteri
- 4 panel bazaar stiline geçmiş, mobil/desktop düzgün
- Copy tutarlı (VENA gate, VPICK bonus)
- Mevcut oyun loop’u bozulmamış
- Değişiklik özeti Türkçe raporlanmış

Önce docs/VENALAND_HANDOFF.md ve farm dosyalarını oku, sonra 1. maddeden başla.
```

---

## 9. Hızlı referans — önemli sabitler

```typescript
// farm-config.ts
FARM_MIN_VENA_HOLD = 50_000
FARM_START_CRYSTAL = 750
FARM_PICKAXE_START_CRYSTAL = 1_500
FARM_VPICK_BONUS = { any: 1.1, emerald: 1.25 }
FARM_RALLY = { boost: 2, durationSec: 30, cooldownSec: 180 }
FARM_OFFLINE_CAP_SEC = 8 * 3600

// farm-exchange.ts
EXCHANGE_POOL_USDC = 500
EXCHANGE_CRYSTAL_QUOTA = 2_000_000
EXCHANGE_SEASON_END = "Aug 1, 2026"

// farm-trade.ts
TRADE_FEE_BPS = 500  // %5
TRADE_BOOK_SIZE = 8
```

---

## 10. İlgili dokümanlar

| Dosya | İçerik |
|-------|--------|
| `docs/STAKING_AND_TREASURY.md` | Staking + buyback |
| `docs/TREASURY_OPS.md` | Keeper script |
| `docs/VENA_AGENT.md` | Agent API |
| `docs/ROBINHOOD_DEPLOY.md` | Deploy notları |
| `docs/MARKETPLACE_DEV.md` | Marketplace app |

---

*Bu dosya Antigravity / başka bir AI agent’a context handoff için hazırlanmıştır. Farm push kararı kullanıcıya aittir.*
