# ================================
# Stage 1: Builder (Bağımlılıkları yükle)
# ================================
FROM node:20-alpine AS builder

WORKDIR /app

# Sadece package dosyalarını kopyala (cache optimizasyonu)
COPY package*.json ./

# Production bağımlılıklarını yükle
RUN npm ci --only=production && npm cache clean --force

# ================================
# Stage 2: Runner (Final, küçük imaj)
# ================================
FROM node:20-alpine AS runner

# Güvenlik: Root olmayan kullanıcı oluştur
RUN addgroup -g 1001 -S nodejs && \
    adduser -S appuser -u 1001 -G nodejs

WORKDIR /app

# Builder stage'den sadece production node_modules'u al
COPY --from=builder --chown=appuser:nodejs /app/node_modules ./node_modules

# Uygulama kaynak kodunu kopyala
COPY --chown=appuser:nodejs . .

# Root olmayan kullanıcıya geç
USER appuser

# Kullanılacak port
EXPOSE 3000

# Sağlık kontrolü: 30sn bekle, her 15sn kontrol et
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

# Uygulamayı başlat
CMD ["node", "server.js"]
