import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:smart_wardrobe_ai/core/constants/api_constants.dart';
import 'package:smart_wardrobe_ai/core/constants/app_colors.dart';
import 'package:smart_wardrobe_ai/data/models/user_profile.dart';
import 'package:smart_wardrobe_ai/presentation/widgets/profile/profile_shared_widgets.dart';

/// Bottom sheet — PUT /api/auth/update { kullaniciAdi }
/// [returns] true eğer profil güncellendiyse (caller'ın veriyi yenilemesi için)
class EditProfileSheet extends StatefulWidget {
  final UserProfile? profile;
  const EditProfileSheet({super.key, required this.profile});

  @override
  State<EditProfileSheet> createState() => _EditProfileSheetState();
}

class _EditProfileSheetState extends State<EditProfileSheet> {
  late final TextEditingController _nameCtrl;
  bool _loading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _nameCtrl = TextEditingController(text: widget.profile?.name ?? '');
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    super.dispose();
  }

  // ── Doğrulama
  String? _validate(String name) {
    if (name.isEmpty) return 'Kullanıcı adı boş olamaz.';
    if (name.length < 3) return 'En az 3 karakter olmalı.';
    return null;
  }

  Future<void> _save() async {
    final name = _nameCtrl.text.trim();
    final validationError = _validate(name);
    if (validationError != null) {
      setState(() => _error = validationError);
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('token') ?? '';

      final res = await http
          .put(
            Uri.parse('${ApiConstants.baseUrl}/auth/update'),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer $token',
            },
            body: jsonEncode({'kullaniciAdi': name}),
          )
          .timeout(const Duration(seconds: 10));

      if (!mounted) return;

      if (res.statusCode == 200) {
        await prefs.setString('userName', name);
        Navigator.pop(context, true); // true = yenile sinyali
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Profil güncellendi ✓'),
            backgroundColor: AppColors.success,
          ),
        );
      } else {
        final data = jsonDecode(res.body);
        setState(() {
          _error = data['mesaj'] ?? 'Güncelleme başarısız.';
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _error = 'Bağlantı hatası. Tekrar dene.';
          _loading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: EdgeInsets.fromLTRB(
        22,
        24,
        22,
        MediaQuery.of(context).viewInsets.bottom + 32,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const ProfileSheetHandle(),
          const SizedBox(height: 20),
          const Text(
            'Profili Düzenle',
            style: TextStyle(
              fontFamily: 'Cormorant',
              fontSize: 22,
              fontWeight: FontWeight.w700,
              color: AppColors.text,
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            'Kullanıcı adını değiştirebilirsin',
            style: TextStyle(color: AppColors.muted, fontSize: 12),
          ),
          const SizedBox(height: 20),
          // ── Kullanıcı adı alanı
          TextField(
            controller: _nameCtrl,
            style: const TextStyle(color: AppColors.text, fontSize: 14),
            textCapitalization: TextCapitalization.words,
            decoration: InputDecoration(
              labelText: 'Kullanıcı Adı',
              labelStyle: const TextStyle(color: AppColors.muted, fontSize: 13),
              prefixIcon: const Icon(
                Icons.person_outline_rounded,
                color: AppColors.muted,
                size: 18,
              ),
              filled: true,
              fillColor: AppColors.bg,
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 16,
                vertical: 14,
              ),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: AppColors.border),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: AppColors.border),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: AppColors.gold),
              ),
            ),
          ),
          if (_error != null) ...[
            const SizedBox(height: 8),
            ProfileErrorRow(message: _error!),
          ],
          const SizedBox(height: 20),
          ProfileGoldButton(label: 'Kaydet', loading: _loading, onTap: _save),
        ],
      ),
    );
  }
}
