import 'package:flutter/material.dart';
import 'tokens.dart';

class LivelabTheme {
  static ThemeData dark() => _build(LlTokens.dark, Brightness.dark);
  static ThemeData light() => _build(LlTokens.light, Brightness.light);

  static ThemeData _build(LlTokens t, Brightness b) {
    final base = b == Brightness.dark ? ThemeData.dark() : ThemeData.light();
    return base.copyWith(
      brightness: b,
      scaffoldBackgroundColor: t.bgBase,
      canvasColor: t.bgElev1,
      colorScheme: ColorScheme(
        brightness: b,
        primary: t.primary,
        onPrimary: Colors.white,
        secondary: t.info,
        onSecondary: Colors.white,
        error: t.danger,
        onError: Colors.white,
        surface: t.bgElev1,
        onSurface: t.textPrimary,
      ),
      extensions: [t],
      textTheme: base.textTheme.apply(
        bodyColor: t.textPrimary,
        displayColor: t.textPrimary,
      ),
      dividerColor: t.hairline,
      iconTheme: IconThemeData(color: t.textSecondary),
    );
  }
}

/// Convenience accessor.
extension LlTokensX on BuildContext {
  LlTokens get llTokens => Theme.of(this).extension<LlTokens>()!;
}
