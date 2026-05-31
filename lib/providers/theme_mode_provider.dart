import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

const _kThemeKey = 'app_theme_mode';
const _storage = FlutterSecureStorage(
  webOptions: WebOptions(dbName: 'livelab_prefs', publicKey: 'theme'),
);

class ThemeModeNotifier extends Notifier<ThemeMode> {
  bool _userSet = false;

  @override
  ThemeMode build() => ThemeMode.light;

  Future<void> restore() async {
    try {
      final saved = await _storage.read(key: _kThemeKey);
      if (saved == 'dark') {
        state = ThemeMode.dark;
        _userSet = true;
      } else if (saved == 'light') {
        state = ThemeMode.light;
        _userSet = true;
      }
    } catch (_) {}
  }

  Future<void> toggle() async {
    final next = state == ThemeMode.dark ? ThemeMode.light : ThemeMode.dark;
    state = next;
    _userSet = true;
    try {
      await _storage.write(
          key: _kThemeKey, value: next == ThemeMode.dark ? 'dark' : 'light');
    } catch (_) {}
  }

  void defaultForRole(String? papel) {
    if (_userSet) return;
    if (papel == 'cliente_parceiro') {
      state = ThemeMode.dark;
    }
  }
}

final themeModeProvider =
    NotifierProvider<ThemeModeNotifier, ThemeMode>(ThemeModeNotifier.new);
