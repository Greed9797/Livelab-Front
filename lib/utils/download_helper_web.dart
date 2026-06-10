import 'dart:js_interop';
import 'dart:typed_data';

import 'package:web/web.dart' as web;

/// Dispara o download de [bytes] como arquivo [filename] no Flutter Web.
///
/// Cria um Blob em memória, gera uma object URL, anexa um anchor invisível ao
/// document, simula o clique e revoga a URL em seguida — sem abrir nova aba.
void downloadBytesAsFile(Uint8List bytes, String filename) {
  final jsArray = bytes.toJS;

  final blob = web.Blob(
    [jsArray].toJS,
    web.BlobPropertyBag(type: 'application/pdf'),
  );

  final url = web.URL.createObjectURL(blob);

  final anchor = web.document.createElement('a') as web.HTMLAnchorElement
    ..href = url
    ..download = filename
    ..style.display = 'none';

  web.document.body!.append(anchor);
  anchor.click();
  anchor.remove();

  // Libera a object URL após um frame para garantir que o browser iniciou o
  // download antes de revogar.
  Future<void>.delayed(const Duration(milliseconds: 100), () {
    web.URL.revokeObjectURL(url);
  });
}
