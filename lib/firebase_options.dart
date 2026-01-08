import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart';

// Generated-style placeholder. Replace values with your real config from
// the Firebase console or regenerate via `flutterfire configure`.
class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) {
      return web;
    }
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      case TargetPlatform.iOS:
        return ios;
      case TargetPlatform.macOS:
        return macos;
      default:
        throw UnsupportedError(
          'DefaultFirebaseOptions are not set for this platform.',
        );
    }
  }

  static const FirebaseOptions web = FirebaseOptions(
    apiKey: 'AIzaSyAy0WUR9kDqFLtDxM4HvcgDXDyQuGMmZWA',
    appId: '1:144582839380:web:d38a3a6bf29760983471c1',
    messagingSenderId: '144582839380',
    projectId: 'aichat-248ea',
    authDomain: 'aichat-248ea.firebaseapp.com',
    storageBucket: 'aichat-248ea.firebasestorage.app',
    measurementId: 'G-3B06BP82BL',
  );

  // Values from android/app/google-services.json
  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyAMEjO1jVcl9AqrS-z4tYVFCavNgtRmH6w',
    appId: '1:144582839380:android:9940dfb74fc7fa433471c1',
    messagingSenderId: '144582839380',
    projectId: 'aichat-248ea',
    storageBucket: 'aichat-248ea.firebasestorage.app',
  );

  // Fill these with your iOS config (GoogleService-Info.plist) if you add iOS.
  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'REPLACE_WITH_IOS_API_KEY',
    appId: 'REPLACE_WITH_IOS_APP_ID',
    messagingSenderId: 'REPLACE_WITH_SENDER_ID',
    projectId: 'REPLACE_WITH_PROJECT_ID',
    storageBucket: 'REPLACE_WITH_STORAGE_BUCKET',
    iosBundleId: 'REPLACE_WITH_IOS_BUNDLE_ID',
  );

  // Fill these with your macOS config if you add macOS.
  static const FirebaseOptions macos = FirebaseOptions(
    apiKey: 'REPLACE_WITH_MACOS_API_KEY',
    appId: 'REPLACE_WITH_MACOS_APP_ID',
    messagingSenderId: 'REPLACE_WITH_SENDER_ID',
    projectId: 'REPLACE_WITH_PROJECT_ID',
    storageBucket: 'REPLACE_WITH_STORAGE_BUCKET',
    iosBundleId: 'REPLACE_WITH_MACOS_BUNDLE_ID',
  );
}
