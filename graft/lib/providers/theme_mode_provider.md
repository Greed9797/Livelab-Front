# lib/providers/theme_mode_provider.dart

- _kThemeKey · constant · L5-L5 — const _kThemeKey = 'app_theme_mode';
- _storage · constant · L6-L8 — const _storage = FlutterSecureStorage(
- ThemeModeNotifier · class · L10-L45 — class ThemeModeNotifier extends Notifier<ThemeMode>
- build · method · L14-L14 — ThemeMode build() => ThemeMode.light;
- restore · method · L16-L27 — Future<void> restore() async
- toggle · method · L29-L37 — Future<void> toggle() async
- defaultForRole · method · L39-L44 — void defaultForRole(String? papel)
- themeModeProvider · constant · L47-L48 — final themeModeProvider =
