import 'package:flutter/material.dart';

class AppColors {
  // ── Background levels (light) ──
  static const Color background = Color(0xFFF3F7FD); // page bg
  static const Color surface = Color(0xFFFFFFFF); // cards, nav
  static const Color elevated = Color(0xFFF8FAFF); // inputs, sheets
  static const Color highlight = Color(0xFFEEF4FF); // selected bg

  // ── Brand ──
  static const Color primary = Color(0xFF2563EB); // main blue
  static const Color primaryDim = Color(0x1F2563EB); // 12% tint
  static const Color accent = Color(0xFF7C3AED); // vivid violet

  // ── Text ──
  static const Color textPrimary = Color(0xFF0F172A); // slate-900
  static const Color textSecondary = Color(0xFF475569); // slate-600
  static const Color textTertiary = Color(0xFF94A3B8); // slate-400

  // ── Semantic ──
  static const Color success = Color(0xFF10B981); // emerald
  static const Color error = Color(0xFFDC2626); // red
  static const Color warning = Color(0xFFF59E0B); // amber

  // ── Structural ──
  static const Color divider = Color(0xFFE2E8F0);
  static const Color borderFaint = Color(0xFFDCE4F0);

  // ── Chat ──
  static const Color userBubble = Color(0xFF2563EB);
  static const Color aiBubble = Color(0xFFFFFFFF);
  static const Color inputBg = Color(0xFFFFFFFF);

  // ── Backward-compat aliases (kept so unedited files don't break) ──
  static const Color secondary = Color(0xFF4F46E5);
  static const Color secondaryLight = Color(0xFFE8EDFF);
  static const Color primarySurface = Color(0xFFEFF4FF);
  static const Color primaryLight = Color(0xFF93C5FD);
  static const Color inputFill = inputBg;
  static const Color surface2 = elevated;
  static const Color shadow = Color(0x260F172A);
  static const Color cardShadow = Color(0x190F172A);
  static const Color inputShadow = Color(0x140F172A);
  static const Color textDark = textPrimary;
  static const Color textLight = textSecondary;
  static const Color chatBackground = background;

  static const List<Color> backgroundGradient = [
    Color(0xFFDCEAFF),
    Color(0xFFF5F8FF),
  ];
}
