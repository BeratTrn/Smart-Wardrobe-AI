# 🧪 3. Test Planı ve Senaryoları

Bu bölüm, **Smart Wardrobe AI** projesinin kalite güvence stratejilerini, test kapsamını ve hata yönetimi prosedürlerini detaylandırmaktadır.

> **Amaç:** Sistemin hem teknik tasarım gereksinimlerine (Verification) hem de son kullanıcı beklentilerine (Validation) uygunluğunu garanti altına almak.

---

## 🎯 3.1. Test Stratejisi

Test süreci, uluslararası standartlara uygun olarak iki temel yaklaşım üzerine kurgulanmıştır:

| Yaklaşım | Soru | Odak Noktası |
| :--- | :--- | :--- |
| **Verification (Doğrulama)** | *"Sistemi doğru inşa ediyor muyuz?"* | Backend servisleri, veritabanı şemaları, API standartları. |
| **Validation (Geçerleme)** | *"Doğru sistemi mi inşa ediyoruz?"* | OpenAI Vision/GPT sonuçlarının doğruluğu, kullanıcı deneyimi. |

### Başarı Kriterleri
* ✅ Kritik fonksiyon senaryolarının (Login, AI Analiz, Öneri) **%100** başarıyla geçmesi.
* ✅ Kritik (Critical) ve Yüksek (High) öncelikli hataların **tamamen** giderilmesi.
* ✅ Vision API doğruluk oranının **%85+** olması.

---

## 🏗️ 3.2. Test Türleri (Test Piramidi)

Projenin çok katmanlı mimarisine (Mobil, Web, Backend, AI) uygun olarak aşağıdaki test seviyeleri uygulanır:

### 1. 🧩 Unit Test (Birim Testler)
Sistemin en küçük yapı taşlarının izole test edilmesidir.
* **Backend:** JWT doğrulama, filtreleme algoritmaları (Jest).
* **Mobil:** Form validasyonları, Model serileştirme (Flutter Test).
* **Yöntem:** Harici bağımlılıklar (OpenAI, DB) **Mock** nesnelerle taklit edilir.

### 2. 🔌 Integration Test (Entegrasyon Testi)
Modüller arası haberleşmenin doğrulanmasıdır.
* Node.js <-> MongoDB veri akışı.
* Backend <-> OpenAI Vision API transferi.
* **Ortam:** Docker üzerinde izole test veritabanı.

### 3. 🖥️ System Test (Sistem Testi)
Uçtan uca (E2E) akışın test edilmesidir.
* *Örnek:* Fotoğraf çek -> Yükle -> Analiz Et -> Sonucu Göster.

### 4. 🤝 Acceptance Test (Kabul Testi)
Yapay zeka çıktılarının "mantıklı" olup olmadığının kontrolüdür.
* *Örnek:* Yağmurlu havada "Sandalet" önermemesi.

---

## 🛠️ 3.3. Test Araçları ve Ortam

Üretim ortamından izole edilmiş, sentetik verilerle (Faker.js) beslenen bir test ortamı kullanılır.

| Katman | Araç / Teknoloji | Kullanım Amacı |
| :--- | :--- | :--- |
| **Backend** | `Jest` / `Supertest` | API ve Birim testleri. |
| **Mobil** | `Flutter Test` | Widget ve akış testleri. |
| **API** | `Postman` / `Swagger` | Manuel uç nokta testleri. |
| **Mocking** | `Nock` / `Mockito` | Dış servis simülasyonu. |
| **Database** | `MongoDB Memory Server` | RAM üzerinde çalışan geçici test DB. |
| **DevOps** | `GitHub Actions` | Otomatik test koşumu (CI). |
| **Kalite** | `ESLint` / `SonarQube` | Statik kod analizi. |

---

## 📋 3.4. Kritik Test Senaryoları

Kullanıcı hikayelerine dayanan temel senaryo örnekleri:

### 📸 Vision API (Kıyafet Yükleme)
* **Pozitif:** Net bir "Mavi Kot" fotoğrafı yüklenir → Sistem "Pantolon / Mavi" olarak etiketler.
* **Negatif:** Manzara fotoğrafı yüklenir → "Kıyafet algılanamadı" hatası döner.

### 🧠 GPT & Context (Kombin Önerisi)
* **Senaryo (Yağmur):** Hava yağmurlu → Öneride "Bot" veya "Yağmurluk" olmalı.
* **Senaryo (İş):** Etkinlik "Toplantı" → Öneride "Şort" olmamalı, "Gömlek" olmalı.
* **Hata Durumu:** Boş dolap ile öneri isteme → "Önce kıyafet ekleyin" uyarısı.

### 🧪 Örnek Test Case Tablosu

| ID | Test Adı | Girdi | Beklenen Çıktı |
| :--- | :--- | :--- | :--- |
| **TC-10** | Vision API Doğruluk | `Kırmızı_Kazak.jpg` | JSON: `{cat: "Sweater", col: "Red"}` |
| **TC-11** | Login Başarılı | `demo@test.com` / `123456` | `HTTP 200` + `JWT Token` |
| **TC-12** | Kışlık Kombin | Hava: `-5°C` | Öneri: `Mont` içermeli. |
| **TC-13** | Geçersiz Dosya | `odev.pdf` | Hata: `Sadece resim yüklenebilir.` |

---

## 🐞 3.6. Hata Yönetimi (Bug Tracking)

Hatalar **Jira** üzerinde takip edilir ve aşağıdaki yaşam döngüsüne tabidir.

### Hata Yaşam Döngüsü (Mermaid Diyagramı)

```mermaid
stateDiagram-v2
    [*] --> Open: Hata Tespit Edildi
    Open --> InProgress: Geliştirici Atandı
    InProgress --> Resolved: Kod Düzeltildi
    Resolved --> Verified: Test Uzmanı Onayladı
    Verified --> Closed: Hata Kapandı
    Resolved --> Open: Düzeltme Başarısız (Re-open)