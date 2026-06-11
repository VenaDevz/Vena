# Vena Protocol — Tam Deploy Rehberi (Sıfırdan)

---

## Genel Bakış

Toplamda **6 kontrat** deploy edilecek, sıra önemlidir.

| Sıra | Kontrat          | Açıklama                                      |
|:----:|------------------|-----------------------------------------------|
|  1   | VenaToken        | ERC-20 token, 10.000 sabit arz               |
|  2   | PickaxeNFT       | ERC-721 NFT, 5 tier                          |
|  3   | Forge            | NFT yükseltme                                |
|  4   | VenaMining       | NFT stake + VENA ödül havuzu                 |
|  5   | TreasuryVesting  | 1.000 VENA lineer kilit                      |
|  6   | VenaHook         | Uniswap v4 hook (adres madenciliği gerekir)  |

---

## Remix Ayarları

Her deploy öncesi şu ayarları kontrol et:

- **Compiler:** `0.8.24`
- **EVM Version:** `cancun`
- **Optimization:** Açık — 200 runs
- **Network:** MetaMask → **Base Mainnet**
- **Deploy yöntemi:** Injected Provider (MetaMask)

---

## Adım 1 — VenaToken Deploy

**Contract:** `VenaToken.sol`

| Parametre      | Değer                    |
|----------------|--------------------------|
| `initialOwner` | Kendi cüzdan adresin     |

Deploy et → Çıkan adresi kaydet:
```
VENA_TOKEN = 0x...
```

---

## Adım 2 — PickaxeNFT Deploy

**Contract:** `PickaxeNFT.sol`

| Parametre      | Değer                        |
|----------------|------------------------------|
| `_venaToken`   | `VENA_TOKEN` adresi          |
| `initialOwner` | Kendi cüzdan adresin         |

Deploy et → Çıkan adresi kaydet:
```
PICKAXE_NFT = 0x...
```

---

## Adım 3 — Forge Deploy

**Contract:** `Forge.sol`

| Parametre      | Değer                        |
|----------------|------------------------------|
| `_pickaxe`     | `PICKAXE_NFT` adresi         |
| `initialOwner` | Kendi cüzdan adresin         |

Deploy et → Çıkan adresi kaydet:
```
FORGE = 0x...
```

---

## Adım 4 — VenaMining Deploy

**Contract:** `VenaMining.sol`

| Parametre      | Değer                        |
|----------------|------------------------------|
| `_venaToken`   | `VENA_TOKEN` adresi          |
| `_pickaxe`     | `PICKAXE_NFT` adresi         |
| `initialOwner` | Kendi cüzdan adresin         |

Deploy et → Çıkan adresi kaydet:
```
VENA_MINING = 0x...
```

---

## Adım 5 — TreasuryVesting Deploy

**Contract:** `TreasuryVesting.sol`

| Parametre       | Değer                         |
|-----------------|-------------------------------|
| `_venaToken`    | `VENA_TOKEN` adresi           |
| `_beneficiary`  | Kendi cüzdan adresin          |

Deploy et → Çıkan adresi kaydet:
```
TREASURY_VESTING = 0x...
```

---

## Adım 6 — VenaHook Deploy (Adres Madenciliği)

VenaHook özel bir adrese ihtiyaç duyar. Uniswap v4 kuralı gereği
hook adresinin son 14 biti `0x0044` (68) olmalıdır.

### 6.1 — VenaHook'u Compile Et
Remix → **VenaHook.sol** → Compile

### 6.2 — Bytecode'u Al
Compile sonrası → **Compilation Details** → **Bytecode** → `object` alanını kopyala

### 6.3 — Adres Madenciliği Script'ini Çalıştır

`mine-hook-address.js` dosyasını aç ve şu iki satırı doldur:
```js
const DEPLOYER = "0xSENIN_CUZDANIN";   // kendi adresin
const BYTECODE = "0x...";              // Remix'ten kopyaladığın bytecode
```

Sonra terminalde çalıştır:
```bash
cd /Users/macintoshi/Desktop/ai-agents/vena/contracts
npm install ethers
node mine-hook-address.js
```

Çıktı örneği:
```
Found valid hook address!
  Salt (hex)  : 0x000000000000...0000001a4f
  Hook address: 0x...0044
```

Bu iki değeri kaydet:
```
HOOK_SALT    = 0x...
HOOK_ADDRESS = 0x...
```

### 6.4 — VenaHook'u CREATE2 ile Deploy Et

Remix'te Deploy kısmında **"At Address"** değil, normal **Deploy** kullanacaksın.
Fakat önce Remix'te **CREATE2 Factory** üzerinden deploy yapılmalı:

1. Remix → **Deploy & Run** → **Environment:** Injected Provider
2. Kontrat: `VenaHook`
3. Constructor parametreleri:

| Parametre      | Değer                                          |
|----------------|------------------------------------------------|
| `_poolManager` | `0x498581ff718922c3f8e6a244956af099b2652b2b`   |
| `_pickaxe`     | `PICKAXE_NFT` adresi                           |
| `_venaToken`   | `VENA_TOKEN` adresi                            |
| `initialOwner` | Kendi cüzdan adresin                           |

4. **Salt** alanına `HOOK_SALT` değerini yaz
5. Deploy → Deploy edilen adresin `HOOK_ADDRESS` ile eşleştiğini doğrula

```
VENA_HOOK = 0x...
```

---

## Adım 7 — Kontrat Bağlantıları

Bu adımlar sırasıyla yapılmalı.

### 7.1 — Forge'u PickaxeNFT'ye Tanıt
```
PickaxeNFT → setForge( FORGE )
```

### 7.2 — Hook'u PickaxeNFT'ye Tanıt
```
PickaxeNFT → setFeeHook( VENA_HOOK )
```

### 7.3 — Mining Havuzunu Fonla ve Başlat
```
VenaToken → transfer( VENA_MINING, 4000000000000000000000 )
VenaMining → start()
```

### 7.4 — Treasury Kilidini Fonla ve Başlat
```
VenaToken → transfer( TREASURY_VESTING, 1000000000000000000000 )
TreasuryVesting → start()
```

> Bu iki işlemden sonra elinde **5.000 VENA** kalacak — bu Uniswap LP için.

---

## Adım 8 — Uniswap v4 Pool Oluştur

[app.uniswap.org](https://app.uniswap.org) → Base ağı → **Pool** → **New Position** → **v4**

| Parametre       | Değer                                          |
|-----------------|------------------------------------------------|
| Token A         | ETH (native)                                   |
| Token B         | `VENA_TOKEN` adresi                            |
| Fee tier        | **%0** — hook fee alıyor, pool fee sıfır olmalı|
| Hook            | `VENA_HOOK` adresi                             |
| Tick spacing    | 60                                             |

**Fiyat Ayarı ($1/VENA, ETH = $1.700 varsayımı):**

| Parametre      | Değer                                           |
|----------------|-------------------------------------------------|
| Initial tick   | `74400`                                         |
| sqrtPriceX96   | `3266656368625732863419410517304`               |
| Tick lower     | `-887220`                                       |
| Tick upper     | `74200`                                         |
| Seed ETH       | `0` (tek taraflı likidite — ETH gerekmez)       |
| VENA miktarı   | `5000`                                          |

> ⚠️ Hook adresi pool'a kalıcı olarak bağlanır — sonradan değiştirilemez.

---

## Adım 9 — LP Token Kilitleme

Topluluk güveni için likiditeyi en az 6 ay kilitlemeli:

1. [app.unicrypt.network](https://app.unicrypt.network) → Base ağı seç
2. LP token adresini gir
3. Kilit süresi: minimum **180 gün**
4. Kilit sahibi: kendi cüzdan adresin

---

## Adım 10 — Basescan Doğrulaması

Her kontrat için:
1. [basescan.org](https://basescan.org) → kontrat adresini ara → **Verify & Publish**
2. Compiler: `0.8.24` | Optimization: Yes (200) | EVM: Cancun
3. Kaynak kodunu yapıştır → Onayla

Doğrulanmış kontratlar topluluk güveni için zorunludur.

---

## Token Dağılım Özeti

| Alıcı               | Miktar     | Nasıl                          |
|---------------------|------------|--------------------------------|
| Uniswap v4 Pool     | 5.000 VENA | Adım 8 — pool oluşturma        |
| VenaMining          | 4.000 VENA | Adım 7.3 → `start()`           |
| TreasuryVesting     | 1.000 VENA | Adım 7.4 → `start()`           |
| **Toplam**          | **10.000** |                                |

---

## Kullanıcı Akışı (Yayına Girdikten Sonra)

```
1. Kullanıcı Uniswap'ta ETH ile VENA satın alır
2. PickaxeNFT.mintSilver(N) → N VENA yakar, N Silver NFT alır
3. VenaHook NFT'yi otomatik kaydeder (Stratum 1.0x'den başlar)
4. NFT tutuldukça Stratum artar → 30 günde 6.50x'e ulaşır
5. Her swap'ta hook %1 çeker (ETH veya VENA birikir)
6. VenaHook.claimFees([tokenId,...]) → ETH + VENA alır
   (Uzun tutanlar orantılı olarak daha fazla alır)
7. İsteğe bağlı: VenaMining.stakeNFT(tokenId) → 4.000 VENA havuzundan kazan
8. İsteğe bağlı: Forge.forge(tier, [tokenIds]) → daha yüksek tier'a yükselt
```

---

## Tier Referansı

| Tier     | Rarity Ağırlığı | Mining Gücü | Forge Yolu                   | Max Arz |
|----------|:---:|:---:|---|:---:|
| Silver   |  1  |  10 | 1 VENA yak → mint             | 10.000  |
| Gold     |  4  |  50 | 4× Silver → 1 Gold            |  2.500  |
| Platinum |  8  | 108 | 2× Gold → 1 Platinum          |  1.250  |
| Diamond  | 16  | 304 | 2× Platinum → 1 Diamond       |    625  |
| Emerald  | 32  | 905 | 2× Diamond → 1 Emerald        |    312  |
