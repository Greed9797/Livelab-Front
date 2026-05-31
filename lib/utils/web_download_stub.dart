// Stub used on VM / mobile platforms where dart:html is unavailable.
// Called by web_download.dart via conditional import.
void platformDownload({
  required String filename,
  required List<int> bytes,
  required String mimeType,
}) {
  // No-op on non-web platforms.
}
