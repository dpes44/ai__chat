import 'package:flutter/material.dart';
import 'package:ai_chat/src/core/constants/app_colors.dart';

class OnboardingPage extends StatelessWidget {
  final Map<String, String> data;

  const OnboardingPage({super.key, required this.data});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 36),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 100,
            height: 100,
            decoration: const BoxDecoration(
              color: AppColors.primarySurface,
              shape: BoxShape.circle,
            ),
            alignment: Alignment.center,
            child: Text(
              data["image"]!,
              style: const TextStyle(fontSize: 48),
            ),
          ),
          const SizedBox(height: 40),
          Text(
            data["title"]!,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.w600,
              color: AppColors.textDark,
            ),
          ),
          const SizedBox(height: 16),
          Text(
            data["subtitle"]!,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 15,
              color: AppColors.textLight,
              height: 1.6,
            ),
          ),
        ],
      ),
    );
  }
}
