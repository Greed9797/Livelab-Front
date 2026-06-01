// Trigger browser download de CSV/text em Flutter Web.
// Usa conditional import: dart:html em web; stub em VM/mobile (evita erro em testes).
import 'dart:convert';

import 'web_download_stub.dart'
    // ignore: uri_does_not_exist
    if (dart.library.html) 'web_download_html.dart';

void downloadTextFile({
  required String filename,
  required String content,
  String mimeType = 'text/csv;charset=utf-8',
}) {
  // BOM para Excel reconhecer UTF-8 corretamente.
  final bytes = utf8.encode('﻿$content');
  platformDownload(filename: filename, bytes: bytes, mimeType: mimeType);
}

String csvEscape(String v) {
  if (v.contains(',') || v.contains('"') || v.contains('\n')) {
    return '"${v.replaceAll('"', '""')}"';
  }
  return v;
}

String csvRow(List<String> cells) =>
    cells.map(csvEscape).join(';'); // ; favorece Excel pt-BR

String buildCsv({required List<String> headers, required List<List<String>> rows}) {
  final lines = <String>[csvRow(headers), for (final r in rows) csvRow(r)];
  return lines.join('\r\n');
}
