import 'dart:convert'; // JSON çevirileri için

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http; // İnternete (API'ye) çıkmak için
import 'package:shared_preferences/shared_preferences.dart'; // Token'ı telefona kaydetmek için
import 'package:smart_wardrobe_ai/utils/api_constants.dart';

// 1. ADIM: Kendi oluşturduğumuz evrensel API adresini içeri aktarıyoruz!

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();

  bool _isLoading = false; // Butona basılınca dönen yüklenme çarkı için

  // --- İŞTE SİHİRLİ BAĞLANTI FONKSİYONUMUZ ---
  Future<void> _login() async {
    setState(() {
      _isLoading = true; // Yükleniyor durumunu başlat
    });

    try {
      // 2. ADIM: Artık manuel adres yazmak yok! ApiConstants'dan çekiyoruz.
      final String apiUrl = '${ApiConstants.baseUrl}/auth/login';

      final response = await http.post(
        Uri.parse(apiUrl),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'email': _emailController.text.trim(),
          'sifre': _passwordController.text.trim(),
        }),
      );

      final responseData = jsonDecode(response.body);

      if (response.statusCode == 200) {
        // GİRİŞ BAŞARILI!
        // 1. Gelen Token'ı (Dijital Yaka Kartı) telefonun hafızasına kaydet
        SharedPreferences prefs = await SharedPreferences.getInstance();
        await prefs.setString('token', responseData['token']);

        // 2. Kullanıcıya mesaj göster
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Giriş Başarılı! Hoş geldin ${responseData['kullanici']['kullaniciAdi']} 🎉',
            ),
            backgroundColor: Colors.green,
          ),
        );

        // İleride buraya: "Giriş başarılıysa Gardırop (Home) ekranına git" kodunu ekleyeceğiz.
        print("KAYDEDİLEN TOKEN: ${responseData['token']}");
      } else {
        // HATA (Şifre yanlış vs.)
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(responseData['mesaj'] ?? 'Giriş yapılamadı!'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Sunucuya bağlanılamadı. Node.js açık mı?'),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      setState(() {
        _isLoading = false; // İşlem bitince yüklenme çarkını durdur
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 30.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(
                  Icons.checkroom,
                  size: 100,
                  color: Colors.deepPurple,
                ),
                const SizedBox(height: 20),
                const Text(
                  'Smart Wardrobe AI',
                  style: TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                    color: Colors.deepPurple,
                  ),
                ),
                const SizedBox(height: 40),
                TextField(
                  controller: _emailController,
                  keyboardType: TextInputType.emailAddress,
                  decoration: InputDecoration(
                    labelText: 'E-posta',
                    prefixIcon: const Icon(Icons.email),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                TextField(
                  controller: _passwordController,
                  obscureText: true,
                  decoration: InputDecoration(
                    labelText: 'Şifre',
                    prefixIcon: const Icon(Icons.lock),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
                const SizedBox(height: 30),
                SizedBox(
                  width: double.infinity,
                  height: 50,
                  child: ElevatedButton(
                    onPressed: _isLoading
                        ? null
                        : _login, // Yükleniyorsa butonu kilitle, değilse çalıştır
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.deepPurple,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: _isLoading
                        ? const CircularProgressIndicator(
                            color: Colors.white,
                          ) // Yüklenme çarkı
                        : const Text(
                            'Giriş Yap',
                            style: TextStyle(fontSize: 18, color: Colors.white),
                          ),
                  ),
                ),
                const SizedBox(height: 20),
                TextButton(
                  onPressed: () {},
                  child: const Text('Hesabın yok mu? Hemen Kayıt Ol'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
