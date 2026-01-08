import 'package:flutter/material.dart';
import 'package:ai_chat/src/core/constants/app_colors.dart';
import 'package:ai_chat/src/core/constants/app_strings.dart';
import 'package:ai_chat/src/core/widgets/language_option_tile.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Text(
            context.strings.languagePrompt,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: AppColors.textDark,
            ),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 12,
            runSpacing: 12,
            children: [
              LanguageOptionTile(
                label: 'English',
                flag: '🇬🇧',
                selected: context.appLanguage == AppLanguage.english,
                onTap: () => context.setAppLanguage(AppLanguage.english),
              ),
              LanguageOptionTile(
                label: 'नेपाली',
                flag: '🇳🇵',
                selected: context.appLanguage == AppLanguage.nepali,
                onTap: () => context.setAppLanguage(AppLanguage.nepali),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
