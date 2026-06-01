import 'package:flutter/material.dart';

class LL {
  LL._();

  // Dark colors (always-on: accent, semantic, sparklines)
  static const Color bg = Color(0xFF0B0B0F);
  static const Color surface = Color(0xFF141418);
  static const Color surface2 = Color(0xFF1C1C22);
  static const Color surface3 = Color(0xFF242430);

  static const Color border = Color(0x0FFFFFFF);
  static const Color borderMid = Color(0x1AFFFFFF);

  static const Color accent = Color(0xFFFF5500);
  static const Color accent2 = Color(0xFFFF7733);
  static const Color accentSoft = Color(0x24FF5500);
  static const Color accentGlow = Color(0x14FF5500);

  static const Color live = Color(0xFFFF3B30);
  static const Color liveSoft = Color(0x24FF3B30);
  static const Color success = Color(0xFF34C759);
  static const Color successSoft = Color(0x1F34C759);
  static const Color warning = Color(0xFFFFD60A);
  static const Color warnSoft = Color(0x1FFFD60A);
  static const Color info = Color(0xFF5E9CF5);
  static const Color infoSoft = Color(0x1F5E9CF5);

  static const Color textPrimary = Color(0xFFF0EDE8);
  static const Color textSecond = Color(0xFFA09CB0);
  static const Color textMuted = Color(0xFF55535F);

  // Light mode surface colors
  static const Color _lBg = Color(0xFFF5F4F2);
  static const Color _lSurface = Color(0xFFFFFFFF);
  static const Color _lSurface3 = Color(0xFFF0EEE8);
  static const Color _lBorder = Color(0x1A000000);
  static const Color _lTextPrimary = Color(0xFF1A1918);
  static const Color _lTextMuted = Color(0xFF9E9BA8);

  static const double sidebarExpanded = 220;
  static const double sidebarCollapsed = 64;

  static TextStyle get label => const TextStyle(
        fontSize: 10,
        fontWeight: FontWeight.w700,
        letterSpacing: 1.0,
        color: textMuted,
      );

  static TextStyle get caption => const TextStyle(
        fontSize: 11.5,
        fontWeight: FontWeight.w500,
        color: textMuted,
        height: 1.3,
      );

  static TextStyle get body => const TextStyle(
        fontSize: 13,
        fontWeight: FontWeight.w500,
        color: textSecond,
        height: 1.35,
      );

  static TextStyle get titleItalic => const TextStyle(
        fontFamily: 'Georgia',
        fontStyle: FontStyle.italic,
        fontSize: 30,
        fontWeight: FontWeight.w400,
        color: textPrimary,
        letterSpacing: -0.9,
        height: 1.1,
      );

  static TextStyle get titleBold => const TextStyle(
        fontSize: 30,
        fontWeight: FontWeight.w900,
        color: textPrimary,
        letterSpacing: -0.9,
        height: 1.1,
      );

  static ThemeData get theme => ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        fontFamily: 'Manrope',
        scaffoldBackgroundColor: bg,
        colorScheme: const ColorScheme.dark(
          primary: accent,
          secondary: accent,
          surface: surface,
          error: live,
          onSurface: textPrimary,
        ),
        splashFactory: NoSplash.splashFactory,
        highlightColor: Colors.transparent,
        textSelectionTheme: const TextSelectionThemeData(cursorColor: accent),
        scrollbarTheme: ScrollbarThemeData(
          thumbColor: MaterialStateProperty.all(const Color(0x22FFFFFF)),
          trackColor: MaterialStateProperty.all(Colors.transparent),
          radius: const Radius.circular(3),
          thickness: MaterialStateProperty.all(5),
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: surface3,
          hintStyle: const TextStyle(color: textMuted, fontSize: 13),
          labelStyle: const TextStyle(color: textMuted, fontSize: 12),
          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10),
            borderSide: const BorderSide(color: border),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10),
            borderSide: const BorderSide(color: border),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10),
            borderSide: const BorderSide(color: accent, width: 1.4),
          ),
        ),
      );

  static ThemeData get lightTheme => ThemeData(
        useMaterial3: true,
        brightness: Brightness.light,
        fontFamily: 'Manrope',
        scaffoldBackgroundColor: _lBg,
        colorScheme: const ColorScheme.light(
          primary: accent,
          secondary: accent,
          surface: _lSurface,
          error: live,
          onSurface: _lTextPrimary,
        ),
        splashFactory: NoSplash.splashFactory,
        highlightColor: Colors.transparent,
        textSelectionTheme: const TextSelectionThemeData(cursorColor: accent),
        scrollbarTheme: ScrollbarThemeData(
          thumbColor: MaterialStateProperty.all(const Color(0x44000000)),
          trackColor: MaterialStateProperty.all(Colors.transparent),
          radius: const Radius.circular(3),
          thickness: MaterialStateProperty.all(5),
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: _lSurface3,
          hintStyle: const TextStyle(color: _lTextMuted, fontSize: 13),
          labelStyle: const TextStyle(color: _lTextMuted, fontSize: 12),
          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10),
            borderSide: const BorderSide(color: _lBorder),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10),
            borderSide: const BorderSide(color: _lBorder),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10),
            borderSide: const BorderSide(color: accent, width: 1.4),
          ),
        ),
      );
}

extension LLColorX on Color {
  Color llOpacity(double opacity) => withOpacity(opacity.clamp(0.0, 1.0).toDouble());
}

extension LLContext on BuildContext {
  bool get llIsDark => Theme.of(this).brightness == Brightness.dark;

  Color get llBg => llIsDark ? LL.bg : const Color(0xFFF5F4F2);
  Color get llSurface2 => llIsDark ? LL.surface2 : Colors.white;
  Color get llSurface3 => llIsDark ? LL.surface3 : const Color(0xFFF0EEE8);
  Color get llBorder => llIsDark ? LL.border : const Color(0x1A000000);
  Color get llBorderMid => llIsDark ? LL.borderMid : const Color(0x26000000);
  Color get llTextPrimary => llIsDark ? LL.textPrimary : const Color(0xFF1A1918);
  Color get llTextSecond => llIsDark ? LL.textSecond : const Color(0xFF6B6870);
  Color get llTextMuted => llIsDark ? LL.textMuted : const Color(0xFF9E9BA8);
}
