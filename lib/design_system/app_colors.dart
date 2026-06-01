import 'package:flutter/material.dart';

/// 🎨 Livelab — Paleta de cores oficial
///
/// Uso:
/// ```dart
/// Container(color: AppColors.primary)
/// Text('Olá', style: TextStyle(color: AppColors.textPrimary))
/// ```
class AppColors {
  AppColors._(); // previne instanciação

  // ═══════════════════════════════════════════
  // 🟠 BRAND / PRIMARY
  // ═══════════════════════════════════════════
  static const Color primary = Color(0xFFFF5A1F);
  static const Color primaryHover = Color(0xFFE64A0F);
  static const Color primaryLight = Color(0xFFFF7A42);

  // ═══════════════════════════════════════════
  // 🎨 BACKGROUNDS
  // ═══════════════════════════════════════════
  static const Color bgBase = Color(0xFFFDF6F1);
  static const Color bgCard = Color(0xFFFFFFFF);
  static const Color bgSidebar = Color(0xFFFFFFFF);
  static const Color bgInput = Color(0xFFF5EEE8);
  static const Color bgMuted = Color(0xFFF5EBE3);
  static const Color bgGradientStart = Color(0xFFFFE8DC);
  static const Color bgGradientEnd = Color(0xFFFDF6F1);
  static const Color borderLight = Color(0xFFEDE3DA);  // peach divider

  // ═══════════════════════════════════════════
  // 🖊️ TEXTOS
  // ═══════════════════════════════════════════
  static const Color textPrimary = Color(0xFF1A1A1A);
  static const Color textSecondary = Color(0xFF4A4A4A);
  static const Color textMuted = Color(0xFF8A8A8A);
  static const Color textPlaceholder = Color(0xFFA8A8A8);
  static const Color textOnPrimary = Color(0xFFFFFFFF);

  // ═══════════════════════════════════════════
  // ✅ SEMÂNTICAS
  // ═══════════════════════════════════════════
  static const Color success = Color(0xFF1FA968);
  static const Color successBg = Color(0xFFE3F6EA);
  static const Color warning = Color(0xFFE08A0B);
  static const Color warningBg = Color(0xFFFCF0D6);
  static const Color danger = Color(0xFFEF4444);
  static const Color dangerBg = Color(0xFFFEE2E2);

  // ═══════════════════════════════════════════
  // ℹ️ SEMÂNTICAS ESTENDIDAS
  // ═══════════════════════════════════════════
  static const Color info = Color(0xFF2C7AD6);
  static const Color infoBg = Color(0xFFE3EEFB);
  static const Color infoPurple = Color(0xFF8B5CF6);
  static const Color infoPurpleBg = Color(0xFFEDE9FE);

  // ═══════════════════════════════════════════
  // 🥇 MEDALHAS
  // ═══════════════════════════════════════════
  static const Color medalGold = Color(0xFFF59E0B);
  static const Color medalSilver = Color(0xFF94A3B8);
  static const Color medalBronze = Color(0xFFCD7F32);

  // ═══════════════════════════════════════════
  // 🎨 MISC
  // ═══════════════════════════════════════════
  static const Color lilac = Color(0xFFD8B4FE);
  static const Color primarySoft = Color(0xFFFFE8DC);   // matches bgGradientStart
  static const Color primarySofter = Color(0xFFFFF3EC); // --primary-softer from HTML
  static const Color hairline = Color(0x0F1A1A1A);      // rgba(26,26,26,0.06)

  // ═══════════════════════════════════════════
  // 🌓 DARK MODE (inferido do ícone de lua)
  // ═══════════════════════════════════════════
  static const Color darkBgBase = Color(0xFF0F0F0F);
  static const Color darkBgCard = Color(0xFF1A1A1A);
  static const Color darkBgInput = Color(0xFF262626);
  static const Color darkTextPrimary = Color(0xFFFAFAFA);
  static const Color darkTextSecondary = Color(0xFFB0B0B0);

  // ═══════════════════════════════════════════
  // 🌈 GRADIENTES
  // ═══════════════════════════════════════════
  static const RadialGradient peachGradient = RadialGradient(
    center: Alignment(0.5, 0.0), // levemente à direita
    radius: 1.2,
    colors: [
      bgGradientStart,
      bgGradientEnd,
    ],
    stops: [0.0, 0.7],
  );

  static const LinearGradient primaryGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [primary, primaryLight],
  );

  // ═══════════════════════════════════════════════════════════
  // 🖼️ BORDERS & SHADOWS (Extended)
  // ═══════════════════════════════════════════════════════════
  static const Color borderStrong = Color(0xFFE1D2C4);
  static const Color border = Color(0xFFEFE4DB);
  static const BoxShadow shadowLg = BoxShadow(
    color: Color(0x14FF5A1F),
    blurRadius: 30,
    offset: Offset(0, 10),
  );
}
