import 'package:flutter/material.dart';

/// Theme-sensitive colors — access via [BuildContext.colors].
///
/// Colors that DON'T change between themes (primary, success, danger, medals)
/// stay on [AppColors] as static consts.
class AppColorsTheme extends ThemeExtension<AppColorsTheme> {
  const AppColorsTheme({
    required this.bgPage,
    required this.bgCard,
    required this.bgElevated,
    required this.bgInput,
    required this.bgMuted,
    required this.bgSidebar,
    required this.textPrimary,
    required this.textSecondary,
    required this.textMuted,
    required this.borderSubtle,
    required this.borderStrong,
    required this.pillActiveBg,
    required this.pillActiveFg,
    required this.pillInactiveBg,
    required this.pillInactiveFg,
    required this.divider,
    required this.iconMuted,
    required this.shimmerBase,
    required this.shimmerHighlight,
    required this.primarySoftBg,
    required this.primarySoftFg,
  });

  final Color bgPage;
  final Color bgCard;
  final Color bgElevated;
  final Color bgInput;
  final Color bgMuted;
  final Color bgSidebar;
  final Color textPrimary;
  final Color textSecondary;
  final Color textMuted;
  final Color borderSubtle;
  final Color borderStrong;
  final Color pillActiveBg;
  final Color pillActiveFg;
  final Color pillInactiveBg;
  final Color pillInactiveFg;
  final Color divider;
  final Color iconMuted;
  final Color shimmerBase;
  final Color shimmerHighlight;
  // Background/foreground for soft-primary badges/pills (e.g. "CABINE 01" label)
  final Color primarySoftBg;
  final Color primarySoftFg;

  // ─── LIGHT (valores do AppColors atual) ────────────────────────────────────
  static const light = AppColorsTheme(
    bgPage: Color(0xFFFDF6F1),
    bgCard: Color(0xFFFFFFFF),
    bgElevated: Color(0xFFFFFFFF),
    bgInput: Color(0xFFF5EEE8),
    bgMuted: Color(0xFFF5EBE3),
    bgSidebar: Color(0xFFFFFFFF),
    textPrimary: Color(0xFF1A1A1A),
    textSecondary: Color(0xFF4A4A4A),
    textMuted: Color(0xFF8A8A8A),
    borderSubtle: Color(0xFFEDE3DA),
    borderStrong: Color(0xFFE1D2C4),
    pillActiveBg: Color(0xFF1A1A1A),
    pillActiveFg: Color(0xFFFFFFFF),
    pillInactiveBg: Color(0xFFF5EBE3),
    pillInactiveFg: Color(0xFF4A4A4A),
    divider: Color(0xFFEAEAEA),
    iconMuted: Color(0xFF8A8A8A),
    shimmerBase: Color(0xFFECE7E2),
    shimmerHighlight: Color(0xFFFDF6F1),
    primarySoftBg: Color(0xFFFFF3EC),
    primarySoftFg: Color(0xFFE8673C),
  );

  // ─── DARK (TikTok Studio palette) ──────────────────────────────────────────
  static const dark = AppColorsTheme(
    bgPage: Color(0xFF121212),
    bgCard: Color(0xFF1E1E1E),
    bgElevated: Color(0xFF252525),
    bgInput: Color(0xFF2C2C2C),
    bgMuted: Color(0xFF2C2C2C),
    bgSidebar: Color(0xFF121212),
    textPrimary: Color(0xFFFFFFFF),
    textSecondary: Color(0xFF8A8A8A),
    textMuted: Color(0xFF5C5C5C),
    borderSubtle: Color(0xFF2E2E2E),
    borderStrong: Color(0xFF3A3A3A),
    pillActiveBg: Color(0xFFFFFFFF),
    pillActiveFg: Color(0xFF000000),
    pillInactiveBg: Color(0xFF2C2C2C),
    pillInactiveFg: Color(0xFFFFFFFF),
    divider: Color(0xFF2E2E2E),
    iconMuted: Color(0xFF5C5C5C),
    shimmerBase: Color(0xFF2C2C2C),
    shimmerHighlight: Color(0xFF3A3A3A),
    primarySoftBg: Color(0x2EE8673C),
    primarySoftFg: Color(0xFFE8673C),
  );

  @override
  AppColorsTheme copyWith({
    Color? bgPage,
    Color? bgCard,
    Color? bgElevated,
    Color? bgInput,
    Color? bgMuted,
    Color? bgSidebar,
    Color? textPrimary,
    Color? textSecondary,
    Color? textMuted,
    Color? borderSubtle,
    Color? borderStrong,
    Color? pillActiveBg,
    Color? pillActiveFg,
    Color? pillInactiveBg,
    Color? pillInactiveFg,
    Color? divider,
    Color? iconMuted,
    Color? shimmerBase,
    Color? shimmerHighlight,
    Color? primarySoftBg,
    Color? primarySoftFg,
  }) {
    return AppColorsTheme(
      bgPage: bgPage ?? this.bgPage,
      bgCard: bgCard ?? this.bgCard,
      bgElevated: bgElevated ?? this.bgElevated,
      bgInput: bgInput ?? this.bgInput,
      bgMuted: bgMuted ?? this.bgMuted,
      bgSidebar: bgSidebar ?? this.bgSidebar,
      textPrimary: textPrimary ?? this.textPrimary,
      textSecondary: textSecondary ?? this.textSecondary,
      textMuted: textMuted ?? this.textMuted,
      borderSubtle: borderSubtle ?? this.borderSubtle,
      borderStrong: borderStrong ?? this.borderStrong,
      pillActiveBg: pillActiveBg ?? this.pillActiveBg,
      pillActiveFg: pillActiveFg ?? this.pillActiveFg,
      pillInactiveBg: pillInactiveBg ?? this.pillInactiveBg,
      pillInactiveFg: pillInactiveFg ?? this.pillInactiveFg,
      divider: divider ?? this.divider,
      iconMuted: iconMuted ?? this.iconMuted,
      shimmerBase: shimmerBase ?? this.shimmerBase,
      shimmerHighlight: shimmerHighlight ?? this.shimmerHighlight,
      primarySoftBg: primarySoftBg ?? this.primarySoftBg,
      primarySoftFg: primarySoftFg ?? this.primarySoftFg,
    );
  }

  @override
  AppColorsTheme lerp(AppColorsTheme? other, double t) {
    if (other == null) return this;
    return AppColorsTheme(
      bgPage: Color.lerp(bgPage, other.bgPage, t)!,
      bgCard: Color.lerp(bgCard, other.bgCard, t)!,
      bgElevated: Color.lerp(bgElevated, other.bgElevated, t)!,
      bgInput: Color.lerp(bgInput, other.bgInput, t)!,
      bgMuted: Color.lerp(bgMuted, other.bgMuted, t)!,
      bgSidebar: Color.lerp(bgSidebar, other.bgSidebar, t)!,
      textPrimary: Color.lerp(textPrimary, other.textPrimary, t)!,
      textSecondary: Color.lerp(textSecondary, other.textSecondary, t)!,
      textMuted: Color.lerp(textMuted, other.textMuted, t)!,
      borderSubtle: Color.lerp(borderSubtle, other.borderSubtle, t)!,
      borderStrong: Color.lerp(borderStrong, other.borderStrong, t)!,
      pillActiveBg: Color.lerp(pillActiveBg, other.pillActiveBg, t)!,
      pillActiveFg: Color.lerp(pillActiveFg, other.pillActiveFg, t)!,
      pillInactiveBg: Color.lerp(pillInactiveBg, other.pillInactiveBg, t)!,
      pillInactiveFg: Color.lerp(pillInactiveFg, other.pillInactiveFg, t)!,
      divider: Color.lerp(divider, other.divider, t)!,
      iconMuted: Color.lerp(iconMuted, other.iconMuted, t)!,
      shimmerBase: Color.lerp(shimmerBase, other.shimmerBase, t)!,
      shimmerHighlight: Color.lerp(shimmerHighlight, other.shimmerHighlight, t)!,
      primarySoftBg: Color.lerp(primarySoftBg, other.primarySoftBg, t)!,
      primarySoftFg: Color.lerp(primarySoftFg, other.primarySoftFg, t)!,
    );
  }
}

extension AppColorsX on BuildContext {
  AppColorsTheme get colors =>
      Theme.of(this).extension<AppColorsTheme>() ?? AppColorsTheme.light;
}
