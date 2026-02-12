import 'package:flutter/material.dart';

class AppColors {
  // Primary: soft warm lavender-purple
  static const Color primary = Color(0xFF7C6BC4);
  static const Color primaryLight = Color(0xFFB8ACE6);
  static const Color primarySurface = Color(0xFFF0ECFA);

  // Secondary: warm rose accent
  static const Color secondary = Color(0xFFE8A0BF);
  static const Color secondaryLight = Color(0xFFFCE4F0);

  // Backgrounds
  static const Color background = Color(0xFFF8F6FC);
  static const Color surface = Color(0xFFFFFFFF);

  // Text
  static const Color textPrimary = Color(0xFF2D2440);
  static const Color textSecondary = Color(0xFF6E6485);
  static const Color textTertiary = Color(0xFFA09BB5);

  // Legacy aliases
  static const Color textDark = textPrimary;
  static const Color textLight = textSecondary;
  static const Color accent = Color(0xFF9B8FD0);

  // Utility
  static const Color shadow = Color(0x0A000000);
  static const Color divider = Color(0xFFE8E4F0);
  static const Color error = Color(0xFFE57373);
  static const Color success = Color(0xFF81C784);

  // Chat-specific
  static const Color userBubble = Color(0xFF7C6BC4);
  static const Color aiBubble = Color(0xFFF3F0FA);
  static const Color inputFill = Color(0xFFF5F3FA);

  // Gradient presets
  static const List<Color> backgroundGradient = [
    Color(0xFFF0ECFA),
    Color(0xFFF8F6FC),
  ];
}
