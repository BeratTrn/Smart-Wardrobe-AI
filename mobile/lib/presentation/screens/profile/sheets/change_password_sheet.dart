import 'dart:convert';

import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:smart_wardrobe_ai/core/constants/api_constants.dart';
import 'package:smart_wardrobe_ai/core/constants/app_colors.dart';
import 'package:smart_wardrobe_ai/core/theme/app_theme_extension.dart';
import 'package:smart_wardrobe_ai/presentation/widgets/profile/profile_shared_widgets.dart';

/// Bottom sheet — PUT /api/auth/change-password { mevcutSifre, yeniSifre }
class ChangePasswordSheet extends StatefulWidget {
  const ChangePasswordSheet({super.key});

  @override
  State<ChangePasswordSheet> createState() => _ChangePasswordSheetState();
}

class _ChangePasswordSheetState extends State<ChangePasswordSheet> {
  final _currentCtrl = TextEditingController();
  final _newCtrl = TextEditingController();
  final _confirmCtrl = TextEditingController();

  bool _loading = false;
  String? _error;
  bool _obscureCurrent = true;
  bool _obscureNew = true;
  bool _obscureConfirm = true;

  @override
  void dispose() {
    _currentCtrl.dispose();
    _newCtrl.dispose();
    _confirmCtrl.dispose();
    super.dispose();
  }

  // Doğrulama
  String? _validate() {
    final current = _currentCtrl.text.trim();
    final newPass = _newCtrl.text.trim();
    final confirm = _confirmCtrl.text.trim();

    if (current.isEmpty || newPass.isEmpty || confirm.isEmpty) {
      return 'change_password.please_fill_all_fields'.tr();
    }
    if (newPass != confirm)
      return 'change_password.new_passwords_do_not_match'.tr();
    if (newPass.length < 6)
      return 'change_password.new_password_min_6_chars'.tr();
    return null;
  }

  Future<void> _submit() async {
    final validationError = _validate();
    if (validationError != null) {
      setState(() => _error = validationError);
      return;
    }

    setState(() {
      _error = null;
      _loading = true;
    });

    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('token') ?? '';

      final res = await http
          .put(
            Uri.parse('${ApiConstants.baseUrl}/auth/change-password'),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer $token',
            },
            body: jsonEncode({
              'mevcutSifre': _currentCtrl.text.trim(),
              'yeniSifre': _newCtrl.text.trim(),
            }),
          )
          .timeout(const Duration(seconds: 10));

      if (!mounted) return;

      if (res.statusCode == 200) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('change_password.password_updated_successfully'.tr()),
            backgroundColor: AppColors.success,
          ),
        );
      } else {
        final data = jsonDecode(res.body);
        setState(() {
          _error =
              data['mesaj'] ??
              'change_password.password_could_not_be_updated'.tr();
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _error = 'change_password.connection_error'.tr();
          _loading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColorsExtension.of(context).surface,
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
            'change_password.change_password'.tr(),
            style: TextStyle(
              fontFamily: 'Cormorant',
              fontSize: 22,
              fontWeight: FontWeight.w700,
              color: AppColorsExtension.of(context).text,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'change_password.verify_current_password'.tr(),
            style: TextStyle(color: AppColorsExtension.of(context).muted, fontSize: 12),
          ),
          const SizedBox(height: 20),
          ProfilePasswordField(
            ctrl: _currentCtrl,
            label: 'change_password.current_password'.tr(),
            obscure: _obscureCurrent,
            onToggle: () => setState(() => _obscureCurrent = !_obscureCurrent),
          ),
          const SizedBox(height: 12),
          ProfilePasswordField(
            ctrl: _newCtrl,
            label: 'change_password.new_password'.tr(),
            obscure: _obscureNew,
            onToggle: () => setState(() => _obscureNew = !_obscureNew),
          ),
          const SizedBox(height: 12),
          ProfilePasswordField(
            ctrl: _confirmCtrl,
            label: 'change_password.new_password_repeat'.tr(),
            obscure: _obscureConfirm,
            onToggle: () => setState(() => _obscureConfirm = !_obscureConfirm),
          ),
          if (_error != null) ...[
            const SizedBox(height: 10),
            ProfileErrorRow(message: _error!),
          ],
          const SizedBox(height: 20),
          ProfileGoldButton(
            label: 'change_password.update_password'.tr(),
            loading: _loading,
            onTap: _submit,
          ),
        ],
      ),
    );
  }
}
