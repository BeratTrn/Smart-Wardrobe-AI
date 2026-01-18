# 📋 Gereksinim Analizi ve Kullanıcı Hikayeleri

Bu doküman, **Smart Wardrobe AI** projesinin kapsamını, kullanıcı ihtiyaçlarını, fonksiyonel/teknik gereksinimleri ve risk analizlerini detaylandırmaktadır. Analiz süreci, Yazılım Geliştirme Yaşam Döngüsü (SDLC) standartlarına uygun olarak hazırlanmıştır.

---

## 📖 2.1. Proje Tanımı

**Smart Wardrobe AI**, kullanıcıların gardıroplarını dijitalleştirerek tek bir platformda yönetmelerini sağlayan ve yapay zekâ desteğiyle kişiselleştirilmiş stil önerileri sunan akıllı bir asistan uygulamasıdır.

* **Temel Amaç:** Modern şehir insanının yaşadığı *"karar yorgunluğu"* (decision fatigue) problemine ve *"dolap dolu ama giyecek bir şey yok"* paradoksuna çözüm getirmek.
* **Teknoloji:** * 📸 **OpenAI Vision API:** Kıyafet fotoğraflarını analiz eder (Tür, Renk, Desen).
    * 🧠 **OpenAI GPT Modelleri:** Hava durumu ve etkinlik türüne göre kombin önerir.
    * 🌦️ **OpenWeather API:** Anlık hava durumu verisi sağlar.
* **Mimari:** Flutter (Mobil), React (Web), Node.js (Backend), MongoDB/Firebase (Veritabanı).

---

## 🎯 2.2. Hedef Kitle Analizi

Proje, giyim alışkanlıklarını dijitalleştirmek isteyen aşağıdaki öncelikli profillere hitap eder:

* 👔 **Yoğun Çalışan Profesyoneller:** Sabahları zaman kaybetmek istemeyen, iş ortamına uygun hızlı öneri arayanlar.
* ✨ **Moda ve Stil Meraklıları:** Gardırop istatistiği tutmak ve stilini optimize etmek isteyenler.
* 🧘 **Düzen ve Minimalizm Arayanlar:** Gereksiz alışverişten kaçınan ve dijital envanter takibi yapan bilinçli tüketiciler.
* 🤔 **Karar Vermekte Zorlananlar:** "Analiz felci" yaşayan ve dışsal bir onaya ihtiyaç duyan bireyler.

---

## 👥 2.3. Paydaşlar ve Kullanıcı Profilleri

### Paydaşlar
* **Son Kullanıcılar:** Gardırobunu yöneten ve öneri alan kişiler.
* **Geliştirici:** Mimari tasarım, kodlama ve AI entegrasyonu sorumlusu.
* **Sistem Yöneticisi (Admin):** Sistem sağlığı ve veri güvenliği sorumlusu.
* **API Sağlayıcılar:** OpenAI & OpenWeather.

### Kullanıcı Profilleri
1.  **Standart Kullanıcı:** Fotoğraf yükleyen, etiket onaylayan ve günlük öneri alan temel profil.
2.  **Premium Kullanıcı (Vizyon):** Stil danışmanlığı ve detaylı istatistiklere erişen profil.
3.  **Admin Kullanıcı:** İçerik denetimi ve sistem yönetimi yapan profil.

---

## 🔭 2.4. Proje Kapsamı (Scope)

### ✅ Kapsam Dahilinde (In-Scope)
* **Otomatik Envanter (Vision AI):** Fotoğraftan tür, renk ve desen tespiti.
* **Bağlamsal Kombin Motoru (Generative AI):** Hava durumu + Etkinlik + Envanter bazlı kombin üretimi.
* **Çoklu Platform:** Android, iOS (Flutter) ve Web (React) desteği.
* **Dijital Gardırop Arayüzü:** Filtreleme, düzenleme ve sanal görüntüleme.
* **Güvenli Veri Yönetimi:** JWT Auth ve şifreli veri saklama.

### ❌ Kapsam Dışı (Out-of-Scope)
* E-Ticaret ve uygulama içi satış.
* Sanal Deneme (Virtual Try-On / AR).
* Sosyal ağ ve takip özellikleri.

---

## 📝 2.5. Kullanıcı Hikayeleri (User Stories)

| ID | Hikaye | Rol | Öncelik | Amaç & Değer | Kabul Kriterleri |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **US-01** | **Kayıt ve Giriş** | Son Kullanıcı | Yüksek | **Amaç:** Güvenli erişim.<br>**Değer:** Gizlilik. | • E-posta/Şifre kayıt.<br>• JWT oturumu.<br>• Hata mesajları. |
| **US-02** | **Fotoğraftan Otomatik Ekleme** | Son Kullanıcı | Yüksek | **Amaç:** Hızlı veri girişi.<br>**Değer:** Zaman tasarrufu. | • Vision API tetiklenmeli.<br>• Renk/Tür dolmalı.<br>• Düzenlenebilmeli. |
| **US-03** | **Manuel Düzenleme** | Son Kullanıcı | Orta | **Amaç:** AI hatalarını düzeltme.<br>**Değer:** Doğruluk. | • Etiket değiştirme.<br>• Kıyafet silme. |
| **US-04** | **Bağlamsal Öneri** | Son Kullanıcı | Yüksek | **Amaç:** Ortama uygunluk.<br>**Değer:** Hızlı karar. | • Konum/Hava durumu analizi.<br>• "İş" için resmi öneri.<br>• Yağmur kontrolü. |
| **US-05** | **İstatistik** | Son Kullanıcı | Düşük | **Amaç:** Dağılımı görme.<br>**Değer:** Alışveriş yönetimi. | • Renk/Kategori grafikleri. |

---

## ⚙️ 2.6. Gereksinim Analizi

### 2.6.1. Fonksiyonel Gereksinimler (FR)

| ID | Gereksinim Tanımı | İlgili US | Bileşen | Öncelik |
| :--- | :--- | :--- | :--- | :--- |
| **FR-01** | Kullanıcılar güvenli (hashed) hesap oluşturabilmeli ve giriş yapabilmelidir. | US-01 | Backend (Auth) | Yüksek |
| **FR-02** | Yüklenen görsel Vision API ile analiz edilip JSON (Etiketler) ayrıştırılmalıdır. | US-02 | Backend/AI | Yüksek |
| **FR-03** | GPS verisi ile OpenWeather API'den anlık hava durumu sorgulanmalıdır. | US-04 | Backend/Ext | Yüksek |
| **FR-04** | Envanter + Hava + Etkinlik bilgisi ile GPT modelinden prompt yoluyla öneri alınmalıdır. | US-04 | AI Engine | Yüksek |
| **FR-05** | Kıyafet özellikleri manuel güncellenebilmeli ve silinebilmelidir (CRUD). | US-03 | Database | Orta |
| **FR-06** | Gardırop verileri analiz edilerek istatistiksel grafikler sunulmalıdır. | US-05 | Frontend | Düşük |

### 2.6.2. Fonksiyonel Olmayan Gereksinimler (NFR)

| ID | Kategori | Detaylar ve Kriterler |
| :--- | :--- | :--- |
| **NFR-01** | **Performans** | • Kombin önerisi < 5 sn.<br>• Fotoğraf analizi < 10 sn. |
| **NFR-02** | **Doğruluk** | • Vision API etiketleme doğruluğu > %85. |
| **NFR-03** | **Güvenlik** | • Bcrypt şifreleme.<br>• HTTPS/SSL trafiği.<br>• Süreli JWT token. |
| **NFR-04** | **Kullanılabilirlik** | • Kıyafet ekleme işlemi < 3 adım. |
| **NFR-05** | **Ölçeklenebilirlik**| • Asenkron Node.js mimarisi. |

### 2.6.3. Gereksinim İzlenebilirlik Matrisi

| ID | Tanım | Tür | Öncelik | Paydaş | Doğrulama |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **REQ-01** | Kayıt ve Giriş | Fonk. | Yüksek | Son Kullanıcı | Birim Testi |
| **REQ-02** | Otomatik Etiketleme | Fonk. | Yüksek | Son Kullanıcı | Entegrasyon Testi |
| **REQ-03** | Hava Durumu Bazlı Kombin | Fonk. | Yüksek | Son Kullanıcı | Senaryo Testi |
| **REQ-04** | API Yanıt Süresi < 5sn | Non-Fonk. | Orta | Geliştirici | Yük Testi |
| **REQ-05** | Manuel Düzenleme | Fonk. | Orta | Son Kullanıcı | Kabul Testi (UAT) |
| **REQ-06** | Veri Şifreleme | Non-Fonk. | Yüksek | Yönetici | Güvenlik Tarama |

---

## ⚠️ 2.7. Risk Analizi ve Önleme

| ID | Risk | Tür | Olasılık | Etki | Önleme Stratejisi |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **R-01** | **API Maliyet Artışı:** Ücretli API çağrılarının bütçeyi aşması. | Maliyet | Yüksek | Yüksek | • Caching (Önbellekleme).<br>• Geliştirmede Mock Data kullanımı. |
| **R-02** | **Görsel Analiz Hataları:** Karmaşık desenlerin yanlış etiketlenmesi. | Teknik | Orta | Orta | • Kullanıcıya manuel düzenleme yetkisi verilmesi. |
| **R-03** | **API Kesintisi:** Dış servislerin (OpenAI/Weather) çökmesi. | Teknik | Düşük | Yüksek | • Try-Catch blokları.<br>• Offline mod veya son başarılı veriyi gösterme. |
| **R-04** | **Veri İhlali:** Gardırop görsellerinin sızdırılması. | Güvenlik | Düşük | Çok Yüksek | • Veritabanı erişim kısıtlaması.<br>• Sıkı Cloud Storage kuralları. |