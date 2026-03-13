// This is a basic Flutter widget test.
//
// To perform an interaction with a widget in your test, use the WidgetTester
// utility in the flutter_test package. For example, you can send tap and scroll
// gestures. You can also use WidgetTester to find child widgets in the widget
// tree, read text, and verify that the values of widget properties are correct.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:smart_wardrobe_ai/main.dart';

void main() {
  testWidgets('Counter increments smoke test', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const SmartWardrobeApp(startScreen: Text('Test Screen')));

    // Verify that our counter starts at 0.
    expect(find.text('0'), findsOneWidget);
    expect(find.text('1'), findsNothing);

    // Tap the '+' icon and trigger a frame.
    await tester.tap(find.byIcon(Icons.add));
    await tester.pump();

    // Verify that our counter has incremented.
    expect(find.text('0'), findsNothing);
    expect(find.text('1'), findsOneWidget);
  });
}



// import 'package:flutter/material.dart';
// import 'package:flutter_test/flutter_test.dart';
// import 'package:shared_preferences/shared_preferences.dart';
// import 'package:smart_wardrobe_ai/logic/main_shell.dart';

// import 'package:smart_wardrobe_ai/main.dart';
// import 'package:smart_wardrobe_ai/presentation/screens/login_screen.dart';
// import 'package:smart_wardrobe_ai/presentation/screens/onboarding_screen.dart';

// void main() {
//   // Her testten önce SharedPreferences'i temizle
//   setUp(() async {
//     SharedPreferences.setMockInitialValues({});
//   });

//   // ──────────────────────────────────────────────────────────────────────────
//   // 1. Onboarding — ilk açılışta gösterilmeli
//   // ──────────────────────────────────────────────────────────────────────────
//   testWidgets('İlk açılışta OnboardingScreen gösterilir',
//       (WidgetTester tester) async {
//     SharedPreferences.setMockInitialValues({
//       'onboardingDone': false,
//     });

//     await tester.pumpWidget(
//       const SmartWardrobeApp(initialScreen: OnboardingScreen()),
//     );
//     await tester.pumpAndSettle();

//     // StyleX logosu onboarding'de görünmeli
//     expect(find.text('StyleX'), findsOneWidget);
//   });

//   // ──────────────────────────────────────────────────────────────────────────
//   // 2. Login — onboarding geçildiyse ama token yoksa
//   // ──────────────────────────────────────────────────────────────────────────
//   testWidgets('Token yoksa LoginScreen gösterilir',
//       (WidgetTester tester) async {
//     SharedPreferences.setMockInitialValues({
//       'onboardingDone': true,
//       // token yok
//     });

//     await tester.pumpWidget(
//       const SmartWardrobeApp(initialScreen: LoginScreen()),
//     );
//     await tester.pumpAndSettle();

//     // Giriş Yap butonu görünmeli
//     expect(find.text('Giriş Yap'), findsOneWidget);
//     // E-posta ve Şifre alanları mevcut
//     expect(find.text('E-posta'), findsOneWidget);
//     expect(find.text('Şifre'),   findsOneWidget);
//   });

//   // ──────────────────────────────────────────────────────────────────────────
//   // 3. Login — "Şifremi unuttum?" butonu tıklanabilir
//   // ──────────────────────────────────────────────────────────────────────────
//   testWidgets('Şifremi unuttum butonu mevcut', (WidgetTester tester) async {
//     await tester.pumpWidget(
//       const SmartWardrobeApp(initialScreen: LoginScreen()),
//     );
//     await tester.pumpAndSettle();

//     expect(find.text('Şifremi unuttum?'), findsOneWidget);
//   });

//   // ──────────────────────────────────────────────────────────────────────────
//   // 4. Login — sosyal giriş butonları mevcut
//   // ──────────────────────────────────────────────────────────────────────────
//   testWidgets('Google ve Apple giriş butonları görünür',
//       (WidgetTester tester) async {
//     await tester.pumpWidget(
//       const SmartWardrobeApp(initialScreen: LoginScreen()),
//     );
//     await tester.pumpAndSettle();

//     expect(find.text('Google ile giriş yap'), findsOneWidget);
//     expect(find.text('Apple ile giriş yap'),  findsOneWidget);
//   });

//   // ──────────────────────────────────────────────────────────────────────────
//   // 5. MainShell — token varsa bottom nav gösterilir
//   // ──────────────────────────────────────────────────────────────────────────
//   testWidgets('Token varsa MainShell ve bottom nav gösterilir',
//       (WidgetTester tester) async {
//     SharedPreferences.setMockInitialValues({
//       'onboardingDone': true,
//       'token': 'mock_token_123',
//     });

//     await tester.pumpWidget(
//       const SmartWardrobeApp(initialScreen: MainShell()),
//     );
//     await tester.pump(); // ilk frame

//     // Bottom nav label'ları
//     expect(find.text('Home'),   findsOneWidget);
//     expect(find.text('Favori'), findsOneWidget);
//     expect(find.text('Dene'),   findsOneWidget);
//     expect(find.text('Dolap'),  findsOneWidget);
//   });

//   // ──────────────────────────────────────────────────────────────────────────
//   // 6. MainShell — + butonu mevcut
//   // ──────────────────────────────────────────────────────────────────────────
//   testWidgets('Merkez + (Ekle) butonu mevcut', (WidgetTester tester) async {
//     SharedPreferences.setMockInitialValues({'token': 'mock_token_123'});

//     await tester.pumpWidget(
//       const SmartWardrobeApp(initialScreen: MainShell()),
//     );
//     await tester.pump();

//     expect(find.byIcon(Icons.add_rounded), findsOneWidget);
//   });
// }