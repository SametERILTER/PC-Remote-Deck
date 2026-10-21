# PCKontrol - Uzaktan Bilgisayar Kontrol Sistemi

[English Version (README.md)](README.md)

PCKontrol, modern yazılım teknolojileri kullanarak Windows işletim sistemli bilgisayarların mobil cihazlar üzerinden tam yetkiyle yönetilmesini sağlayan açık kaynaklı bir projedir. Bu sistem, özellikle yatağınızdan veya koltuğunuzdan kalkmadan bilgisayarınızı yönetmenize, medya içeriklerini kontrol etmenize ve dosya transferi yapmanıza olanak tanır.

## Proje Hakkında

Sistem iki temel parçadan oluşmaktadır:
1. Windows işletim sistemi üzerinde çalışan ve düşük sistem kaynağı tüketen Go dilinde yazılmış bir sunucu (Backend).
2. React Native ve Expo ile geliştirilmiş, hem Android hem de iOS cihazlarda çalışabilen modern bir mobil uygulama.

## Detaylı Özellikler

### Uzaktan Kontrol ve Girdi Yönetimi
- **Mouse Simülasyonu:** Telefon ekranını bir touchpad gibi kullanarak imleci pürüzsüz bir şekilde hareket ettirebilir, tıklama yapabilir ve kaydırma (scroll) işlemlerini gerçekleştirebilirsiniz.
- **Klavye Entegrasyonu:** Telefon klavyesini kullanarak bilgisayara metin gönderebilir, özel tuş kombinasyonlarını (Alt+Tab, Enter, Backspace vb.) çalıştırabilirsiniz.

### Multimedya ve Uygulama Yönetimi
- **Ses Kontrolü:** Bilgisayarın ses seviyesini hassas bir şekilde ayarlayabilir veya tamamen sessize alabilirsiniz.
- **Medya Oynatıcı:** Spotify ve diğer medya oynatıcılar için oynat, duraklat, sonraki ve önceki şarkı gibi kontrolleri kullanabilirsiniz.
- **Tarayıcı Kısayolları:** Google Chrome üzerinde yeni sekme açma, sekme kapatma, sayfayı yenileme ve gizli sekme gibi işlemleri tek tuşla yapabilirsiniz.
- **Uygulamaya Özel Kontroller:** Belirli uygulamalara özel (Chrome, Spotify ve Antigravity) tuşlar pencereleri aktif olduğunda otomatik görünür. Ayrıca YouTube'da video izlerken bir video kontrol barı açılmaktadır.

### Gelişmiş Araçlar
- **Dosya Transferi:** Mobil cihazınızdaki dosyaları (fotoğraf, doküman vb.) doğrudan bilgisayarınızın masaüstüne gönderebilirsiniz.
- **Dosya Gezgini:** Bilgisayarınızdaki sürücü ve klasörleri telefonunuzdan listeleyip yönetebilirsiniz.
- **Ekran Görüntüsü:** Bilgisayarınızın ekranını anlık olarak telefonunuzdan görebilirsiniz.
- **Sistem İstatistikleri:** Bilgisayarınızın CPU kullanımı, RAM durumu, aktif uygulama ve varsa GPU değerlerini canlı olarak izleyebilirsiniz.
- **Özel Komutlar:** Sık kullandığınız PowerShell veya CMD komutlarını uygulama üzerinden butonlara atayarak tek dokunuşla çalıştırabilirsiniz.

## Teknik Mimari

### Backend (Go)
Backend sunucusu, Windows'un yerel API'lerine (user32.dll, dwmapi.dll, psapi.dll) doğrudan erişim sağlamak için `syscall` paketini kullanır. Bu sayede düşük gecikme süresiyle pencere yönetimi ve girdi simülasyonu yapılır. Sunucu başlatıldığında yerel ağdaki IP adresini otomatik olarak tespit eder ve mobil uygulama ile kolay eşleşme için bir QR kod üretir. Mobil uygulamadan bu QR kod okutularak gerekli bağlantı bilgileri otomatik olarak sağlanır.

> **Not:** Sistem, yerel ağ (Wi-Fi) üzerinden HTTP protokolü ile haberleşir. Bilgisayarınız yerel bir sunucu (örneğin 192.168.1.x gibi) görevi görür ve mobil uygulama bu adrese istekler gönderir. Bu nedenle her iki cihazın da aynı ağa bağlı olması zorunludur.

### Mobil Uygulama (React Native)
Mobil uygulama, React Native ve Expo ile geliştirilmiştir:
- **Deck Ekranı:** Deck ekranındaki özelleştirilebilir 3D dokunsal butonlar ile telefonunuzu bir Stream Deck gibi kullanabilirsiniz. Ayrıca bu ekrandan bilgisayarınızı tek tuşla kilitleyebilirsiniz.
- **Doğrudan Komutlar:** Bilgisayarınıza doğrudan PowerShell komutları gönderebilirsiniz.
- **Ekran Aynalama:** Bilgisayarınızın anlık ekran görüntüsünü alabilirsiniz.
- **Kablosuz Klavye & Mouse:** Telefonu uzaktan klavye ve touchpad olarak kullanabilirsiniz.
- **Pencere Yönetimi:** Bilgisayarınızdaki açık olan pencereleri taşıyabilir veya kapatabilirsiniz.
- **Dosya Transferi & Gezgini:** Mobil cihazınızdan bilgisayara dosya gönderebilir, bilgisayardaki dosyaları gezebilirsiniz.
- **Canlı İstatistikler:** CPU, RAM ve GPU durumunu canlı takip edebilirsiniz.

## Kurulum ve Kullanım Talimatları

### Sunucunun Hazırlanması (Windows)
1. Bilgisayarınızda Go dilinin yüklü olduğundan emin olun.
2. `backend` dizinine gidin.
3. Gerekli kütüphaneleri yüklemek için terminalde `go mod tidy` komutunu çalıştırın.
4. `go run main.go` komutu ile sunucuyu başlatın.
5. Terminalde beliren QR kodu telefonunuza okutmak üzere hazır tutun.

### Mobil Uygulamanın Başlatılması
1. `PCKontrol` dizinine gidin.
2. `npm install` veya `yarn` komutu ile bağımlılıkları yükleyin.
3. `npx expo start` komutunu çalıştırın.
4. Expo Go uygulaması ile açın ve bilgisayarınızdaki QR kodu taratarak bağlantıyı kurun.

## Güvenlik Bildirimi

Bu uygulama, bilgisayar üzerinde tam yetkili komut çalıştırma (Remote Code Execution) ve dosya sistemi erişimi gibi güçlü özelliklere sahiptir. Güvenliğiniz için şu noktalara dikkat etmeniz önemlidir:
- Uygulamayı yalnızca güvendiğiniz yerel ağlarda (ev Wi-Fi gibi) kullanın.
- Sunucu portunu modem üzerinden dış dünyaya (Port Forwarding) açmayınız.
- Bilinmeyen veya güvenilmeyen ağlarda sunucuyu aktif bırakmayınız.

## Lisans ve Katkı

Bu proje eğitim ve kişisel kullanım amacıyla geliştirilmiştir. Geliştirilmesine katkıda bulunmak için Pull Request gönderebilir veya karşılaştığınız hataları Issues kısmından bildirebilirsiniz.

## İletişim
**sametbilal34@gmail.com** maili üzerinden bana ulaşabilirsiniz. Proje genel olarak çalışsa da eksik olan kısımları bulunmaktadır. Bu konuda yardım eden herkese teşekkür ederim.
