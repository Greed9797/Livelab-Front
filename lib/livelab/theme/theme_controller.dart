import 'package:flutter/material.dart';

/// Toggleable theme controller. Hand to `MaterialApp.themeMode`.
class LlThemeController extends ChangeNotifier {
  LlThemeController({ThemeMode initial = ThemeMode.dark}) : _mode = initial;

  ThemeMode _mode;
  ThemeMode get mode => _mode;

  bool get isDark => _mode == ThemeMode.dark;

  void toggle() {
    _mode = isDark ? ThemeMode.light : ThemeMode.dark;
    notifyListeners();
  }

  void setMode(ThemeMode m) {
    if (_mode == m) return;
    _mode = m;
    notifyListeners();
  }
}

/// Inherited access to the controller without pulling in a state library.
class LlThemeScope extends InheritedNotifier<LlThemeController> {
  const LlThemeScope({
    super.key,
    required LlThemeController super.notifier,
    required super.child,
  });

  static LlThemeController of(BuildContext c) {
    final scope = c.dependOnInheritedWidgetOfExactType<LlThemeScope>();
    assert(scope != null, 'LlThemeScope missing in widget tree');
    return scope!.notifier!;
  }
}
