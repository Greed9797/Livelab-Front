// Livelab design tokens — single source of truth for colors / spacing / radii.
// Mirrors the tokens used in the HTML mockups.

import 'package:flutter/material.dart';

@immutable
class LlTokens extends ThemeExtension<LlTokens> {
  const LlTokens({
    required this.primary,
    required this.primarySoft,
    required this.primaryHover,
    required this.bgBase,
    required this.bgElev1,
    required this.bgElev2,
    required this.textPrimary,
    required this.textSecondary,
    required this.textMuted,
    required this.textFaint,
    required this.border,
    required this.borderStrong,
    required this.hairline,
    required this.success,
    required this.successSoft,
    required this.warning,
    required this.warningSoft,
    required this.danger,
    required this.dangerSoft,
    required this.info,
    required this.infoSoft,
    required this.shadowCard,
  });

  final Color primary;
  final Color primarySoft;
  final Color primaryHover;
  final Color bgBase;
  final Color bgElev1;
  final Color bgElev2;
  final Color textPrimary;
  final Color textSecondary;
  final Color textMuted;
  final Color textFaint;
  final Color border;
  final Color borderStrong;
  final Color hairline;
  final Color success;
  final Color successSoft;
  final Color warning;
  final Color warningSoft;
  final Color danger;
  final Color dangerSoft;
  final Color info;
  final Color infoSoft;
  final List<BoxShadow> shadowCard;

  static const dark = LlTokens(
    primary: Color(0xFFFF6A2F),
    primarySoft: Color(0x33FF6A2F),
    primaryHover: Color(0xFFFF8A5C),
    bgBase: Color(0xFF0E0E10),
    bgElev1: Color(0xFF161618),
    bgElev2: Color(0xFF1E1E22),
    textPrimary: Color(0xFFF5F5F7),
    textSecondary: Color(0xFFC7C7CC),
    textMuted: Color(0xFF8E8E93),
    textFaint: Color(0xFF5A5A5F),
    border: Color(0xFF2A2A2E),
    borderStrong: Color(0xFF3A3A3E),
    hairline: Color(0x14FFFFFF),
    success: Color(0xFF34C759),
    successSoft: Color(0x2634C759),
    warning: Color(0xFFFFB020),
    warningSoft: Color(0x26FFB020),
    danger: Color(0xFFFF453A),
    dangerSoft: Color(0x26FF453A),
    info: Color(0xFF5AC8FA),
    infoSoft: Color(0x265AC8FA),
    shadowCard: [
      BoxShadow(color: Color(0x66000000), blurRadius: 24, offset: Offset(0, 8)),
    ],
  );

  static const light = LlTokens(
    primary: Color(0xFFE85A1F),
    primarySoft: Color(0x1FE85A1F),
    primaryHover: Color(0xFFD14A14),
    bgBase: Color(0xFFFAFAFA),
    bgElev1: Color(0xFFFFFFFF),
    bgElev2: Color(0xFFF5F5F7),
    textPrimary: Color(0xFF1C1C1E),
    textSecondary: Color(0xFF3A3A3C),
    textMuted: Color(0xFF6E6E73),
    textFaint: Color(0xFFA1A1A6),
    border: Color(0xFFE5E5EA),
    borderStrong: Color(0xFFD1D1D6),
    hairline: Color(0x12000000),
    success: Color(0xFF248A3D),
    successSoft: Color(0x1F248A3D),
    warning: Color(0xFFB25E00),
    warningSoft: Color(0x1FB25E00),
    danger: Color(0xFFD70015),
    dangerSoft: Color(0x1FD70015),
    info: Color(0xFF0071E3),
    infoSoft: Color(0x1F0071E3),
    shadowCard: [
      BoxShadow(color: Color(0x14000000), blurRadius: 16, offset: Offset(0, 4)),
    ],
  );

  @override
  LlTokens copyWith({
    Color? primary,
    Color? primarySoft,
    Color? primaryHover,
    Color? bgBase,
    Color? bgElev1,
    Color? bgElev2,
    Color? textPrimary,
    Color? textSecondary,
    Color? textMuted,
    Color? textFaint,
    Color? border,
    Color? borderStrong,
    Color? hairline,
    Color? success,
    Color? successSoft,
    Color? warning,
    Color? warningSoft,
    Color? danger,
    Color? dangerSoft,
    Color? info,
    Color? infoSoft,
    List<BoxShadow>? shadowCard,
  }) {
    return LlTokens(
      primary: primary ?? this.primary,
      primarySoft: primarySoft ?? this.primarySoft,
      primaryHover: primaryHover ?? this.primaryHover,
      bgBase: bgBase ?? this.bgBase,
      bgElev1: bgElev1 ?? this.bgElev1,
      bgElev2: bgElev2 ?? this.bgElev2,
      textPrimary: textPrimary ?? this.textPrimary,
      textSecondary: textSecondary ?? this.textSecondary,
      textMuted: textMuted ?? this.textMuted,
      textFaint: textFaint ?? this.textFaint,
      border: border ?? this.border,
      borderStrong: borderStrong ?? this.borderStrong,
      hairline: hairline ?? this.hairline,
      success: success ?? this.success,
      successSoft: successSoft ?? this.successSoft,
      warning: warning ?? this.warning,
      warningSoft: warningSoft ?? this.warningSoft,
      danger: danger ?? this.danger,
      dangerSoft: dangerSoft ?? this.dangerSoft,
      info: info ?? this.info,
      infoSoft: infoSoft ?? this.infoSoft,
      shadowCard: shadowCard ?? this.shadowCard,
    );
  }

  @override
  LlTokens lerp(ThemeExtension<LlTokens>? other, double t) {
    if (other is! LlTokens) return this;
    return LlTokens(
      primary: Color.lerp(primary, other.primary, t)!,
      primarySoft: Color.lerp(primarySoft, other.primarySoft, t)!,
      primaryHover: Color.lerp(primaryHover, other.primaryHover, t)!,
      bgBase: Color.lerp(bgBase, other.bgBase, t)!,
      bgElev1: Color.lerp(bgElev1, other.bgElev1, t)!,
      bgElev2: Color.lerp(bgElev2, other.bgElev2, t)!,
      textPrimary: Color.lerp(textPrimary, other.textPrimary, t)!,
      textSecondary: Color.lerp(textSecondary, other.textSecondary, t)!,
      textMuted: Color.lerp(textMuted, other.textMuted, t)!,
      textFaint: Color.lerp(textFaint, other.textFaint, t)!,
      border: Color.lerp(border, other.border, t)!,
      borderStrong: Color.lerp(borderStrong, other.borderStrong, t)!,
      hairline: Color.lerp(hairline, other.hairline, t)!,
      success: Color.lerp(success, other.success, t)!,
      successSoft: Color.lerp(successSoft, other.successSoft, t)!,
      warning: Color.lerp(warning, other.warning, t)!,
      warningSoft: Color.lerp(warningSoft, other.warningSoft, t)!,
      danger: Color.lerp(danger, other.danger, t)!,
      dangerSoft: Color.lerp(dangerSoft, other.dangerSoft, t)!,
      info: Color.lerp(info, other.info, t)!,
      infoSoft: Color.lerp(infoSoft, other.infoSoft, t)!,
      shadowCard: t < 0.5 ? shadowCard : other.shadowCard,
    );
  }
}

/// Spacing scale (4-pt grid).
class LlSpacing {
  static const double xs = 4;
  static const double sm = 8;
  static const double md = 12;
  static const double lg = 16;
  static const double xl = 24;
  static const double xxl = 32;
  static const double xxxl = 48;
}

/// Radii.
class LlRadius {
  static const double sm = 8;
  static const double md = 12;
  static const double lg = 16;
  static const double xl = 20;
  static const double pill = 999;
}
