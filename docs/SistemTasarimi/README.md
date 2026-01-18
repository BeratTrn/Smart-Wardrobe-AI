# 🛠️ 2. Sistem Tasarımı

Bu bölüm, analiz aşamasında belirlenen gereksinimlerin teknik olarak nasıl hayata geçirileceğini detaylandırmaktadır. Projenin mimari yapısı, veritabanı şeması ve bileşenler arası entegrasyon stratejileri burada dokümante edilmiştir.

> **Tasarım Hedefi:** Yapay zeka servislerinin (Vision ve GPT) son kullanıcıya hızlı, güvenli ve ölçeklenebilir bir şekilde sunulması.

---

## 🏗️ 2.1. Mimari Tasarım

Sistem, modern bulut tabanlı uygulamalar için standart kabul edilen **İstemci-Sunucu (Client-Server)** mimarisi üzerine kurulmuştur. Uygulama katmanları birbirinden izole edilerek (Mikroservis Odaklı Katmanlı Mimari) bakım kolaylığı ve geliştirme esnekliği sağlanmıştır.

| Katman | Teknoloji / Açıklama |
| :--- | :--- |
| **📱 İstemci (Client)** | Mobil için **Flutter** (iOS/Android), Web yönetimi için **React.js**. |
| **🖥️ Sunucu (Server)** | İş mantığı ve AI orkestrasyonu için **Node.js + Express**. |
| **🗄️ Veri (Data)** | Esnek özellikler (renk, desen) için **MongoDB** (NoSQL). |
| **☁️ Dış Servisler** | **OpenAI Vision** (Görüntü), **GPT-4** (Öneri), **OpenWeather** (Hava Durumu). |

* **İletişim Protokolü:** HTTP/HTTPS üzerinden RESTful API.
* **Veri Formatı:** JSON.

---

## 🎨 2.2. Front-End Tasarımı

Kullanıcı arayüzü, **"Kullanılabilirlik"** ve **"Hız"** gereksinimleri gözetilerek tasarlanmıştır.

* **Prototip Aracı:** Figma
* **Tasarım Detayları:** [Tasarımlara Gitmek İçin Tıklayınız](../design/prototypes) *(Buraya Figma linki veya klasör yolu verebilirsiniz)*

---

## ⚙️ 2.3. Back-End Tasarımı

Tüm iş mantığı, güvenlik kontrolleri ve veri işleme süreçleri bu katmanda **MVC (Model-View-Controller)** tasarım deseni ile yönetilir.

### Kullanılan Teknoloji Yığını (Tech Stack)

* **Çalışma Ortamı:** `Node.js`
* **Web Framework:** `Express.js`
* **Kimlik Doğrulama:** `JSON Web Tokens (JWT)`
* **Güvenlik:** `Bcrypt.js` (Şifre Hashleme)
* **Dosya Yönetimi:** `Multer` (Görsel Yükleme)
* **AI Entegrasyonu:** `OpenAI SDK`

---

## 📊 2.4. Teknik Diyagramlar

Sistemin çalışma mantığını ve veri akışını görselleştirmek için hazırlanan UML diyagramları aşağıdadır.

### 2.4.1. Sınıf Diyagramı (Class Diagram)
Backend mimarisinin **"Separation of Concerns"** ilkesine göre ayrıştırılmış yapısını gösterir.
* **AuthManager:** Güvenlik ve oturum yönetimi.
* **WardrobeManager:** Kıyafet CRUD işlemleri ve `AIAnalysisService` tetikleyicisi.
* **OutfitRecommendationEngine:** `WeatherService` ve gardırop verisini birleştiren öneri motoru.

*(Buraya Sınıf Diyagramı görselini ekleyin: `![Class Diagram](images/class_diagram.png)`)*

### 2.4.2. Sıralama Diyagramı (Sequence Diagram)
**"Yapay Zeka Destekli Kombin Önerisi"** sürecindeki kritik veri akışını modeller. (Backend -> Weather API -> DB -> GPT -> Kullanıcı).

*(Buraya Sıralama Diyagramı görselini ekleyin: `![Sequence Diagram](images/sequence_diagram.png)`)*

### 2.4.3. Aktivite Diyagramı
Fotoğraf yükleme, format kontrolü ve AI analiz sonucunun onaylanması sürecindeki karar mekanizmalarını gösterir.

*(Buraya Aktivite Diyagramı görselini ekleyin: `![Activity Diagram](images/activity_diagram.png)`)*

### 2.4.4. Varlık İlişki Diyagramı (ER Diagram)
Veritabanı tasarımının merkezinde **User** varlığı bulunur.
* **İlişkiler:** User tablosu diğer tablolarla (Kıyafet, Kombin) 1-N ilişkiye sahiptir.
* **Optimizasyon:** Renk, Kategori gibi veriler Lookup tabloları ile normalize edilmiştir.
* **Kombin Yapısı:** `Outfit` ve `ClothItem` arasında N-N ilişki vardır.

*(Buraya ER Diyagramı görselini ekleyin: `![ER Diagram](images/er_diagram.png)`)*

### 2.4.5. Veri Akış Diyagramı (DFD)
Sistemin merkezde olduğu; Kullanıcı, OpenAI ve OpenWeather arasındaki veri giriş-çıkışlarını kuş bakışı gösteren bağlam diyagramıdır.

*(Buraya DFD görselini ekleyin: `![DFD](images/dfd.png)`)*

---

## 🔗 2.5. Sistem Entegrasyon Planı

Sistemi oluşturan dört ana bileşenin entegrasyon stratejisi:

### 1. İstemci - Sunucu
* Tüm iletişim **RESTful API** üzerinden sağlanır.
* Güvenlik, HTTP Header'da taşınan **Bearer Token (JWT)** ile sağlanır.

### 2. Veritabanı (ODM)
* Node.js ile MongoDB arasındaki bağlantı **Mongoose** kütüphanesi ile sağlanır.
* Veri tutarlılığı için şema validasyonları uygulanır.

### 3. Yapay Zeka (AI)
* **Görüntü İşleme:** Görseller Base64 formatında **OpenAI Vision API**'ye gönderilir.
* **Öneri Motoru:** Kullanıcı envanteri ve hava durumu "Prompt" haline getirilerek **GPT-4**'e iletilir.

### 4. Hava Durumu
* GPS koordinatları ile **OpenWeather API** sorgulanır.
* Performans için sunucu tarafında kısa süreli **Caching** (Önbellekleme) uygulanır.