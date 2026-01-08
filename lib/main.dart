import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:ai_chat/src/core/constants/app_strings.dart';
import 'package:ai_chat/src/core/themes/app_theme.dart';
import 'package:ai_chat/src/features/onboarding/language_selection_screen.dart';
import 'firebase_options.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );
  runApp(const SerenityWhisperApp());
}

class SerenityWhisperApp extends StatefulWidget {
  const SerenityWhisperApp({super.key});

  @override
  State<SerenityWhisperApp> createState() => _SerenityWhisperAppState();
}

class _SerenityWhisperAppState extends State<SerenityWhisperApp> {
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
        home: LanguageSelectionScreen(onLanguageSelected: _setLanguage),
      ),
    );
  }
}
