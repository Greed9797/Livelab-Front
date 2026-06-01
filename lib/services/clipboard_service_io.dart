import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

/// Non-web implementation: delegates to Flutter's platform clipboard.
Future<bool> copyToClipboard(String text) async {
  try {
    await Clipboard.setData(ClipboardData(text: text));
    return true;
  } catch (e, st) {
    assert(() {
      debugPrint('[ClipboardService] copy failed: $e\n$st');
      return true;
    }());
    return false;
  }
}
