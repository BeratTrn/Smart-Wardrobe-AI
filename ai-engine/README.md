# 🧠 Smart Wardrobe - AI Engine (Yapay Zekâ Motoru)

Bu mikroservis; yüklenen kıyafet fotoğraflarını TensorFlow ve OpenCV kullanarak analiz eder. Kıyafetin kategorisini (Üst Giyim, Alt Giyim vb.) ve baskın Hex renk kodunu tespit eder.

## 🚀 Çalıştırma Adımları

Projeyi bilgisayarınızda çalıştırmak için terminalde sırasıyla şu adımları izleyin:

**1. Yapay Zeka Klasörüne Girin:**
\`\`\`bash
cd ai-engine
\`\`\`

**2. Sanal Ortamı Aktif Edin:**
\`\`\`bash
.\venv\Scripts\activate
\`\`\`

**3. Sunucuyu Başlatın:**
\`\`\`bash
uvicorn main:app --reload --port 8000
\`\`\`

Sistem başarıyla çalıştığında `http://127.0.0.1:8000/docs` adresinden Swagger test arayüzüne ulaşabilirsiniz.