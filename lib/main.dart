import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:ai_chat/src/core/constants/app_strings.dart';
import 'package:ai_chat/src/core/themes/app_theme.dart';
import 'package:ai_chat/src/features/auth/auth_gate.dart';
import 'firebase_options.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  runApp(const ManKoSathiApp());
}

class ManKoSathiApp extends StatefulWidget {
  const ManKoSathiApp({super.key});

  @override
  State<ManKoSathiApp> createState() => _ManKoSathiAppState();
}

class _ManKoSathiAppState extends State<ManKoSathiApp> {
  AppLanguage _language = AppLanguage.english;

  void _setLanguage(AppLanguage language) {
    setState(() => _language = language);
  }

  @override
  Widget build(BuildContext context) {
    final strings = stringsForLanguage(_language);

    return AppStringsScope(
      language: _language,
      strings: strings,
      onLanguageChanged: _setLanguage,
      child: MaterialApp(
        title: strings.appTitle,
        debugShowCheckedModeBanner: false,
        theme: appTheme,
        home: const AuthGate(),
      ),
    );
  }
}
