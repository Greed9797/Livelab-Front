import 'package:flutter/material.dart';
import 'app_colors.dart';

/// 🔤 Livelab — Sistema tipográfico
///
/// Baseado em Inter (ou SF Pro Display como fallback).
/// Adicione no pubspec.yaml:
/// ```yaml
/// flutter:
///   fonts:
///     - family: Inter
///       fonts:
///         - asset: assets/fonts/Inter-Regular.ttf
///         - asset: assets/fonts/Inter-Medium.ttf
///           weight: 500
///         - asset: assets/fonts/Inter-SemiBold.ttf
///           weight: 600
///         - asset: assets/fonts/Inter-Bold.ttf
///           weight: 700
/// ```
class AppTypography {
  AppTypography._();

  static const String fontFamily = 'Inter';

  // ═══════════════════════════════════════════
  // 📏 DISPLAY — valores grandes (R$ 27.035,25)
  // ═══════════════════════════════════════════
  static const TextStyle displayLarge = TextStyle(
    fontFamily: fontFamily,
    fontSize: 36,
    fontWeight: FontWeight.w700,
    height: 1.2,
    letterSpacing: -0.5,
  );

  static const TextStyle displayMedium = TextStyle(
    fontFamily: fontFamily,
    fontSize: 32,
    fontWeight: FontWeight.w700,
    height: 1.2,
    letterSpacing: -0.3,
  );

  // ═══════════════════════════════════════════
  // 📐 HEADINGS
  // ═══════════════════════════════════════════
  static const TextStyle h1 = TextStyle(
    fontFamily: fontFamily,
    fontSize: 28,
    fontWeight: FontWeight.w700,
    height: 1.3,
  );

  static const TextStyle h2 = TextStyle(
    fontFamily: fontFamily,
    fontSize: 24,
    fontWeight: FontWeight.w700,
    height: 1.3,
  );

  static const TextStyle h3 = TextStyle(
    fontFamily: fontFamily,
    fontSize: 20,
    fontWeight: FontWeight.w600,
    height: 1.4,
  );

  static const TextStyle h4 = TextStyle(
    fontFamily: fontFamily,
    fontSize: 18,
    fontWeight: FontWeight.w600,
    height: 1.4,
  );

  // ═══════════════════════════════════════════
  // 📝 BODY
  // ═══════════════════════════════════════════
  static const TextStyle bodyLarge = TextStyle(
    fontFamily: fontFamily,
    fontSize: 16,
    fontWeight: FontWeight.w500,
    height: 1.5,
  );

  static const TextStyle bodyMedium = TextStyle(
    fontFamily: fontFamily,
    fontSize: 14,
    fontWeight: FontWeight.w400,
    height: 1.5,
  );

  static const TextStyle bodySmall = TextStyle(
    fontFamily: fontFamily,
    fontSize: 13,
    fontWeight: FontWeight.w400,
    height: 1.4,
  );

  // ═══════════════════════════════════════════
  // 🏷️ LABELS & CAPTIONS
  // ═══════════════════════════════════════════
  static const TextStyle label = TextStyle(
    fontFamily: fontFamily,
    fontSize: 14,
    fontWeight: FontWeight.w500,
    height: 1.4,
  );

  static const TextStyle caption = TextStyle(
    fontFamily: fontFamily,
    fontSize: 12,
    fontWeight: FontWeight.w400,
    height: 1.4,
  );

  static const TextStyle badge = TextStyle(
    fontFamily: fontFamily,
    fontSize: 12,
    fontWeight: FontWeight.w500,
    height: 1.2,
    letterSpacing: 0.1,
  );

  // ═══════════════════════════════════════════
  // 🔘 BUTTONS
  // ═══════════════════════════════════════════
  static const TextStyle buttonLarge = TextStyle(
    fontFamily: fontFamily,
    fontSize: 16,
    fontWeight: FontWeight.w600,
    color: AppColors.textOnPrimary,
    height: 1.2,
    letterSpacing: 0.1,
  );

  static const TextStyle buttonMedium = TextStyle(
    fontFamily: fontFamily,
    fontSize: 14,
    fontWeight: FontWeight.w600,
    height: 1.2,
    letterSpacing: 0.1,
  );

  // ═══════════════════════════════════════════════════════════
  // 📊 KPI & TABLE TYPOGRAPHY
  // ═══════════════════════════════════════════════════════════
  static const TextStyle kpiLabel = TextStyle(
    fontFamily: fontFamily,
    fontSize: 11,
    fontWeight: FontWeight.w500,
    letterSpacing: 0.12,
  );

  static const TextStyle kpiValue = TextStyle(
    fontFamily: fontFamily,
    fontSize: 30,
    fontWeight: FontWeight.w700,
    letterSpacing: -0.025,
  );

  static const TextStyle tableTh = TextStyle(
    fontFamily: fontFamily,
    fontSize: 11,
    fontWeight: FontWeight.w500,
    letterSpacing: 0.12,
  );
}
