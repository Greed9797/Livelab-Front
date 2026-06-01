import 'package:flutter/material.dart';
import 'app_colors.dart';
import 'app_colors_theme.dart';
import 'app_typography.dart';
import 'app_tokens.dart';
import '../livelab/theme/tokens.dart';

/// 🎨 Livelab — ThemeData oficial
///
/// Uso no main.dart:
/// ```dart
/// MaterialApp(
///   theme: AppTheme.light,
///   darkTheme: AppTheme.dark,
///   themeMode: ThemeMode.system,
///   ...
/// )
/// ```
class AppTheme {
  AppTheme._();

  // ═══════════════════════════════════════════
  // ☀️ LIGHT THEME
  // ═══════════════════════════════════════════
  static ThemeData get light {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      fontFamily: AppTypography.fontFamily,
      scaffoldBackgroundColor: AppColors.bgBase,

      colorScheme: const ColorScheme.light(
        primary: AppColors.primary,
        onPrimary: AppColors.textOnPrimary,
        secondary: AppColors.primaryLight,
        surface: AppColors.bgCard,
        onSurface: AppColors.textPrimary,
        error: AppColors.danger,
      ),

      // Inputs
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.bgInput,
        hintStyle: const TextStyle(
          color: AppColors.textPlaceholder,
          fontWeight: FontWeight.w400,
          fontSize: 14,
        ),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.x4,
          vertical: AppSpacing.x4,
        ),
        border: OutlineInputBorder(
          borderRadius: AppRadius.mdR,
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: AppRadius.mdR,
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: AppRadius.mdR,
          borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: AppRadius.mdR,
          borderSide: const BorderSide(color: AppColors.danger, width: 1.5),
        ),
      ),

      // Botões elevados (primary)
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: AppColors.textOnPrimary,
          elevation: 0,
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.x6,
            vertical: AppSpacing.x4,
          ),
          minimumSize: const Size(0, 52),
          shape: RoundedRectangleBorder(
            borderRadius: AppRadius.fullR,
          ),
          textStyle: AppTypography.buttonLarge,
        ),
      ),

      // Botões outlined
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.textPrimary,
          side: const BorderSide(color: Color(0xFFEAEAEA)),
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.x6,
            vertical: AppSpacing.x4,
          ),
          minimumSize: const Size(0, 52),
          shape: RoundedRectangleBorder(
            borderRadius: AppRadius.fullR,
          ),
          textStyle: AppTypography.buttonLarge.copyWith(
            color: AppColors.textPrimary,
          ),
        ),
      ),

      // Cards
      cardTheme: CardThemeData(
        color: AppColors.bgCard,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: AppRadius.xlR,
        ),
        margin: EdgeInsets.zero,
      ),

      // Typography — explicit colors since base styles are color-neutral
      textTheme: TextTheme(
        displayLarge: AppTypography.displayLarge.copyWith(color: AppColors.textPrimary),
        displayMedium: AppTypography.displayMedium.copyWith(color: AppColors.textPrimary),
        headlineLarge: AppTypography.h1.copyWith(color: AppColors.textPrimary),
        headlineMedium: AppTypography.h2.copyWith(color: AppColors.textPrimary),
        headlineSmall: AppTypography.h3.copyWith(color: AppColors.textPrimary),
        titleLarge: AppTypography.h4.copyWith(color: AppColors.textPrimary),
        bodyLarge: AppTypography.bodyLarge.copyWith(color: AppColors.textPrimary),
        bodyMedium: AppTypography.bodyMedium.copyWith(color: AppColors.textPrimary),
        bodySmall: AppTypography.bodySmall.copyWith(color: AppColors.textSecondary),
        labelLarge: AppTypography.buttonLarge,
        labelMedium: AppTypography.label.copyWith(color: AppColors.textSecondary),
        labelSmall: AppTypography.caption.copyWith(color: AppColors.textMuted),
      ),

      // Divider
      dividerTheme: const DividerThemeData(
        color: Color(0xFFEAEAEA),
        thickness: 1,
        space: 1,
      ),

      extensions: const [AppColorsTheme.light, LlTokens.light],
    );
  }

  // ═══════════════════════════════════════════
  // 🌙 DARK THEME — TikTok Studio palette
  // ═══════════════════════════════════════════
  static ThemeData get dark {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      fontFamily: AppTypography.fontFamily,
      scaffoldBackgroundColor: const Color(0xFF121212),

      colorScheme: const ColorScheme.dark(
        primary: AppColors.primary,
        onPrimary: AppColors.textOnPrimary,
        secondary: AppColors.primaryLight,
        surface: Color(0xFF1E1E1E),
        onSurface: Color(0xFFFFFFFF),
        error: AppColors.danger,
      ),

      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: const Color(0xFF2C2C2C),
        hintStyle: const TextStyle(color: Color(0xFF5C5C5C)),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.x4,
          vertical: AppSpacing.x4,
        ),
        border: OutlineInputBorder(
          borderRadius: AppRadius.mdR,
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: AppRadius.mdR,
          borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
        ),
      ),

      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: AppColors.textOnPrimary,
          elevation: 0,
          minimumSize: const Size(0, 52),
          shape: RoundedRectangleBorder(borderRadius: AppRadius.fullR),
          textStyle: AppTypography.buttonLarge,
        ),
      ),

      cardTheme: const CardThemeData(
        color: Color(0xFF1E1E1E),
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(16)),
        ),
      ),

      dividerTheme: const DividerThemeData(
        color: Color(0xFF2E2E2E),
        thickness: 1,
        space: 1,
      ),

      textTheme: TextTheme(
        displayLarge: AppTypography.displayLarge.copyWith(color: const Color(0xFFFFFFFF)),
        displayMedium: AppTypography.displayMedium.copyWith(color: const Color(0xFFFFFFFF)),
        headlineLarge: AppTypography.h1.copyWith(color: const Color(0xFFFFFFFF)),
        headlineMedium: AppTypography.h2.copyWith(color: const Color(0xFFFFFFFF)),
        headlineSmall: AppTypography.h3.copyWith(color: const Color(0xFFFFFFFF)),
        titleLarge: AppTypography.h4.copyWith(color: const Color(0xFFFFFFFF)),
        bodyLarge: AppTypography.bodyLarge.copyWith(color: const Color(0xFFFFFFFF)),
        bodyMedium: AppTypography.bodyMedium.copyWith(color: const Color(0xFFFFFFFF)),
        bodySmall: AppTypography.bodySmall.copyWith(color: const Color(0xFF9A9A9A)),
        labelLarge: AppTypography.buttonLarge,
        labelMedium: AppTypography.label.copyWith(color: const Color(0xFF9A9A9A)),
        labelSmall: AppTypography.caption.copyWith(color: const Color(0xFF7A7A7A)),
      ),

      extensions: const [AppColorsTheme.dark, LlTokens.dark],
    );
  }
}
