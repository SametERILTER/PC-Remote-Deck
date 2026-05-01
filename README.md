# PCKontrol - Uzaktan Bilgisayar Kontrol Sistemi

[English Version (README_EN.md)](README_EN.md)

PCKontrol, modern yazılım teknolojileri kullanarak Windows işletim sistemli bilgisayarların mobil cihazlar üzerinden tam yetkiyle yönetilmesini sağlayan açık kaynaklı bir projedir. Bu sistem, özellikle yatağınızdan veya koltuğunuzdan kalkmadan bilgisayarınızı yönetmenize, medya içeriklerini kontrol etmenize ve dosya transferi yapmanıza olanak tanır.

## Proje Hakkında

Sistem iki temel parçadan oluşmaktadır:
1. Windows işletim sistemi üzerinde çalışan ve düşük sistem kaynağı tüketen Go dilinde yazılmış bir sunucu (Backend).
2. React Native ve Expo ile geliştirilmiş, hem Android hem de iOS cihazlarda çalışabilen modern bir mobil uygulama.

## Detaylı Özellikler

### Uzaktan Kontrol ve Girdi Yönetimi
- Mouse Simülasyonu: Telefon ekranını bir touchpad gibi kullanarak imleci pürüzsüz bir şekilde hareket ettirebilir, tıklama yapabilir ve kaydırma (scroll) işlemlerini gerçekleştirebilirsiniz.
- Klavye Entegrasyonu: Telefon klavyesini kullanarak bilgisayara metin gönderebilir, özel tuş kombinasyonlarını (Alt+Tab, Enter, Backspace vb.) çalıştırabilirsiniz.

### Multimedya ve Uygulama Yönetimi
- Ses Kontrolü: Bilgisayarın ses seviyesini hassas bir şekilde ayarlayabilir veya tamamen sessize alabilirsiniz.
- Medya Oynatıcı: Spotify ve diğer medya oynatıcılar için oynat, duraklat, sonraki ve önceki şarkı gibi kontrolleri kullanabilirsiniz.
- Tarayıcı Kısayolları: Google Chrome üzerinde yeni sekme açma, sekme kapatma, sayfayı yenileme ve gizli sekme gibi işlemleri tek tuşla yapabilirsiniz.
- Belirli uygulamalara özel (şimdilik sadece Chrome, Spotify ve Antigravity de geçerli) tuşlar otomatik olarak o uygulamaların pencereleri aktif olduğunda görünür. Ayrıca Youtube'da video izlerken bir video kontrol barı çıkmaktadır.

### Gelişmiş Araçlar
- Dosya Transferi: Mobil cihazınızdaki dosyaları (fotoğraf, doküman vb.) doğrudan bilgisayarınızın masaüstüne gönderebilirsiniz.
- Ekran Görüntüsü: Bilgisayarınızın ekranını anlık olarak telefonunuzdan görebilirsiniz.
- Sistem İstatistikleri: Bilgisayarınızın CPU kullanımı, RAM durumu, aktif ve eğer varsa NVIDIA GPU değerlerini (sıcaklık ve kullanım) canlı olarak izleyebilirsiniz.
- Özel Komutlar: Sık kullandığınız PowerShell veya CMD komutlarını uygulama üzerinden butonlara atayarak tek dokunuşla çalıştırabilirsiniz.

## Teknik Mimari

### Backend (Go)
Backend sunucusu, Windows'un yerel API'lerine (user32.dll, dwmapi.dll, psapi.dll) doğrudan erişim sağlamak için syscall paketini kullanır. Bu sayede düşük gecikme süresiyle pencere yönetimi ve girdi simülasyonu yapılır. Sunucu başlatıldığında yerel ağdaki IP adresini otomatik olarak tespit eder ve mobil uygulama ile kolay eşleşme için bir QR kod üretir. Mobil uygulamadan bu QR kod okutularak gerekli bağlantı bilgileri otomatik olarak sağlanır.

#### Not: Sistem, yerel ağ (Wi-Fi) üzerinden HTTP protokolü ile haberleşir. Bilgisayarınız yerel bir sunucu (örneğin 192.168.1.x gibi) görevi görür ve mobil uygulama bu adrese istekler gönderir. Bu nedenle her iki cihazın da aynı ağa bağlı olması zorunludur.

### Mobil Uygulama (React Native)
Mobil uygulama, React Native ve Expo ile geliştirilmiştir. React Native Reanimated ile pürüzsüz ve akıcı animasyonlar sağlanmıştır. Uygulama ile:
- #### Deck ekranı:
     Deck ekranındaki özelleştirilebilir butonlar ile telefonunuzu bir stream deck gibi kullanabilirsiniz. Ayrıca yine bu ekrandan bilgisayarınızı tek tuşka kilitleyebilirsiniz.

- Bilgisayarınıza direkt powershell komutları gönderebilirsiniz.
- Bilgisayarınızın anlık ekran görünütüsünü alabilirsiniz.
- Telefonu uzaktan klavye ve mouse olarak kullanabilirsiniz.
- Bilgisayarınızdaki açık olan pencereleri yönetebilirsiniz. (Henüz tam anlamıyla düzgün çalışmıyor)
- Telefonunuzdan bilgisayarınıza hızlı bir şekilde dosya gönderebilirsiniz (Şimdilik sadece tek resim gönderilebiliyor)
- Modlar sayfasıyla tek tuşla birbiri ardınca gelen komutları yerine getirebilirsiniz.
- İstatistikler sayfasında bilgisayarınızın anlık CPU, RAM ve GPU bilgilerini görebilirsiniz.
- Ses kontrolü ile bilgisayarınızın ses seviyesini ayarlayabilir veya tamamen sessize alabilirsiniz. (Ses kaydırıcısı henüz tam düzgün çalışmıyor)

## Kurulum ve Kullanım Talimatları

### Sunucunun Hazırlanması (Windows)
1. Bilgisayarınızda Go dilinin yüklü olduğundan emin olun.
2. backend dizinine gidin.
3. Gerekli kütüphaneleri yüklemek için terminalde go mod tidy komutunu çalıştırın.
4. go run main.go komutu ile sunucuyu başlatın.
5. Terminalde beliren QR kodu telefonunuza okutmak üzere hazır tutun.

### Mobil Uygulamanın Başlatılması
1. PCKontrol dizinine gidin.
2. npm install veya yarn komutu ile bağımlılıkları yükleyin.
3. npx expo start komutunu çalıştırın.
4. Expo Go uygulaması veya oluşturduğunuz build ile uygulamayı açın.
5. Ayarlar kısmından veya ana ekrandan bilgisayarınızdaki QR kodu taratarak bağlantıyı kurun.

## Güvenlik Bildirimi

Bu uygulama, bilgisayar üzerinde tam yetkili komut çalıştırma (Remote Code Execution) ve dosya sistemi erişimi gibi güçlü özelliklere sahiptir. Güvenliğiniz için şu noktalara dikkat etmeniz önemlidir:
- Uygulamayı yalnızca güvendiğiniz yerel ağlarda (ev Wi-Fi gibi) kullanın.
- Sunucu portunu modem üzerinden dış dünyaya (Port Forwarding) açmayınız.
- Bilinmeyen veya güvenilmeyen ağlarda sunucuyu aktif bırakmayınız.

## Lisans ve Katkı

Bu proje eğitim ve kişisel kullanım amacıyla geliştirilmiştir. Geliştirilmesine katkıda bulunmak için Pull Request gönderebilir veya karşılaştığınız hataları Issues kısmından bildirebilirsiniz.

## İletişim
sametbilal34@gmail.com maili üzerinden bana ulaşabilirsiniz. Proje genel olarak çalışsa da eksik olan kısımları bulunmaktadır. Bu konuda yardım eden herkese teşekkür ederim.
