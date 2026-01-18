# 📅 4. Proje Yönetimi

Bu bölüm, **Smart Wardrobe AI** projesinin yönetim felsefesini, zaman planlamasını, rol dağılımını ve versiyon kontrol stratejilerini detaylandırmaktadır.

> **Yönetim Felsefesi:** Belirsizlikleri yönetmek ve değişen gereksinimlere hızlı adapte olabilmek adına **Çevik (Agile)** proje yönetim yaklaşımı benimsenmiştir.

---

## 🔄 4.1. Proje Yönetim Yaklaşımı

Süreç, akademik takvime paralel olarak iki ana faza ayrılmış ve **Scrum** metodolojisinden esinlenerek yönetilmiştir.

| Faz | Dönem | Odak Noktası | Metodoloji |
| :--- | :--- | :--- | :--- |
| **1. Analiz ve Mimari** | 🍂 Güz Dönemi | Gereksinim analizi, Sistem tasarımı, Kağıt üzerinde doğrulama. | Şelale (Waterfall) benzeri planlama. |
| **2. İteratif Geliştirme** | 🌱 Bahar Dönemi | Kodlama, Test, Entegrasyon. | **Agile / Sprint** bazlı geliştirme (2-3 haftalık döngüler). |

---

## ⏱️ 4.2. Zaman Planlaması ve Takibi

Zaman yönetimi, **Kritik Yol (Critical Path)** analizi yapılarak oluşturulan Gantt Şeması üzerinden takip edilmektedir.

### 🛡️ "Önce Zor İşler" (Worst-First) Stratejisi
Proje takviminde sapmaları önlemek için riskli görevler öne çekilmiştir:
1.  **Yüksek Risk:** OpenAI Vision API Entegrasyonu & Backend Kurgusu (İlk Aşamalar).
2.  **Düşük Risk:** UI Giydirme & Renklendirme (Son Aşamalar).

*(Buraya Gantt Şeması görselini ekleyin: `![Gantt Şeması](images/gantt_chart.png)`)*

---

## 🎭 4.3. Rol Bazlı Görev Dağılımı

Proje bireysel bir çalışma olsa da, disiplini sağlamak amacıyla kurumsal bir yazılım ekibi simülasyonu uygulanmış ve sanal "Roller" atanmıştır.

| Rol (Şapka) | Sorumluluk Alanı |
| :--- | :--- |
| **Product Owner** | 📝 Kullanıcı hikayeleri, kapsam belirleme ve backlog yönetimi. |
| **System Architect** | 🏗️ Mikroservis mimarisi, DB şemaları ve API sözleşmeleri. |
| **UI/UX Designer** | 🎨 Figma wireframe ve yüksek sadakatli prototip çizimi. |
| **Backend Dev** | ⚙️ Node.js/Express API kodlaması ve JWT Auth yapısı. |
| **AI Engineer** | 🧠 OpenAI Vision & GPT prompt engineering kurgusu. |
| **Mobile Dev** | 📱 Flutter (Android/iOS) arayüz kodlaması. |
| **QA Engineer** | 🧪 Birim testler, Postman testleri ve hata raporlama. |
| **DevOps Engineer** | 🚀 Docker kurulumu ve GitHub Actions CI/CD pipeline'ı. |

---

## ue 4.4. Versiyon Kontrol Stratejisi (Gitflow)

Projenin kaynak kod yönetimi için **Git** ve **GitHub** kullanılmıştır. Kod kararlılığını korumak için **Gitflow Workflow** prensipleri uygulanmıştır.

### Dallanma (Branching) Yapısı
* `main`: Sadece canlıya alınabilir, test edilmiş **Production** kodu.
* `develop`: Güncel geliştirme sürümü.
* `feature/*`: Yeni özelliklerin geliştirildiği izole dallar.

### Gitflow Akış Diyagramı (Mermaid)

```mermaid
gitGraph
   commit id: "Initial Commit"
   branch develop
   checkout develop
   commit id: "Init Project"
   branch feature/auth
   checkout feature/auth
   commit id: "Login UI"
   commit id: "JWT Backend"
   checkout develop
   merge feature/auth
   branch feature/vision-api
   checkout feature/vision-api
   commit id: "OpenAI Setup"
   commit id: "Image Analysis"
   checkout develop
   merge feature/vision-api
   checkout main
   merge develop tag: "v1.0.0"