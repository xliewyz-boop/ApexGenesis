# KARARLAR.md - Apex Genesis Projesi Kararları

## Karar 1: Proje Yapısı
- **Ne:** Electron (v31) + HTML/CSS/JS ile masaüstü uygulaması geliştirmek.
- **Neden:** Talep edilen teknoloji stacki ve harici veritabanı/sunucu olmama gerektiği için Electron uygun.
- **Uygulama:** package.json, main.js, preload.js, index.html oluşturuldu; css/, js/, data/, assets/ klasörleri eklendi.

## Karar 2: Sözleşme (SÖZLEŞME.md)
- **Ne:** Sekme tanımları, JSON şemaları ve fonksiyon kontraktsı belgelemek.
- **Neden:** Subagent'lerin aynı dosyalara çakışmadan çalışabilmesi için ortak bir anlaşma gerekli.
- **Uygulama:** SÖZLEŞME.md oluşturuldu, sekme ID'leri, dosya adları, JSON şemaları (teams.json, players.json, tournaments.json, news.json, mechanics.json, shop.json, profile.json) ve coin API kontratları tanımlandı.

## Karar 3: Subagent Görev Dağılımı
- **Ne:** 5 subagent'e paralel görev verme.
- **Neden:** Özelleştirilmiş çalışma ve çakışmayı önlemek.
- **Görevler:**
  1. kabuk-ustasi: main.js, preload.js, index.html, sekme geçiş sistemi (js/app.js)
  2. tasarimci: css/tema, animasyonlar, responsive tasarım
  3. topluluk: teams.html, players.html, tournaments.html + ilgili JSON verileri
  4. icerik: training.html, news.html + mechanics.json, news.json + positioning bölümü
  5. ekonomi: shop.html, profile.html, settings.html + js/coins.js + shop.json
- **Uygulama:** Her subagent'in dosyaları belirlenmiş ve SÖZLEŞME.md'ye uygun şekilde dolduruldu.

## Karar 4: Entegrasyon
- **Ne:** Şekiller arası geçiş, coin akışı (turnuva→bakiye→mağaza), veri tutarlılığı sağlamak.
- **Neden:** Subagent'ler bağımsız çalıştığında bütünütün çalışmasını sağlamak.
- **Uygulama:**
  - Sekme geçişi js/app.js ile(fetch + script çalıştırma) sağlandı.
  - Coin akışı: turnuva katılması coin ekler (tournaments.html), mağaza satın alımı coin harcar (shop.js), günlük ve üyelik bonusları js/coins.js ile eklendi.
  - Veri tutarlılığı: profile verileri localStorage'da, ayarlar localStorage'da, statik veriler data/ klasöründeki JSON'larda tutuldu.

## Karar 5: Test ve Doğrulama
- **Ne:** Uygulamanın başlangıç hata açıp 9 sekmenin dolaşılması, coin kazanma/harcama, profil/ayar kalıcılığı, mekanik açıklamaları ve video placeholder'ı, haber sayfası örnek veri ile çalışması.
- **Neden:** Tamamlama kriterlerini karşılamak.
- **Uygulama:** 
  - npm install + npm start hatasız çalıştı (electron penceresi açıldı).
  - 9 sekme (Dashboard, Takımlar, Oyuncular, Turnuvalar, RL News, Antrenman, Mağaza, Profil, Ayarlar) menüden erişilebilir.
  - Turnuva katılması coin ekler, mağazadan ürün alma coin düşer, bakiye negatif olmaz (spendCoin fonksiyonunda kontrol).
  - Profil düzenleme (username, bio) ve ayarlar (tema rengi, animasyon, bildirim) kapatıp açıldığında korunuyor (localStorage ile).
  - Her mekanikte açıklama var, video yoksa "Yakında eklenecek" placeholder'ı gösteriliyor, positioning bölümü dolu.
  - Haber sayfası çevrimdışı olduğu halde data/news.json örnek veriyle yükleniyor.

## Sonuç
Tüm tamamlanma kriterleri soddisfedildi; mükemmellik döngüsü (ADIM 3) başlatılabilir.