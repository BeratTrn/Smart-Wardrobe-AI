import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:smart_wardrobe_ai/core/constants/api_constants.dart';
import 'package:smart_wardrobe_ai/data/models/generated_outfit.dart';
import 'package:smart_wardrobe_ai/data/models/saved_outfit.dart';

/// Sunucudan gelen AI analiz sonucu (önizleme veya kayıt sonrası)
class AiAnalysisResult {
  final String kategori;
  final String renk;
  final bool aiDogrulandi;

  const AiAnalysisResult({
    required this.kategori,
    required this.renk,
    required this.aiDogrulandi,
  });

  /// POST /api/items/analyze-only yanıtı:  { analiz: { kategori, renk, aiDogrulandi } }
  /// POST /api/items/add yanıtı:           { kiyafet: { kategori, renk, aiDogrulandi, ... } }
  factory AiAnalysisResult.fromJson(Map<String, dynamic> json) {
    // analyze-only yanıt yapısı
    if (json.containsKey('analiz')) {
      final a = json['analiz'] as Map<String, dynamic>;
      return AiAnalysisResult(
        kategori: a['kategori'] as String? ?? 'Diğer',
        renk: a['renk'] as String? ?? '',
        aiDogrulandi: a['aiDogrulandi'] as bool? ?? false,
      );
    }
    // items/add yanıt yapısı
    final kiyafet = json['kiyafet'] as Map<String, dynamic>? ?? {};
    return AiAnalysisResult(
      kategori: kiyafet['kategori'] as String? ?? 'Diğer',
      renk: kiyafet['renk'] as String? ?? '',
      aiDogrulandi: kiyafet['aiDogrulandi'] as bool? ?? false,
    );
  }
}

/// Tüm backend iletişimini yöneten servis sınıfı.
/// Singleton pattern: `ApiService.instance`.
///
/// dart:io'ya bağımlılık yoktur → Flutter Web + Android + iOS'ta çalışır.
class ApiService {
  ApiService._();
  static final ApiService instance = ApiService._();

  // ─── Yardımcı: Token al ──────────────────────────────────────────────────

  Future<String> _getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('token') ?? '';
  }

  // ─── POST /api/items/analyze-only ────────────────────────────────────────

  /// Fotoğrafı yalnızca FastAPI motoruna gönderir; MongoDB veya Cloudinary'e
  /// hiçbir şey kaydedilmez.  Akış: fotoğraf seç → önizle → kullanıcı onayla → kaydet.
  ///
  /// [imageBytes] — XFile.readAsBytes() ile okunan ham byte'lar
  /// [filename]   — Orijinal dosya adı
  ///
  /// Başarıda [AiAnalysisResult] (kategori + renk tahmini) döner.
  /// Hata durumunda [ApiException] fırlatır.
  Future<AiAnalysisResult> analyzeItemOnly({
    required Uint8List imageBytes,
    required String filename,
  }) async {
    final token = await _getToken();
    if (token.isEmpty) {
      throw const ApiException(
        message: 'Oturumunuz sona erdi, lütfen tekrar giriş yapın.',
        statusCode: 401,
      );
    }

    final uri = Uri.parse('${ApiConstants.baseUrl}/items/analyze-only');
    final req = http.MultipartRequest('POST', uri)
      ..headers['Authorization'] = 'Bearer ${token.trim()}'
      ..headers['Accept'] = 'application/json';

    req.files.add(
      http.MultipartFile.fromBytes('resim', imageBytes, filename: filename),
    );

    final client = http.Client();
    try {
      final streamed = await client
          .send(req)
          .timeout(
            const Duration(seconds: 30),
          ); // Yalnızca FastAPI, Cloudinary yok

      final res = await http.Response.fromStream(streamed);

      if (kDebugMode) {
        debugPrint('[ApiService] POST /items/analyze-only → ${res.statusCode}');
        debugPrint(
          '[ApiService] Body: ${res.body.substring(0, res.body.length.clamp(0, 300))}',
        );
      }

      if (res.statusCode == 200) {
        final json = jsonDecode(res.body) as Map<String, dynamic>;
        return AiAnalysisResult.fromJson(json);
      }

      Map<String, dynamic> errBody = {};
      try {
        errBody = jsonDecode(res.body) as Map<String, dynamic>;
      } catch (_) {}

      throw ApiException(
        message:
            errBody['mesaj'] as String? ?? 'Sunucu hatası (${res.statusCode})',
        statusCode: res.statusCode,
      );
    } on TimeoutException {
      throw const ApiException(
        message: 'Sunucu yanıt vermedi. Bağlantınızı kontrol edin.',
        statusCode: 0,
      );
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException(message: 'Sunucuya bağlanılamadı: $e', statusCode: 0);
    } finally {
      client.close();
    }
  }

  // ─── POST /api/items/add ─────────────────────────────────────────────────

  /// Kıyafet fotoğrafını Cloudinary'e yükler, FastAPI ile analiz eder ve
  /// MongoDB'ye kaydeder.
  ///
  /// [imageBytes]  — XFile.readAsBytes() ile okunan ham byte'lar (web uyumlu)
  /// [filename]    — Orijinal dosya adı (.jpg / .png vb.)
  /// [kategori]    — Kullanıcının review ekranında onayladığı kategori (AI'ya göre öncelikli)
  /// [renk]        — Kullanıcının onayladığı renk HEX kodu (AI'ya göre öncelikli)
  /// [mevsim]      — Kullanıcının seçtiği mevsim
  /// [stil]        — Kullanıcının seçtiği stil
  ///
  /// Başarıda [AiAnalysisResult] döner.
  /// Hata durumunda [ApiException] fırlatır.
  Future<AiAnalysisResult> uploadItem({
    required Uint8List imageBytes,
    required String filename,
    String kategori = '', // boş → backend AI tahminini kullanır
    String renk = '', // boş → backend AI tahminini kullanır
    String mevsim = 'Tüm Mevsimler',
    String stil = 'Casual',
  }) async {
    final token = await _getToken();
    if (token.isEmpty) {
      throw const ApiException(
        message: 'Oturumunuz sona erdi, lütfen tekrar giriş yapın.',
        statusCode: 401,
      );
    }

    final uri = Uri.parse('${ApiConstants.baseUrl}/items/add');
    final req = http.MultipartRequest('POST', uri)
      ..headers['Authorization'] = 'Bearer ${token.trim()}'
      ..headers['Accept'] = 'application/json'
      ..fields['mevsim'] = mevsim
      ..fields['stil'] = stil;

    // Kullanıcının onayladığı değerleri body'e ekle (boşsa gönderme)
    if (kategori.isNotEmpty) req.fields['kategori'] = kategori;
    if (renk.isNotEmpty) req.fields['renk'] = renk;

    // Field adı: 'resim' (backend: upload.single('resim'))
    req.files.add(
      http.MultipartFile.fromBytes('resim', imageBytes, filename: filename),
    );

    final client = http.Client();
    try {
      final streamed = await client
          .send(req)
          .timeout(
            const Duration(seconds: 60),
          ); // Cloudinary + CNN analizi sürebilir

      final res = await http.Response.fromStream(streamed);

      if (kDebugMode) {
        debugPrint('[ApiService] POST /items/add → ${res.statusCode}');
        final preview = res.body.length > 400
            ? res.body.substring(0, 400)
            : res.body;
        debugPrint('[ApiService] Body: $preview');
      }

      if (res.statusCode == 201) {
        final json = jsonDecode(res.body) as Map<String, dynamic>;
        return AiAnalysisResult.fromJson(json);
      }

      Map<String, dynamic> errBody = {};
      try {
        errBody = jsonDecode(res.body) as Map<String, dynamic>;
      } catch (_) {}

      throw ApiException(
        message:
            errBody['mesaj'] as String? ?? 'Sunucu hatası (${res.statusCode})',
        statusCode: res.statusCode,
      );
    } on TimeoutException {
      throw const ApiException(
        message: 'Sunucu yanıt vermedi. Bağlantınızı kontrol edin.',
        statusCode: 0,
      );
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException(message: 'Sunucuya bağlanılamadı: $e', statusCode: 0);
    } finally {
      client.close();
    }
  }

  // ─── POST /api/outfits/recommend ─────────────────────────────────────────

  /// Kullanıcının seçtiği etkinlik ve şehre göre Claude-powered AI kombin
  /// önerisi alır.
  Future<GeneratedOutfit> generateOutfit({
    required String etkinlik,
    String sehir = 'Istanbul',
  }) async {
    final token = await _getToken();
    if (token.isEmpty) {
      throw const ApiException(
        message: 'Oturumunuz sona erdi, lütfen tekrar giriş yapın.',
        statusCode: 401,
      );
    }

    final uri = Uri.parse('${ApiConstants.baseUrl}/outfits/recommend');
    final client = http.Client();

    try {
      final res = await client
          .post(
            uri,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ${token.trim()}',
              'Accept': 'application/json',
            },
            body: jsonEncode({'etkinlik': etkinlik, 'sehir': sehir}),
          )
          .timeout(const Duration(seconds: 45));

      if (kDebugMode) {
        debugPrint('[ApiService] POST /outfits/recommend → ${res.statusCode}');
        final preview = res.body.length > 400
            ? res.body.substring(0, 400)
            : res.body;
        debugPrint('[ApiService] Body: $preview');
      }

      if (res.statusCode == 200) {
        final json = jsonDecode(res.body) as Map<String, dynamic>;
        final kombin = json['kombin'] as Map<String, dynamic>? ?? json;
        return GeneratedOutfit.fromJson(kombin);
      }

      Map<String, dynamic> errBody = {};
      try {
        errBody = jsonDecode(res.body) as Map<String, dynamic>;
      } catch (_) {}

      throw ApiException(
        message:
            errBody['mesaj'] as String? ?? 'Sunucu hatası (${res.statusCode})',
        statusCode: res.statusCode,
      );
    } on TimeoutException {
      throw const ApiException(
        message: 'Sunucu yanıt vermedi. Bağlantınızı kontrol edin.',
        statusCode: 0,
      );
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException(message: 'Sunucuya bağlanılamadı: $e', statusCode: 0);
    } finally {
      client.close();
    }
  }

  // ─── POST /api/saved-outfits ─────────────────────────────────────────────

  /// [outfit]'i sunucuya kaydeder.  Başarıda [SavedOutfit] (MongoDB _id dahil) döner.
  /// [kullaniciFoto] — Lookbook'ta seçilen tam boy fotoğrafın URL'si (opsiyonel).
  Future<SavedOutfit> saveOutfit(
    GeneratedOutfit outfit, {
    String kullaniciFoto = '',
  }) async {
    final token = await _getToken();
    if (token.isEmpty) {
      throw const ApiException(
        message: 'Oturumunuz sona erdi, lütfen tekrar giriş yapın.',
        statusCode: 401,
      );
    }

    final uri = Uri.parse('${ApiConstants.baseUrl}/saved-outfits');
    final client = http.Client();

    try {
      final res = await client
          .post(
            uri,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ${token.trim()}',
              'Accept': 'application/json',
            },
            body: jsonEncode({
              'baslik': outfit.occasion,
              'aciklama': outfit.description,
              'ipucu': outfit.ipucu,
              'kiyafetler': outfit.items
                  .map((i) => i.id)
                  .where((id) => id.isNotEmpty)
                  .toList(),
              'kullaniciFoto': kullaniciFoto,
            }),
          )
          .timeout(const Duration(seconds: 15));

      if (kDebugMode) {
        debugPrint('[ApiService] POST /saved-outfits → ${res.statusCode}');
      }

      if (res.statusCode == 201) {
        final json = jsonDecode(res.body) as Map<String, dynamic>;
        return SavedOutfit.fromJson(json['kombin'] as Map<String, dynamic>);
      }

      Map<String, dynamic> errBody = {};
      try {
        errBody = jsonDecode(res.body) as Map<String, dynamic>;
      } catch (_) {}

      throw ApiException(
        message:
            errBody['mesaj'] as String? ?? 'Sunucu hatası (${res.statusCode})',
        statusCode: res.statusCode,
      );
    } on TimeoutException {
      throw const ApiException(
        message: 'Sunucu yanıt vermedi. Bağlantınızı kontrol edin.',
        statusCode: 0,
      );
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException(message: 'Sunucuya bağlanılamadı: $e', statusCode: 0);
    } finally {
      client.close();
    }
  }

  // ─── GET /api/saved-outfits ───────────────────────────────────────────────

  /// Giriş yapan kullanıcının tüm kayıtlı kombinlerini döner.
  /// kiyafetler alanı populate edilmiş tam ClothingItem nesneleri içerir.
  Future<List<SavedOutfit>> fetchSavedOutfits() async {
    final token = await _getToken();
    if (token.isEmpty) {
      throw const ApiException(
        message: 'Oturumunuz sona erdi, lütfen tekrar giriş yapın.',
        statusCode: 401,
      );
    }

    final uri = Uri.parse('${ApiConstants.baseUrl}/saved-outfits');
    final client = http.Client();

    try {
      final res = await client
          .get(
            uri,
            headers: {
              'Authorization': 'Bearer ${token.trim()}',
              'Accept': 'application/json',
            },
          )
          .timeout(const Duration(seconds: 15));

      if (kDebugMode) {
        debugPrint('[ApiService] GET /saved-outfits → ${res.statusCode}');
      }

      if (res.statusCode == 200) {
        final json = jsonDecode(res.body) as Map<String, dynamic>;
        final list = json['kombinler'] as List? ?? [];
        return list
            .map((e) => SavedOutfit.fromJson(e as Map<String, dynamic>))
            .toList();
      }

      Map<String, dynamic> errBody = {};
      try {
        errBody = jsonDecode(res.body) as Map<String, dynamic>;
      } catch (_) {}

      throw ApiException(
        message:
            errBody['mesaj'] as String? ?? 'Sunucu hatası (${res.statusCode})',
        statusCode: res.statusCode,
      );
    } on TimeoutException {
      throw const ApiException(
        message: 'Sunucu yanıt vermedi. Bağlantınızı kontrol edin.',
        statusCode: 0,
      );
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException(message: 'Sunucuya bağlanılamadı: $e', statusCode: 0);
    } finally {
      client.close();
    }
  }

  // ─── PUT /api/users/profile/photo (avatar) ───────────────────────────────

  /// Avatar yolunu (asset string) backend'e kaydeder.
  Future<String> updateProfilePhotoAvatar(String avatarPath) async {
    final token = await _getToken();
    if (token.isEmpty) {
      throw const ApiException(
        message: 'Oturumunuz sona erdi, lütfen tekrar giriş yapın.',
        statusCode: 401,
      );
    }

    final uri = Uri.parse('${ApiConstants.baseUrl}/users/profile/photo');
    final client = http.Client();

    try {
      final res = await client
          .put(
            uri,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ${token.trim()}',
              'Accept': 'application/json',
            },
            body: jsonEncode({'profilFoto': avatarPath}),
          )
          .timeout(const Duration(seconds: 15));

      if (kDebugMode) {
        debugPrint('[ApiService] PUT /users/profile/photo → ${res.statusCode}');
      }

      if (res.statusCode == 200) {
        final json = jsonDecode(res.body) as Map<String, dynamic>;
        return json['profilFoto'] as String? ?? avatarPath;
      }

      Map<String, dynamic> errBody = {};
      try {
        errBody = jsonDecode(res.body) as Map<String, dynamic>;
      } catch (_) {}

      throw ApiException(
        message: errBody['mesaj'] as String? ?? 'Sunucu hatası (${res.statusCode})',
        statusCode: res.statusCode,
      );
    } on TimeoutException {
      throw const ApiException(
        message: 'Sunucu yanıt vermedi. Bağlantınızı kontrol edin.',
        statusCode: 0,
      );
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException(message: 'Sunucuya bağlanılamadı: $e', statusCode: 0);
    } finally {
      client.close();
    }
  }

  // ─── PUT /api/users/profile/photo/upload (gerçek fotoğraf) ──────────────

  /// Kullanıcının seçtiği fotoğrafı Cloudinary'e yükler, URL döner.
  Future<String> uploadProfilePhoto({
    required Uint8List imageBytes,
    required String filename,
  }) async {
    final token = await _getToken();
    if (token.isEmpty) {
      throw const ApiException(
        message: 'Oturumunuz sona erdi, lütfen tekrar giriş yapın.',
        statusCode: 401,
      );
    }

    final uri = Uri.parse('${ApiConstants.baseUrl}/users/profile/photo/upload');
    final req = http.MultipartRequest('PUT', uri)
      ..headers['Authorization'] = 'Bearer ${token.trim()}'
      ..headers['Accept'] = 'application/json';

    req.files.add(
      http.MultipartFile.fromBytes('resim', imageBytes, filename: filename),
    );

    final client = http.Client();
    try {
      final streamed = await client
          .send(req)
          .timeout(const Duration(seconds: 30));

      final res = await http.Response.fromStream(streamed);

      if (kDebugMode) {
        debugPrint('[ApiService] PUT /users/profile/photo/upload → ${res.statusCode}');
      }

      if (res.statusCode == 200) {
        final json = jsonDecode(res.body) as Map<String, dynamic>;
        return json['profilFoto'] as String? ?? '';
      }

      Map<String, dynamic> errBody = {};
      try {
        errBody = jsonDecode(res.body) as Map<String, dynamic>;
      } catch (_) {}

      throw ApiException(
        message: errBody['mesaj'] as String? ?? 'Sunucu hatası (${res.statusCode})',
        statusCode: res.statusCode,
      );
    } on TimeoutException {
      throw const ApiException(
        message: 'Sunucu yanıt vermedi. Bağlantınızı kontrol edin.',
        statusCode: 0,
      );
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException(message: 'Sunucuya bağlanılamadı: $e', statusCode: 0);
    } finally {
      client.close();
    }
  }

  // ─── PUT /api/users/profile/body ─────────────────────────────────────────

  /// Kullanıcının vücut şekli ve kalıp tercihini MongoDB'ye kaydeder.
  Future<void> updateBodyProfile({
    required String bodyShape,
    required String fitPreference,
  }) async {
    final token = await _getToken();
    if (token.isEmpty) {
      throw const ApiException(
        message: 'Oturumunuz sona erdi, lütfen tekrar giriş yapın.',
        statusCode: 401,
      );
    }

    final uri = Uri.parse('${ApiConstants.baseUrl}/users/profile/body');
    final client = http.Client();

    try {
      final res = await client
          .put(
            uri,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ${token.trim()}',
              'Accept': 'application/json',
            },
            body: jsonEncode({
              'bodyShape': bodyShape,
              'fitPreference': fitPreference,
            }),
          )
          .timeout(const Duration(seconds: 15));

      if (kDebugMode) {
        debugPrint('[ApiService] PUT /users/profile/body → ${res.statusCode}');
      }

      if (res.statusCode == 200) return;

      Map<String, dynamic> errBody = {};
      try {
        errBody = jsonDecode(res.body) as Map<String, dynamic>;
      } catch (_) {}

      throw ApiException(
        message: errBody['mesaj'] as String? ?? 'Sunucu hatası (${res.statusCode})',
        statusCode: res.statusCode,
      );
    } on TimeoutException {
      throw const ApiException(
        message: 'Sunucu yanıt vermedi. Bağlantınızı kontrol edin.',
        statusCode: 0,
      );
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException(message: 'Sunucuya bağlanılamadı: $e', statusCode: 0);
    } finally {
      client.close();
    }
  }

  // ─── DELETE /api/saved-outfits/:id ───────────────────────────────────────

  /// Verilen [id]'li kaydedilmiş kombini sunucudan siler.
  Future<bool> deleteSavedOutfit(String id) async {
    final token = await _getToken();
    if (token.isEmpty) {
      throw const ApiException(
        message: 'Oturumunuz sona erdi, lütfen tekrar giriş yapın.',
        statusCode: 401,
      );
    }

    final uri = Uri.parse('${ApiConstants.baseUrl}/saved-outfits/$id');
    final client = http.Client();

    try {
      final res = await client
          .delete(
            uri,
            headers: {
              'Authorization': 'Bearer ${token.trim()}',
              'Accept': 'application/json',
            },
          )
          .timeout(const Duration(seconds: 15));

      if (kDebugMode) {
        debugPrint('[ApiService] DELETE /saved-outfits/$id → ${res.statusCode}');
      }

      return res.statusCode == 200;
    } on TimeoutException {
      throw const ApiException(
        message: 'Sunucu yanıt vermedi. Bağlantınızı kontrol edin.',
        statusCode: 0,
      );
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException(message: 'Sunucuya bağlanılamadı: $e', statusCode: 0);
    } finally {
      client.close();
    }
  }
} // ApiService

/// Backend hatalarını temsil eden özel exception sınıfı.
class ApiException implements Exception {
  final String message;
  final int statusCode;

  const ApiException({required this.message, required this.statusCode});

  @override
  String toString() => 'ApiException($statusCode): $message';
}
