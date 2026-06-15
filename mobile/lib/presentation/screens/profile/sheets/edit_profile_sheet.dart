import 'dart:convert';

import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:smart_wardrobe_ai/core/constants/api_constants.dart';
import 'package:smart_wardrobe_ai/core/constants/app_colors.dart';
import 'package:smart_wardrobe_ai/data/models/user_profile.dart';
import 'package:smart_wardrobe_ai/presentation/widgets/profile/profile_shared_widgets.dart';
import 'package:smart_wardrobe_ai/presentation/widgets/wardrobe/app_filter_chip.dart';

/// Bottom sheet — PUT /api/users/profile { kullaniciAdi, cinsiyet }
/// [returns] true eğer profil güncellendiyse (caller'ın veriyi yenilemesi için)
class EditProfileSheet extends StatefulWidget {
  final UserProfile? profile;
  const EditProfileSheet({super.key, required this.profile});

  @override
  State<EditProfileSheet> createState() => _EditProfileSheetState();
}

class _EditProfileSheetState extends State<EditProfileSheet> {
  late final TextEditingController _nameCtrl;
  late String _selectedGender;
  bool _loading = false;
  String? _error;

  // Backend enum (User.cinsiyet): 'Erkek' | 'Kadın' | 'Belirtilmemiş'
  late final List<(String value, String label)> _genderOptions = [
    ('Belirtilmemiş', 'edit_profile.gender_unspecified'.tr()),
    ('Kadın', 'edit_profile.gender_female'.tr()),
    ('Erkek', 'edit_profile.gender_male'.tr()),
  ];

  @override
  void initState() {
    super.initState();
    _nameCtrl = TextEditingController(text: widget.profile?.name ?? '');
    _selectedGender = widget.profile?.cinsiyet ?? 'Belirtilmemiş';
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    super.dispose();
  }

  // Doğrulama
  String? _validate(String name) {
    if (name.isEmpty) return 'edit_profile.username_required'.tr();
    if (name.length < 3) return 'edit_profile.username_too_short'.tr();
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
            Uri.parse('${ApiConstants.baseUrl}/users/profile'),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer $token',
            },
            body: jsonEncode({
              'kullaniciAdi': name,
              'cinsiyet': _selectedGender,
            }),
          )
          .timeout(const Duration(seconds: 10));

      if (!mounted) return;

      if (res.statusCode == 200) {
        await prefs.setString('userName', name);
        if (!mounted) return;
        Navigator.pop(context, true); // true = yenile sinyali
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('edit_profile.profile_updated_successfully'.tr()),
            backgroundColor: AppColors.success,
          ),
        );
      } else {
        final data = jsonDecode(res.body);
        setState(() {
          _error = data['mesaj'] ?? 'edit_profile.profile_update_failed'.tr();
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _error = 'edit_profile.connection_error'.tr();
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
          Text(
            'edit_profile.edit_profile'.tr(),
            style: TextStyle(
              fontFamily: 'Cormorant',
              fontSize: 22,
              fontWeight: FontWeight.w700,
              color: AppColors.text,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'edit_profile.change_username'.tr(),
            style: TextStyle(color: AppColors.muted, fontSize: 12),
          ),
          const SizedBox(height: 20),
          // Kullanıcı adı alanı
          TextField(
            controller: _nameCtrl,
            style: const TextStyle(color: AppColors.text, fontSize: 14),
            textCapitalization: TextCapitalization.words,
            decoration: InputDecoration(
              labelText: 'edit_profile.username'.tr(),
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
          const SizedBox(height: 20),
          // Cinsiyet seçici
          Text(
            'edit_profile.gender'.tr(),
            style: const TextStyle(
              color: AppColors.muted,
              fontSize: 13,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'edit_profile.gender_hint'.tr(),
            style: const TextStyle(color: AppColors.muted, fontSize: 11),
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _genderOptions
                .map(
                  (g) => AppFilterChip(
                    label: g.$2,
                    selected: _selectedGender == g.$1,
                    onTap: () => setState(() => _selectedGender = g.$1),
                  ),
                )
                .toList(),
          ),
          if (_error != null) ...[
            const SizedBox(height: 8),
            ProfileErrorRow(message: _error!),
          ],
          const SizedBox(height: 20),
          ProfileGoldButton(
            label: 'edit_profile.save'.tr(),
            loading: _loading,
            onTap: _save,
          ),
        ],
      ),
    );
  }
}
