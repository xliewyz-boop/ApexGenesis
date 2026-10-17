# SÖZLEŞME.md - Apex Genesis Projesi Dosya ve Veri Şeması Kontratı

## Sekme Tanımları
| Sekme ID | Sekme Başlığı (Türkçe) | Dosya Adı | Açıklama |
|----------|------------------------|-----------|----------|
| dashboard | Dashboard | dashboard.html | Topluluk özeti |
| teams | Takımlar | teams.html | Aktif takımlar |
| players | Oyuncular | players.html | Aktif oyuncular |
| tournaments | Turnuvalar | tournaments.html | 4 filtreli liste |
| news | RL News | news.html | Rocket League haberleri |
| training | Antrenman | training.html | Popüler mekanikler |
| shop | Mağaza | shop.html | Genesis Coin ile ürünler |
| profile | Profil | profile.html | Kullanıcı profili |
| settings | Ayarlar | settings.html | Tema, animasyon, bildirim, veri sıfırlama |

## JSON Dosya Şemaları
Her JSON dosyası `data/` klasöründe bulunur.

### teams.json
Dizi şeklinde, her ekip nesnesi:
```json
{
  "id": "string",
  "name": "string",
  "logo": "string (URL veya yolu)",
  "color": "string (hex)",
  "roster": ["string", ...], // oyuncu ID'leri
  "wins": number,
  "losses": number,
  "coinBalance": number
}
```

### players.json
Dizi şeklinde, her oyuncu nesnesi:
```json
{
  "id": "string",
  "username": "string",
  "teamId": "string veya null",
  "role": "string (örn. Caps, Striker, Goalkeeper)",
  "rank": "string (örn. Bronze, Silver, Gold, Platinum, Diamond, Champion, Grand Champion, Supersonic Legend)",
  "stats": {
    "goals": number,
    "assists": number,
    "saves": number,
    "shots": number
  }
}
```

### tournaments.json
Dizi şeklinde, her turnuva nesnesi:
```json
{
  "id": "string",
  "title": "string",
  "date": "string (ISO tarihi)",
  "prize": number, // coin ödülü
  "type": "string (Yaklaşan, Geçmiş, Ödüllü, Açık Katılımlı)",
  "participants": ["string", ...], // ekip ID'leri
  "status": "string (upcoming, ongoing, completed)",
  "coinReward": number // katılım coin kazanımı
}
```

### news.json
Dizi şeklinde, her haber nesnesi:
```json
{
  "id": "string",
  "title": "string",
  "content": "string",
  "image": "string (URL veya yolu)",
  "date": "string (ISO tarihi)",
  "source": "string (örn. Rocket League Resmi Sitesi)"
}
```

### mechanics.json
Dizi şeklinde, her mekanik nesnesi:
```json
{
  "id": "string",
  "title": "string",
  "description": "string",
  "videoUrl": "string (YouTube embed URL veya null)",
  "steps": ["string", ...],
  "commonMistakes": ["string", ...],
  "positioningSection": boolean // bu mekanik positioningyle ilgiliyse true
}
```

### shop.json
Dizi şeklinde, her ürün nesnesi:
```json
{
  "id": "string",
  "name": "string",
  "price": number, // coin
  "type": "string (profile_frame, badge, theme_color, title)",
  "description": "string",
  "image": "string (URL veya yolu)"
}
```

### profile.json
Tek nesne (kullanıcı profili):
```json
{
  "username": "string",
  "avatar": "string (URL veya yolu)",
  "teamId": "string veya null",
  "bio": "string",
  "coinBalance": number,
  "ownedItems": ["string", ...], // ürün ID'leri
  "joinDate": "string (ISO tarihi)",
  "transactionHistory": [
    {
      "type": "string (earn, spend)",
      "amount": number,
      "description": "string",
      "date": "string (ISO tarihi)"
    }
  ]
}
```

## Fonksiyon/API Kontratları
- `js/coins.js`: coin kazanma ve harcama mantığını sağlar.
  - `addCoin(amount, reason)`: bakiyeye ekler, transactionHistory'ye ekler.
  - `spendCoin(amount, reason)`: yeterli bakiye varsa düşer, transactionHistory'ye ekler, aksi takdirde hata döner.
  - `getCoinBalance()`: mevcut bakiyeyi döner.
  - `getTransactionHistory()`: geçmişi döner.

- Her sekme dosyası, ilgili JSON verisini `fetch` ile alır ve render eder.
- Tema ve ayarlar `localStorage`'da saklanır ve `settings.html` üzerinden güncellenir.
- Profil düzenleme, `profile.json`'yi günceller ve `localStorage`'da saklar (veya senkronize olur).

## Kurallar
1. Her subagent Sadece kendi dosyalarına dokunur.
2. Ortak ihtiyaçlar bu sözleşme üzerinden karşılanır.
3. Her subagent bitince 3 satır rapor yazar: ne yaptı + dosyalar + sorun.
4. Şef entegrasyonu yapar: sekmeler arası geçiş, coin akışı, veri tutarlılığı.