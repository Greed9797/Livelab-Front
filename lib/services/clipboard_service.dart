import 'clipboard_service_io.dart'
    if (dart.library.html) 'clipboard_service_web.dart';

/// Cross-platform clipboard helper.
///
/// On Flutter Web it uses the async Clipboard API (with an execCommand fallback).
/// On all other platforms it delegates to Flutter's platform [Clipboard].
class ClipboardService {
  const ClipboardService._();

  /// Copies [text] to the system clipboard.
  ///
  /// Returns `true` if the copy succeeded, `false` if it failed.
  static Future<bool> copy(String text) => copyToClipboard(text);
}
