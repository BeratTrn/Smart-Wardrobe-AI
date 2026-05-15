const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Smart Wardrobe AI API',
      version: '1.0.0',
      description:
        'Smart Wardrobe AI — Flutter mobil uygulaması için RESTful backend API.\n\n' +
        '**Kimlik doğrulama:** Korumalı tüm endpoint\'ler `Authorization: Bearer <token>` başlığı gerektirir.\n\n' +
        'Token `/api/auth/login`, `/api/auth/verify-email` veya `/api/auth/google` endpoint\'lerinden alınır.',
    },
    servers: [
      { url: '/', description: 'Aktif Sunucu (dev / prod)' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Login veya Google Auth işleminden aldığınız JWT token değerini girin.',
        },
      },
      schemas: {

        // ── Ortak hata yanıtı ─────────────────────────────────────────────
        ErrorResponse: {
          type: 'object',
          properties: {
            mesaj: { type: 'string', example: 'Bir hata oluştu.' },
          },
        },

        // ── Kullanıcı tercihleri ──────────────────────────────────────────
        Tercihler: {
          type: 'object',
          properties: {
            favoriStil:    { type: 'string', example: 'Günlük' },
            favoriRenkler: { type: 'array', items: { type: 'string' }, example: ['#2D405C', '#F5F0E8'] },
            bildirimler:   { type: 'boolean', example: true },
          },
        },

        // ── Vücut profili ─────────────────────────────────────────────────
        VucutProfili: {
          type: 'object',
          properties: {
            sekil: {
              type: 'string',
              enum: ['kum_saati', 'armut', 'ters_ucgen', 'dikdortgen'],
              example: 'kum_saati',
              description: 'Vücut şekli anahtarı',
            },
            kalip: {
              type: 'string',
              enum: ['slim', 'regular', 'oversize'],
              example: 'regular',
              description: 'Kalıp tercihi anahtarı',
            },
          },
        },

        // ── Kullanıcı profili ─────────────────────────────────────────────
        UserProfile: {
          type: 'object',
          properties: {
            id:            { type: 'string', example: '664abc123def456789012345' },
            kullaniciAdi:  { type: 'string', example: 'johndoe' },
            email:         { type: 'string', format: 'email', example: 'john@example.com' },
            profilFoto:    { type: 'string', example: 'https://res.cloudinary.com/.../photo.jpg' },
            tercihler:     { $ref: '#/components/schemas/Tercihler' },
            vucut:         { $ref: '#/components/schemas/VucutProfili' },
            createdAt:     { type: 'string', format: 'date-time' },
          },
        },

        // ── Kıyafet öğesi ─────────────────────────────────────────────────
        ClothingItem: {
          type: 'object',
          properties: {
            _id:          { type: 'string', example: '664abc123def456789012345' },
            kullanici:    { type: 'string', example: '664abc000def000000000001' },
            resimUrl:     { type: 'string', example: 'https://res.cloudinary.com/.../item.jpg' },
            kategori: {
              type: 'string',
              enum: ['Üst Giyim', 'Alt Giyim', 'Ayakkabı', 'Aksesuar', 'Tek Parça', 'Dış Giyim', 'Diğer'],
              example: 'Üst Giyim',
            },
            renk:         { type: 'string', example: '#2D405C' },
            mevsim: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['İlkbahar', 'Yaz', 'Sonbahar', 'Kış', 'Tüm Mevsimler'],
              },
              example: ['İlkbahar', 'Sonbahar'],
            },
            stil:         { type: 'string', example: 'Casual' },
            marka:        { type: 'string', example: 'Zara' },
            aiDogrulandi: { type: 'boolean', example: true },
            favori:       { type: 'boolean', example: false },
            createdAt:    { type: 'string', format: 'date-time' },
          },
        },

        // ── AI kombin ────────────────────────────────────────────────────
        Outfit: {
          type: 'object',
          properties: {
            _id:       { type: 'string', example: '664abc999def456789099999' },
            kullanici: { type: 'string' },
            baslik:    { type: 'string', example: 'Akşam Yemeği — İstanbul' },
            aciklama:  { type: 'string', example: 'Bu kombin İstanbul\'un serin akşamları için idealdir.' },
            ipucu:     { type: 'string', example: 'Renk paleti birbiriyle uyumlu; aksesuarlarla zenginleştirilebilir.' },
            kiyafetler: {
              type: 'array',
              items: { $ref: '#/components/schemas/ClothingItem' },
            },
            begeniSayisi: { type: 'integer', example: 3 },
            createdAt:    { type: 'string', format: 'date-time' },
          },
        },

        // ── Hava durumu ───────────────────────────────────────────────────
        WeatherData: {
          type: 'object',
          properties: {
            sicaklik:   { type: 'number', example: 18 },
            hissedilen: { type: 'number', example: 16 },
            durum:      { type: 'string', example: 'Parçalı Bulutlu' },
            nem:        { type: 'number', example: 65 },
            ruzgar:     { type: 'number', example: 12 },
            konum:      { type: 'string', example: 'Istanbul, TR' },
            ikon:       { type: 'string', example: '04d' },
          },
        },

        // ── Gardırop istatistikleri ───────────────────────────────────────
        WardrobeStats: {
          type: 'object',
          properties: {
            toplamKiyafet: { type: 'integer', example: 42 },
            kategoriler: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  _id:  { type: 'string', example: 'Üst Giyim' },
                  sayi: { type: 'integer', example: 15 },
                },
              },
            },
            renkler: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  _id:  { type: 'string', example: '#2D405C' },
                  sayi: { type: 'integer', example: 8 },
                },
              },
            },
          },
        },

        // ── Kayıtlı kombin (savedOutfitRoutes'tan bağımsız merkezi tanım) ─
        HavaDurumu: {
          type: 'object',
          properties: {
            sicaklik: { type: 'number', example: 18 },
            durum:    { type: 'string', example: 'Parçalı Bulutlu' },
            konum:    { type: 'string', example: 'İstanbul' },
          },
        },

      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);
module.exports = swaggerSpec;
