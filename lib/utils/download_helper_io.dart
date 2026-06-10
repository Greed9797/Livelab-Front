import 'dart:typed_data';

/// Non-web stub — download via browser anchor is not applicable here.
/// On native platforms, saving bytes to disk is handled separately.
void downloadBytesAsFile(Uint8List bytes, String filename) {
  // No-op on non-web platforms.
}
