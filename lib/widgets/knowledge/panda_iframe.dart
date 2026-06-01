// Re-export condicional: web → panda_iframe_web.dart (HtmlElementView real),
// outros → panda_iframe_stub.dart (SizedBox.shrink + fallback no caller).
export 'panda_iframe_stub.dart' if (dart.library.js_interop) 'panda_iframe_web.dart';
