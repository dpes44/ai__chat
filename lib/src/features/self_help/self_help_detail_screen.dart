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
            const SizedBox(height: 8),
            Text(
              summary,
              style: TextStyle(
                color: AppColors.textSecondary,
                height: 1.5,
                fontSize: 15,
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 16),
              child: Divider(color: AppColors.divider, thickness: 0.5),
            ),
            Text(
              body,
              style: TextStyle(
                color: AppColors.textPrimary,
                height: 1.6,
                fontSize: 15,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
