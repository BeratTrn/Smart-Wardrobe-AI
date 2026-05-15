// ─────────────────────────────────────────────────────────────────────────────
//  SavedOutfitsStore — Kaydedilmiş kombinleri API ile senkronize eder.
//  Singleton + ValueNotifier: package gerektirmez, ValueListenableBuilder
//  ile doğrudan UI'a bağlanabilir.
// ─────────────────────────────────────────────────────────────────────────────

import 'package:flutter/foundation.dart';
import 'package:smart_wardrobe_ai/data/models/generated_outfit.dart';
import 'package:smart_wardrobe_ai/data/models/saved_outfit.dart';
import 'package:smart_wardrobe_ai/data/services/api_service.dart';

class SavedOutfitsStore {
  SavedOutfitsStore._();
  static final SavedOutfitsStore instance = SavedOutfitsStore._();

  /// Kaydedilen kombinlerin reactive listesi.
  final ValueNotifier<List<SavedOutfit>> outfits =
      ValueNotifier<List<SavedOutfit>>([]);

  /// Bu oturumda kaydedilen GeneratedOutfit ID'lerini takip eder.
  /// isSaved() çağrıları için sunucuya gitmeden anlık cevap verir.
  final _savedGeneratedIds = <String>{};

  // ── Sunucudan yükle ──────────────────────────────────────────────────────

  Future<void> load() async {
    try {
      final list = await ApiService.instance.fetchSavedOutfits();
      outfits.value = list;
    } catch (_) {
      // Non-fatal: bellekteki liste bozulmadan korunur
    }
  }

  // ── Kaydet ───────────────────────────────────────────────────────────────

  /// [outfit]'i sunucuya kaydeder; başarıda listeye ekler ve [SavedOutfit] döner.
  Future<SavedOutfit> save(
    GeneratedOutfit outfit, {
    String kullaniciFoto = '',
  }) async {
    final saved = await ApiService.instance.saveOutfit(
      outfit,
      kullaniciFoto: kullaniciFoto,
    );
    _savedGeneratedIds.add(outfit.id);
    outfits.value = [saved, ...outfits.value];
    return saved;
  }

  // ── Sil ─────────────────────────────────────────────────────────────────

  /// Optimistik silme: UI anında güncellenir, API çağrısı arka planda çalışır.
  /// API başarısız olursa liste sunucudan yeniden çekilir.
  Future<void> delete(String savedOutfitId) async {
    outfits.value =
        outfits.value.where((o) => o.id != savedOutfitId).toList();
    try {
      await ApiService.instance.deleteSavedOutfit(savedOutfitId);
    } catch (_) {
      await load(); // Hata durumunda sunucu durumunu geri yükle
      rethrow;
    }
  }

  // ── Kontrol ──────────────────────────────────────────────────────────────

  /// Bu oturumda kaydedilmişse true döner (sunucuya gitmez).
  bool isSaved(String generatedOutfitId) =>
      _savedGeneratedIds.contains(generatedOutfitId);

  int get count => outfits.value.length;
}
