import 'dart:js_interop';
import 'package:web/web.dart' as web;

/// Web implementation: uses the async Clipboard API with execCommand fallback.
Future<bool> copyToClipboard(String text) async {
  // Modern async clipboard API
  try {
    await web.window.navigator.clipboard.writeText(text).toDart;
    return true;
  } catch (_) {
    // ignore: fall through to execCommand
  }
  // Legacy execCommand fallback
  try {
    final textarea =
        web.document.createElement('textarea') as web.HTMLTextAreaElement;
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    web.document.body!.append(textarea);
    textarea.select();
    final success = web.document.execCommand('copy');
    textarea.remove();
    return success;
  } catch (_) {
    return false;
  }
}
