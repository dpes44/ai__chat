import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:ai_chat/src/core/constants/app_colors.dart';

// Apply Inter on top of the dark base text theme so default colors are correct.
TextTheme _buildTextTheme() {
  final base = ThemeData.dark().textTheme;
  return GoogleFonts.interTextTheme(base).copyWith(
    // Display / hero text
    displayLarge: GoogleFonts.inter(
      fontSize: 32,
      fontWeight: FontWeight.w700,
      color: AppColors.textPrimary,
      letterSpacing: -1.0,
      height: 1.1,
    ),
    // Screen titles
    headlineLarge: GoogleFonts.inter(
      fontSize: 24,
      fontWeight: FontWeight.w700,
      color: AppColors.textPrimary,
      letterSpacing: -0.6,
      height: 1.2,
    ),
    headlineMedium: GoogleFonts.inter(
      fontSize: 20,
      fontWeight: FontWeight.w700,
      color: AppColors.textPrimary,
      letterSpacing: -0.5,
      height: 1.2,
    ),
    // Card titles
    titleLarge: GoogleFonts.inter(
      fontSize: 15,
      fontWeight: FontWeight.w600,
      color: AppColors.textPrimary,
      letterSpacing: -0.2,
    ),
    titleMedium: GoogleFonts.inter(
      fontSize: 14,
      fontWeight: FontWeight.w500,
      color: AppColors.textPrimary,
    ),
    titleSmall: GoogleFonts.inter(
      fontSize: 13,
      fontWeight: FontWeight.w500,
      color: AppColors.textSecondary,
    ),
    // Body
    bodyLarge: GoogleFonts.inter(
      fontSize: 15,
      fontWeight: FontWeight.w400,
      color: AppColors.textPrimary,
      height: 1.55,
    ),
    bodyMedium: GoogleFonts.inter(
      fontSize: 14,
      fontWeight: FontWeight.w400,
      color: AppColors.textSecondary,
      height: 1.55,
    ),
    bodySmall: GoogleFonts.inter(
      fontSize: 12,
      fontWeight: FontWeight.w400,
      color: AppColors.textTertiary,
      height: 1.4,
    ),
    // Labels / buttons
    labelLarge: GoogleFonts.inter(
      fontSize: 14,
      fontWeight: FontWeight.w600,
      color: Colors.white,
      letterSpacing: 0.1,
    ),
    labelMedium: GoogleFonts.inter(
      fontSize: 12,
      fontWeight: FontWeight.w500,
      color: AppColors.textSecondary,
    ),
    labelSmall: GoogleFonts.inter(
      fontSize: 11,
      fontWeight: FontWeight.w400,
      color: AppColors.textTertiary,
      letterSpacing: 0.2,
    ),
  );
}

final ThemeData appTheme = ThemeData(
  brightness: Brightness.dark,
  primaryColor: AppColors.primary,
  scaffoldBackgroundColor: AppColors.background,
  textTheme: _buildTextTheme(),
  appBarTheme: AppBarTheme(
    backgroundColor: Colors.transparent,
    elevation: 0,
    scrolledUnderElevation: 0,
    foregroundColor: AppColors.textPrimary,
    systemOverlayStyle: SystemUiOverlayStyle.light,
    titleTextStyle: GoogleFonts.inter(
      fontSize: 15,
      fontWeight: FontWeight.w600,
      color: AppColors.textPrimary,
      letterSpacing: -0.2,
    ),
    iconTheme: const IconThemeData(color: AppColors.textSecondary),
  ),
  elevatedButtonTheme: ElevatedButtonThemeData(
    style: ElevatedButton.styleFrom(
      backgroundColor: AppColors.primary,
      foregroundColor: Colors.white,
      elevation: 0,
      shadowColor: Colors.transparent,
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      textStyle: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600),
    ),
  ),
  outlinedButtonTheme: OutlinedButtonThemeData(
    style: OutlinedButton.styleFrom(
      foregroundColor: AppColors.textPrimary,
      side: const BorderSide(color: AppColors.borderFaint),
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      textStyle: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w500),
    ),
  ),
  textButtonTheme: TextButtonThemeData(
    style: TextButton.styleFrom(
      foregroundColor: AppColors.primary,
      textStyle: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w500),
    ),
  ),
  inputDecorationTheme: InputDecorationTheme(
    filled: true,
    fillColor: AppColors.elevated,
    border: OutlineInputBorder(
      borderRadius: BorderRadius.circular(14),
      borderSide: const BorderSide(color: AppColors.borderFaint, width: 1),
    ),
    enabledBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(14),
      borderSide: const BorderSide(color: AppColors.borderFaint, width: 1),
    ),
    focusedBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(14),
      borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
    ),
    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    hintStyle: GoogleFonts.inter(
      color: AppColors.textTertiary,
      fontSize: 14,
      fontWeight: FontWeight.w400,
    ),
    labelStyle: GoogleFonts.inter(
      color: AppColors.textSecondary,
      fontSize: 13,
    ),
    prefixIconColor: AppColors.textTertiary,
  ),
  cardTheme: const CardThemeData(
    color: AppColors.surface,
    elevation: 0,
    shadowColor: Colors.transparent,
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.all(Radius.circular(16)),
      side: BorderSide(color: AppColors.borderFaint, width: 0.8),
    ),
    margin: EdgeInsets.only(bottom: 10),
  ),
  chipTheme: ChipThemeData(
    backgroundColor: AppColors.highlight,
    selectedColor: AppColors.primaryDim,
    labelStyle: GoogleFonts.inter(
      fontSize: 12,
      fontWeight: FontWeight.w500,
      color: AppColors.accent,
    ),
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
    side: const BorderSide(color: AppColors.borderFaint, width: 0.8),
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
  ),
  popupMenuTheme: PopupMenuThemeData(
    color: AppColors.elevated,
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(14),
      side: const BorderSide(color: AppColors.borderFaint, width: 0.8),
    ),
    elevation: 8,
    shadowColor: const Color(0x80000000),
    textStyle: GoogleFonts.inter(fontSize: 13, color: AppColors.textPrimary),
  ),
  dialogTheme: DialogThemeData(
    backgroundColor: AppColors.elevated,
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(20),
      side: const BorderSide(color: AppColors.borderFaint, width: 0.8),
    ),
    titleTextStyle: GoogleFonts.inter(
      fontSize: 16,
      fontWeight: FontWeight.w600,
      color: AppColors.textPrimary,
    ),
    contentTextStyle: GoogleFonts.inter(
      fontSize: 14,
      color: AppColors.textSecondary,
    ),
  ),
  snackBarTheme: SnackBarThemeData(
    backgroundColor: AppColors.elevated,
    contentTextStyle: GoogleFonts.inter(
      fontSize: 13,
      color: AppColors.textPrimary,
    ),
    behavior: SnackBarBehavior.floating,
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(12),
      side: const BorderSide(color: AppColors.borderFaint, width: 0.8),
    ),
  ),
  bottomSheetTheme: const BottomSheetThemeData(
    backgroundColor: AppColors.elevated,
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
    ),
  ),
  colorScheme: const ColorScheme.dark(
    primary: AppColors.primary,
    secondary: AppColors.accent,
    surface: AppColors.surface,
    error: AppColors.error,
    onPrimary: Colors.white,
    onSecondary: Colors.white,
    onSurface: AppColors.textPrimary,
    onError: Colors.white,
  ),
  useMaterial3: true,
);
