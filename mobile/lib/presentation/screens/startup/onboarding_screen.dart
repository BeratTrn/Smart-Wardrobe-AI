import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:smart_wardrobe_ai/core/constants/app_colors.dart';
import 'package:smart_wardrobe_ai/presentation/screens/auth/login_screen.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen>
    with TickerProviderStateMixin {
  final _pageCtrl = PageController();
  int _currentPage = 0;

  static const _pages = [
    _OnboardingPage(
      title: 'Dijital\nDolabın.',
      subtitle: 'Tüm kıyafetlerini tek bir yerde topla, yönet ve keşfet.',
      icon: Icons.checkroom_rounded,
      color: AppColors.catTops,
    ),
    _OnboardingPage(
      title: 'AI ile\nAnaliz.',
      subtitle:
          'GPT-4o fotoğrafını analiz eder, kategori ve rengi otomatik saptar.',
      icon: Icons.auto_awesome_rounded,
      color: AppColors.gold,
    ),
    _OnboardingPage(
      title: 'Mükemmel\nKombin.',
      subtitle: 'Hava durumu ve ruh haline göre AI\'dan kıyafet kombinleri al.',
      icon: Icons.style_rounded,
      color: AppColors.catBottoms,
    ),
  ];

  late final List<AnimationController> _controllers;
  late final List<Animation<double>> _anims;

  @override
  void initState() {
    super.initState();
    _controllers = List.generate(
      _pages.length,
      (_) => AnimationController(
        vsync: this,
        duration: const Duration(milliseconds: 700),
      ),
    );
    _anims = _controllers
        .map((c) => CurvedAnimation(parent: c, curve: Curves.easeOut))
        .toList();

    _controllers[0].forward();
  }

  @override
  void dispose() {
    _pageCtrl.dispose();
    for (final c in _controllers) {
      c.dispose();
    }
    super.dispose();
  }

  void _next() {
    if (_currentPage < _pages.length - 1) {
      _pageCtrl.nextPage(
        duration: const Duration(milliseconds: 400),
        curve: Curves.easeInOut,
      );
    } else {
      _finish();
    }
  }

  Future<void> _finish() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('onboardingDone', true);
    if (!mounted) return;
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(builder: (_) => const LoginScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      body: Stack(
        children: [
          // Animasyonlu arka plan rengi
          AnimatedContainer(
            duration: const Duration(milliseconds: 500),
            decoration: BoxDecoration(
              gradient: RadialGradient(
                center: Alignment.topRight,
                radius: 1.2,
                colors: [
                  _pages[_currentPage].color.withOpacity(.12),
                  AppColors.bg,
                ],
              ),
            ),
          ),

          SafeArea(
            child: Column(
              children: [
                // Skip butonu
                Align(
                  alignment: Alignment.centerRight,
                  child: TextButton(
                    onPressed: _finish,
                    child: const Text(
                      'Geç',
                      style: TextStyle(
                        color: AppColors.muted,
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ),

                // Sayfa içeriği
                Expanded(
                  child: PageView.builder(
                    controller: _pageCtrl,
                    itemCount: _pages.length,
                    onPageChanged: (i) {
                      setState(() => _currentPage = i);
                      _controllers[i].forward();
                    },
                    itemBuilder: (_, i) =>
                        _PageContent(page: _pages[i], anim: _anims[i]),
                  ),
                ),

                // Dot + Buton
                Padding(
                  padding: const EdgeInsets.fromLTRB(32, 0, 32, 40),
                  child: Column(
                    children: [
                      _DotIndicator(
                        count: _pages.length,
                        current: _currentPage,
                        color: _pages[_currentPage].color,
                      ),
                      const SizedBox(height: 28),
                      _NextButton(
                        isLast: _currentPage == _pages.length - 1,
                        color: _pages[_currentPage].color,
                        onTap: _next,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// SAYFA İÇERİĞİ

class _PageContent extends StatelessWidget {
  final _OnboardingPage page;
  final Animation<double> anim;
  const _PageContent({required this.page, required this.anim});

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: anim,
      child: SlideTransition(
        position: Tween<Offset>(
          begin: const Offset(0, .06),
          end: Offset.zero,
        ).animate(anim),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 36),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // İkon dairesi
              TweenAnimationBuilder<double>(
                tween: Tween(begin: .8, end: 1.0),
                duration: const Duration(milliseconds: 800),
                curve: Curves.elasticOut,
                builder: (_, v, child) =>
                    Transform.scale(scale: v, child: child),
                child: Container(
                  width: 120,
                  height: 120,
                  decoration: BoxDecoration(
                    gradient: RadialGradient(
                      colors: [
                        page.color.withOpacity(.25),
                        page.color.withOpacity(.05),
                      ],
                    ),
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: page.color.withOpacity(.3),
                      width: 1.5,
                    ),
                  ),
                  child: Icon(page.icon, color: page.color, size: 52),
                ),
              ),

              const SizedBox(height: 44),

              Text(
                page.title,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontFamily: 'Cormorant',
                  fontSize: 50,
                  fontWeight: FontWeight.w700,
                  height: 1.05,
                  color: AppColors.text,
                  letterSpacing: -1,
                ),
              ),

              const SizedBox(height: 16),

              Text(
                page.subtitle,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: AppColors.textSub,
                  fontSize: 16,
                  height: 1.6,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// DOT İNDİKATÖR

class _DotIndicator extends StatelessWidget {
  final int count, current;
  final Color color;
  const _DotIndicator({
    required this.count,
    required this.current,
    required this.color,
  });

  @override
  Widget build(BuildContext context) => Row(
    mainAxisAlignment: MainAxisAlignment.center,
    children: List.generate(
      count,
      (i) => AnimatedContainer(
        duration: const Duration(milliseconds: 300),
        margin: const EdgeInsets.symmetric(horizontal: 4),
        width: i == current ? 24 : 8,
        height: 8,
        decoration: BoxDecoration(
          color: i == current ? color : AppColors.border,
          borderRadius: BorderRadius.circular(4),
        ),
      ),
    ),
  );
}

// NEXT BUTTON

class _NextButton extends StatelessWidget {
  final bool isLast;
  final Color color;
  final VoidCallback onTap;
  const _NextButton({
    required this.isLast,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: AnimatedContainer(
      duration: const Duration(milliseconds: 300),
      height: 56,
      width: double.infinity,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [color, Color.lerp(color, Colors.white, .2)!],
          begin: Alignment.centerLeft,
          end: Alignment.centerRight,
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: color.withOpacity(.4),
            blurRadius: 18,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Center(
        child: Text(
          isLast ? 'Başla' : 'Devam',
          style: const TextStyle(
            color: Colors.black,
            fontSize: 16,
            fontWeight: FontWeight.w700,
            letterSpacing: .4,
          ),
        ),
      ),
    ),
  );
}

// DATA MODEL

class _OnboardingPage {
  final String title, subtitle;
  final IconData icon;
  final Color color;

  const _OnboardingPage({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.color,
  });
}
