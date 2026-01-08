import 'package:flutter/material.dart';
import 'package:ai_chat/src/core/constants/app_colors.dart';

class SelfHelpDetailScreen extends StatelessWidget {
  final String title;
  final String summary;
  final String body;

  const SelfHelpDetailScreen({
    super.key,
    required this.title,
    required this.summary,
    required this.body,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: ListView(
          children: [
            Text(
              title,
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w700,
                color: AppColors.textDark,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              summary,
              style: TextStyle(color: AppColors.textLight, height: 1.5),
            ),
            const SizedBox(height: 16),
            Text(
              body,
              style: TextStyle(color: AppColors.textDark, height: 1.6),
            ),
          ],
        ),
      ),
    );
  }
}
