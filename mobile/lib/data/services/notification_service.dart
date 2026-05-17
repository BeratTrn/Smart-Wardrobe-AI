import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:smart_wardrobe_ai/data/services/api_service.dart';

// Uygulama tamamen kapalıyken (terminated) gelen mesajları işler.
// Bu fonksiyon top-level ve @pragma ile işaretlenmiş olmalıdır.
@pragma('vm:entry-point')
Future<void> _firebaseBackgroundHandler(RemoteMessage message) async {
  // Burada yalnızca veri işleme yapılabilir; UI güncellenemez.
  // flutter_local_notifications burada çağrılmaz çünkü FCM data-only
  // mesajlarında sistem bildirimi otomatik gösterilmez; gerekirse
  // burada da FlutterLocalNotificationsPlugin çağrılabilir.
}

/// FCM token yönetimi ve bildirim dinleme işlemlerini yöneten singleton.
class NotificationService {
  NotificationService._();
  static final NotificationService instance = NotificationService._();

  final _messaging = FirebaseMessaging.instance;
  final _localNotifications = FlutterLocalNotificationsPlugin();

  // Android için yüksek öncelikli bildirim kanalı
  static const _androidChannel = AndroidNotificationChannel(
    'smart_wardrobe_high',
    'Smart Wardrobe Bildirimleri',
    description: 'Hava durumu ve kombin önerileri için bildirimler',
    importance: Importance.high,
  );

  /// main() içinde Firebase.initializeApp() çağrısından sonra çağrılmalıdır.
  Future<void> init() async {
    // Arkaplanda mesaj işleyiciyi kaydet
    FirebaseMessaging.onBackgroundMessage(_firebaseBackgroundHandler);

    // İzin iste (iOS zorunlu, Android 13+ için gerekli)
    await _messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );

    // Android bildirim kanalını oluştur
    await _localNotifications
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(_androidChannel);

    // flutter_local_notifications başlat
    const androidSettings =
        AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosSettings = DarwinInitializationSettings();
    await _localNotifications.initialize(
      const InitializationSettings(
        android: androidSettings,
        iOS: iosSettings,
      ),
    );

    // Uygulama ön plandayken gelen mesajları yakala → yerel bildirim göster
    FirebaseMessaging.onMessage.listen(_onForegroundMessage);

    // Token'ı backend'e kaydet
    await _registerToken();

    // Token yenilenirse tekrar kaydet
    _messaging.onTokenRefresh.listen((newToken) => _sendTokenToBackend(newToken));
  }

  Future<void> _registerToken() async {
    final token = await _messaging.getToken();
    if (token != null) await _sendTokenToBackend(token);
  }

  Future<void> _sendTokenToBackend(String token) async {
    try {
      await ApiService.instance.saveFcmToken(token);
    } catch (_) {
      // Token kaydı kritik değil; sessizce geç
    }
  }

  void _onForegroundMessage(RemoteMessage message) {
    final notification = message.notification;
    if (notification == null) return;

    _localNotifications.show(
      notification.hashCode,
      notification.title,
      notification.body,
      NotificationDetails(
        android: AndroidNotificationDetails(
          _androidChannel.id,
          _androidChannel.name,
          channelDescription: _androidChannel.description,
          importance: Importance.high,
          priority: Priority.high,
          icon: '@mipmap/ic_launcher',
        ),
        iOS: const DarwinNotificationDetails(
          presentAlert: true,
          presentBadge: true,
          presentSound: true,
        ),
      ),
    );
  }
}
