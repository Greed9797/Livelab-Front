import 'download_helper_io.dart'
    if (dart.library.html) 'download_helper_web.dart';

export 'download_helper_io.dart'
    if (dart.library.html) 'download_helper_web.dart' show downloadBytesAsFile;
