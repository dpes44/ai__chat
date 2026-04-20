import 'package:flutter/material.dart';

class AppColors {
  // ── Background levels (dark) ──
  static const Color background  = Color(0xFF0C0A18); // deepest — page bg
  static const Color surface     = Color(0xFF13102A); // cards, nav
  static const Color elevated    = Color(0xFF1D1A35); // elevated cards, inputs
  static const Color highlight   = Color(0xFF252245); // hover/selected bg

  // ── Brand ──
  static const Color primary     = Color(0xFF7C6BFF); // main violet
  static const Color primaryDim  = Color(0x267C6BFF); // 15% tint
  static const Color accent      = Color(0xFFB8AEFF); // light lavender

  // ── Text ──
  static const Color textPrimary   = Color(0xFFEDE9FF); // near-white warm
  static const Color textSecondary = Color(0xFF7F7A9E); // medium muted
  static const Color textTertiary  = Color(0xFF4A4570); // darkest muted

  // ── Semantic ──
  static const Color success = Color(0xFF4ECDC4); // teal (online dot)
  static const Color error   = Color(0xFFFF6B6B); // red
  static const Color warning = Color(0xFFFFB347); // orange

  // ── Structural ──
  static const Color divider     = Color(0xFF252240); // subtle separator
  static const Color borderFaint = Color(0xFF302C50); // card border

  // ── Chat ──
  static const Color userBubble = Color(0xFF5C4FF0); // user messages
  static const Color aiBubble   = Color(0xFF1D1A35); // AI messages
  static const Color inputBg    = Color(0xFF1D1A35); // input field

  // ── Backward-compat aliases (kept so unedited files don't break) ──
  static const Color secondary       = Color(0xFF9180FF);
  static const Color secondaryLight  = Color(0xFF2A2244);
  static const Color primarySurface  = Color(0xFF1F1940);
  static const Color primaryLight    = Color(0xFFB8AEFF);
  static const Color inputFill       = inputBg;
  static const Color surface2        = elevated;
  static const Color shadow          = Color(0x60000000);
  static const Color cardShadow      = Color(0x50000000);
  static const Color inputShadow     = Color(0x50000000);
  static const Color textDark        = textPrimary;
  static const Color textLight       = textSecondary;
  static const Color chatBackground  = background;

  static const List<Color> backgroundGradient = [
    Color(0xFF16122E),
    Color(0xFF0C0A18),
  ];
}
