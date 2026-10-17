# Apex Genesis — Eksikler ve Doğrulama Listesi

Son gözden geçirme: 17 Ekim 2026. Bu liste tamamlanan işleri ve kalan, dış erişim veya ayrı hesap gerektiren işleri birbirinden ayırır.

## Tamamlandı ve kodda kontrol edildi

- [x] Supabase Auth: kayıt, giriş, kalıcı oturum ve güvenli çıkış.
- [x] Üç rol: Member, Admin, Owner. Owner-only rol yönetimi; RLS ve veritabanı fonksiyonlarıyla koruma.
- [x] Rank doğrulaması: Member kendi Rocket League rank'ını değiştiremez; rank değişikliği yönetici yetkisi ve veritabanı korumasına bağlı.
- [x] Takım oluşturma: yalnızca Admin/Owner; üye herkese açık takımlara katılabilir/ayrılabilir.
- [x] Destek merkezi: ticket, yanıtlar, durum/atama; web'de Supabase Realtime, Electron'da sekme değişince temizlenen 7 saniyelik yenileme.
- [x] Duyurular: yönetici tarafından yayınlanan kayıtlar bulut veritabanında.
- [x] Rocket League haberleri: en fazla 10 güncel makale, 10 dakikalık önbellek/yenileme, resmî Rocket League kaynağı ve Steam duyuru geri dönüşü. Görsel kaynak sağlıyorsa alınır; her yazıda görsel garanti edilemez.
- [x] Web Vercel yayını: root vercel.json React/Vite frontend/dist klasörünü yayımlar; üretim URL'si ve JS/CSS varlıkları HTTP 200 ile kontrol edildi.
- [x] Desktop/web profil alanları: rank, oyun rolü ve bölge.
- [x] Oyuncu dizini: Supabase profiles tablosundan yüklenir; eski cihaz-yerel oyuncu kayıtları kaynak değil.
- [x] Turnuva takvimi/kayıtları: Supabase üzerinden; yalnızca Admin/Owner oluşturur, üye kayıt olur/iptal eder, veritabanı kapasiteyi denetler.
- [x] Genesis Coin: sunucu tarafı satın alma, bulut envanteri, günlük +10 GC, üyelik için +2 GC/gün ve turnuva başına ilk kayıt için +50 GC; günlük ödül aynı UTC gününde tekrar verilemez.
- [x] Profil, mağaza, ana sayfa ve turnuva özeti çevrim içi veriyi kullanır.
- [x] Antrenman ilerlemesi training_progress tablosuna kaydedilir.
- [x] Sekme HTML önbelleği, eski yüklemeleri iptal etme, zamanlayıcı temizliği, sayfa bazlı scroll-reveal ve reduced-motion desteği.
- [x] Türkçe mağaza açıklaması UTF-8 olarak düzeltildi.
- [x] GPT.md ve README.md devir/geliştirici belgeleri eklendi.

## Kod/test ile doğrulananlar

- [x] Supabase migration 1: temel şema.
- [x] Supabase migration 2: rol, destek, RLS ve performans politikaları.
- [x] Supabase migration 3: profil alanları, turnuva kayıt kontrolü ve günlük ödül fonksiyonu.
- [x] 15 uygulama tablosunda RLS etkin; destek tabloları Realtime yayınına eklendi.
- [x] Root npm test ve JavaScript sözdizimi kontrolleri geçti.
- [x] Web npm run build geçti.
- [x] Web npm run lint: 0 hata, 25 uyarı (çoğu React hooks/effect bağımlılıkları); uyarılar tamamen temizlenmiş değil.
- [x] Üretim Vercel dağıtımı READY durumunda; `/`, `/login`, `/signup`, `/support`, `/admin`, ana JS/CSS, Support chunk ve favicon HTTP 200 döndü. SPA rotaları için rewrite eklendi ve tekrar kontrol edildi.
- [ ] Son yerel Electron/SQL/docs değişiklikleri GitHub `main` dalına gönderilmeli; doğrudan Vercel dağıtımı şu an çalışıyor, ancak son kaynak değişikliklerinin Git geçmişinde tutulması ayrıca gerekli.

## Kalanlar / dürüst sınırlamalar

- [ ] Üç ayrı hesapla tam E2E testi: Member, Admin ve Owner oturumlarıyla ticket, rank değişikliği reddi, takım oluşturma reddi, duyuru ve rol yönetimi ayrı ayrı denenmeli. Şema/politika doğrulandı ama tüm akışlar ayrı kullanıcı oturumlarıyla otomatik test edilmedi.
- [ ] Electron üretim kurulum testi: release/ApexGenesis-Setup-1.3.0-x64.exe oluşturuldu. Temiz Windows profilinde kurulum/açılış/giriş ve yükseltme testi ayrıca yapılmalı.
- [ ] Kod imzalama: kurulum dosyası sertifikayla imzalı değil; Windows SmartScreen uyarısı olabilir. Geçerli publisher sertifikası gerekiyor.
- [ ] Gerçek turnuva bracket entegrasyonu: uygulama içi kayıt/kapasite var; resmî Rocket League bracket/eşleştirme sağlayıcısı yapılandırılmadı.
- [ ] Çeviri kalitesi: 15 dil seçeneği mevcut, ancak bazı eski locale dosyalarında eksik/bozuk metin veya placeholder var. Türkçe/İngilizce dışındaki sayfalar editoryal inceleme gerektiriyor.
- [ ] Haber görseli tutarlılığı: bazı kaynaklar görsel sunmuyor veya erişimi engelliyor. Böyle durumlarda haber kartı metinle kalabilir; sahte görsel üretmiyoruz.
- [ ] Kalan cihaz-yerel ayarlar: tema, vurgu rengi, bildirim tercihleri ve eski yerel duyuru taslakları cihaz bazında tutuluyor.
- [ ] Linter uyarıları: 25 React hook/effect uyarısı incelenip temizlenmeli; şu anda build'i durduran hata değiller.
- [ ] Görsel/regresyon testi: farklı ekran boyutları, yavaş bağlantı ve reduced-motion açıkken bütün sekmeler manuel/otomatik gezilmeli.
- [ ] Operasyon: Supabase yedekleme/geri yükleme planı ve rol değişikliği audit log'u ayrıca düzenlenmeli.

## Yetki/erişim gerektirenler

- Vercel MCP ile statik üretim dağıtımı başarılı; yerel Vercel CLI oturumu ise çıkış yapmış durumda. Son kaynak değişikliklerini GitHub `main` dalına göndermek, standart Git tabanlı build/deploy geçmişini korumak için ayrıca gerekli.
- Kod imzalama için geçerli Windows publisher sertifikası gerekir.
- Harici Rocket League bracket entegrasyonu için uygun sağlayıcı ve API erişimi gerekir.

Bu liste, bir özelliğin kodda bulunmasıyla canlıda uçtan uca test edilmesini birbirinden ayırır. Durum değiştikçe güncelle.
