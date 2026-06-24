// SmartWardrobeAI — k6 Yük Testi
// Kullanım: k6 run load-test.js
// Render canlı ortamına karşı çalışır

import { check, sleep } from 'k6';
import http from 'k6/http';
import { Rate, Trend } from 'k6/metrics';

// Özel Metrikler
const errorRate = new Rate('error_rate');
const loginDuration = new Trend('login_duration', true);
const weatherDuration = new Trend('weather_duration', true);
const itemsDuration = new Trend('items_duration', true);
const outfitDuration = new Trend('outfit_duration', true);

// Konfigürasyon
const BASE_URL = __ENV.BASE_URL || 'https://smart-wardrobe-ai-2nwd.onrender.com/api';

// Test aşamaları: yavaş yüksel → zirve → düşüş
export const options = {
  stages: [
    { duration: '30s', target: 5  },  // Isınma: 5 kullanıcıya çık
    { duration: '1m',  target: 10 },  // Yük: 10 eş zamanlı kullanıcı
    { duration: '30s', target: 20 },  // Zirve: 20 kullanıcı
    { duration: '30s', target: 0  },  // Soğuma
  ],
  thresholds: {
    // Başarı kriterleri
    http_req_failed:   ['rate<0.05'],       // %5'ten az hata
    http_req_duration: ['p(95)<5000'],      // %95 istek 5sn altında
    error_rate:        ['rate<0.05'],       // Özel hata oranı
    login_duration:    ['p(95)<5000'],      // Login 5sn altında
    weather_duration:  ['p(95)<3000'],      // Weather 3sn altında
    items_duration:    ['p(95)<3000'],      // Items 3sn altında
  },
};

// Yardımcı: Login ve token al
function getToken() {
  const payload = JSON.stringify({
    email: __ENV.TEST_EMAIL || 'loadtest@smartwardrobe.com',
    password: __ENV.TEST_PASSWORD || 'LoadTest123!',
  });

  const params = {
    headers: { 'Content-Type': 'application/json' },
    timeout: '10s',
  };

  const start = Date.now();
  const res = http.post(`${BASE_URL}/auth/login`, payload, params);
  loginDuration.add(Date.now() - start);

  const ok = check(res, {
    'login 200': (r) => r.status === 200,
    'token mevcut': (r) => {
      try { return JSON.parse(r.body).token !== undefined; }
      catch { return false; }
    },
  });

  errorRate.add(!ok);

  if (res.status !== 200) return null;
  try { return JSON.parse(res.body).token; }
  catch { return null; }
}

// Ana Test Senaryosu
export default function () {
  // 1. Health Check (auth gerektirmez)
  const healthRes = http.get(`${BASE_URL}/health`, { timeout: '5s' });
  check(healthRes, { 'health 200': (r) => r.status === 200 });
  errorRate.add(healthRes.status !== 200);

  sleep(0.5);

  // 2. Login
  const token = getToken();
  if (!token) {
    sleep(1);
    return;
  }

  const authHeaders = {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    timeout: '10s',
  };

  sleep(0.5);

  // 3. Kıyafet listesi
  const itemsStart = Date.now();
  const itemsRes = http.get(`${BASE_URL}/items`, authHeaders);
  itemsDuration.add(Date.now() - itemsStart);
  check(itemsRes, { 'items 200': (r) => r.status === 200 });
  errorRate.add(itemsRes.status !== 200);

  sleep(0.5);

  // 4. Hava durumu (cache testi için aynı koordinat)
  const weatherStart = Date.now();
  const weatherRes = http.get(`${BASE_URL}/weather?city=Istanbul`, authHeaders);
  weatherDuration.add(Date.now() - weatherStart);
  check(weatherRes, { 'weather 200': (r) => r.status === 200 });
  errorRate.add(weatherRes.status !== 200);

  sleep(0.5);

  // 5. İstatistikler
  const statsRes = http.get(`${BASE_URL}/stats/wardrobe`, authHeaders);
  check(statsRes, { 'stats 200': (r) => r.status === 200 });
  errorRate.add(statsRes.status !== 200);

  sleep(1);
}

// Özet Rapor 
export function handleSummary(data) {
  const passed = data.metrics.http_req_failed.values.rate < 0.05;

  console.log('\n========================================');
  console.log('  SmartWardrobeAI — Yük Testi Sonuçları');
  console.log('========================================');
  console.log(`Toplam İstek     : ${data.metrics.http_reqs.values.count}`);
  console.log(`Hata Oranı       : %${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}`);
  console.log(`Ort. Yanıt Süresi: ${data.metrics.http_req_duration.values.avg.toFixed(0)}ms`);
  console.log(`p95 Yanıt Süresi : ${data.metrics.http_req_duration.values['p(95)'].toFixed(0)}ms`);
  console.log(`Sonuç            : ${passed ? '✅ BAŞARILI' : '❌ BAŞARISIZ'}`);
  console.log('========================================\n');

  return {
    'load-test-results.json': JSON.stringify(data, null, 2),
  };
}
