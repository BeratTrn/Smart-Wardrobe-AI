# 🚀 5. DevOps Entegrasyonu

Bu bölüm, **Smart Wardrobe AI** projesinin geliştirme (Dev) ve operasyon (Ops) süreçlerini birleştirerek yazılım kalitesini artırmak için kurgulanan stratejileri kapsamaktadır.

> **Hedef:** Manuel müdahale olmadan, sürekli test edilen ve güvenli bir şekilde canlıya alınan (CI/CD) sürdürülebilir bir sistem kurmak.

---

## 🔄 5.1. DevOps Yaklaşımı ve Strateji

Projenin hibrit yapısı (Mobil + Backend + AI) nedeniyle modern bir DevOps yaklaşımı benimsenmiştir. Strateji iki temel prensibe dayanır:

1.  **Sürekli Entegrasyon (CI):** Her kod değişikliği (`push`) otomatik olarak test edilir ve derlenir.
    * *Amaç:* Kırık kodun ana sisteme karışmasını engellemek.
2.  **Sürekli Dağıtım (CD):** Testleri geçen kodlar otomatik paketlenir (Docker/APK) ve sunucuya gönderilir.
    * *Amaç:* Hızlı ve hatasız sürüm geçişi.

---

## 🐳 5.3. Konteynerizasyon (Docker)

Uygulamanın "her ortamda aynı çalışması" (consistency) prensibi gereği **Konteyner Tabanlı Mimari** kullanılmıştır.

* **Backend İzolasyonu:** Node.js servisleri `Dockerfile` ile imaj haline getirilir. İşletim sistemi farkları (Windows/Mac/Linux) ortadan kalkar.
* **Orchestration:** `Docker Compose` ile API, MongoDB ve Redis tek komutla ayağa kaldırılır.

---

## 🤖 5.4. Otomasyon Planı (Build – Test – Quality)

Her kod değişikliğinde tetiklenen otomatik adımlar:

### 1. Build (Derleme)
* **Backend:** `npm install` -> `docker build`
* **Mobil:** `flutter pub get` -> `flutter build apk`

### 2. Test Otomasyonu
* **Jest:** Backend API ve iş mantığı testleri.
* **Flutter Test:** Mobil arayüz widget testleri.

### 3. DevSecOps (Güvenlik)
* **Linting:** `ESLint` ve `Flutter Analyze` ile kod standartları kontrolü.
* **Security Scan:** `npm audit` ile güvenlik açığı olan kütüphanelerin taranması.
* **Secret Scanning:** API anahtarlarının (OpenAI Key) kod içinde unutulup unutulmadığının kontrolü.

---

## 📊 5.5. CI/CD Akış Tablosu

Geliştiricinin kodu göndermesinden canlıya alınmasına kadar geçen teknik süreç:

| Aşama | Girdi | İşlem | Araç | Çıktı |
| :--- | :--- | :--- | :--- | :--- |
| **1. Push** | Kaynak Kod | Kodun GitHub'a gönderilmesi | **Git** | Güncel Repo |
| **2. Trigger** | Webhook | Workflow'un tetiklenmesi | **GitHub Actions** | Sanal Sunucu (Runner) |
| **3. Analiz** | Kod | Linting ve Güvenlik Taraması | **ESLint / npm audit** | Temiz Kod Raporu |
| **4. Test** | Test Dosyaları | Birim testlerin koşulması | **Jest** | Test Başarısı |
| **5. Build** | Onaylı Kod | Docker imajının oluşturulması | **Docker** | `api:latest` İmajı |
| **6. Deploy** | Docker Image | İmajın buluta yüklenmesi | **Render / Cloud Run** | Canlı API |
| **7. Notify** | Durum | Sonucun ekibe bildirilmesi | **Slack** | Bildirim Mesajı |

---

## 🛠️ 5.6. DevOps Araç Seti (Tech Stack)

| Kategori | Araç | Seçim Nedeni |
| :--- | :--- | :--- |
| **VCS** | ![GitHub](https://img.shields.io/badge/-GitHub-181717?style=flat&logo=github&logoColor=white) | Sektör standardı, Issue takibi. |
| **CI/CD** | ![GitHub Actions](https://img.shields.io/badge/-GitHub_Actions-2088FF?style=flat&logo=github-actions&logoColor=white) | Repo ile entegre, ücretsiz runner. |
| **Container** | ![Docker](https://img.shields.io/badge/-Docker-2496ED?style=flat&logo=docker&logoColor=white) | İzolasyon ve taşınabilirlik. |
| **Cloud** | ![Render](https://img.shields.io/badge/-Render-46E3B7?style=flat&logo=render&logoColor=white) | Kolay Docker dağıtımı (PaaS). |

---

## 📈 5.7. DevOps Pipeline Mimarisi

Aşağıdaki diyagram, yerel ortamdan canlı ortama (Production) giden otomatik yolu görselleştirmektedir.

```mermaid
graph LR
    Dev[💻 Geliştirici] -->|Commit & Push| Repo[GitHub Repo]
    Repo -->|Trigger| CI[⚙️ GitHub Actions CI]
    
    subgraph "CI Pipeline"
        CI -->|1. Install| Deps[Bağımlılıklar]
        Deps -->|2. Lint & Scan| Sec[Güvenlik Taraması]
        Sec -->|3. Test| Tests[Birim Testler]
        Tests -->|4. Build| Image[Docker Image]
    end
    
    Image -->|Push| Registry[Docker Registry]
    Registry -->|Deploy| Cloud[☁️ Canlı Sunucu (Render)]
    
    Cloud -->|Monitor| Status[✅ Sistem Ayakta]
    
    style CI fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    style Cloud fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px