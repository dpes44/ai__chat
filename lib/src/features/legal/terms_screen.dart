import 'package:flutter/material.dart';
import 'package:ai_chat/src/core/constants/app_colors.dart';
import 'package:ai_chat/src/core/widgets/simple_markdown_view.dart';
import 'package:ai_chat/src/models/runtime_content.dart';
import 'package:ai_chat/src/services/runtime_content_service.dart';

class TermsScreen extends StatelessWidget {
  const TermsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final service = RuntimeContentService();
    return Scaffold(
      appBar: AppBar(title: const Text('Terms & Conditions')),
      body: FutureBuilder<RuntimeContent?>(
        future: service.loadContent(),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }

          final content = snapshot.data;
          final title = content?.termsTitle ?? 'Terms & Conditions';
          final body = content?.termsBody ??
              'This is a placeholder for your terms. Add your app usage '
                  'rules, responsibilities, and disclaimers here.';

          return Padding(
            padding: const EdgeInsets.all(24),
            child: ListView(
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 12),
                SimpleMarkdownView(markdown: body),
              ],
            ),
          );
        },
      ),
    );
  }
}
