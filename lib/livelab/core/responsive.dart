import 'package:flutter/widgets.dart';

enum LlDeviceClass { mobile, tablet, desktop }

class LlResponsive {
  const LlResponsive(this.deviceClass, this.size);
  final LlDeviceClass deviceClass;
  final Size size;

  bool get isMobile => deviceClass == LlDeviceClass.mobile;
  bool get isTablet => deviceClass == LlDeviceClass.tablet;
  bool get isDesktop => deviceClass == LlDeviceClass.desktop;

  static LlResponsive of(BuildContext c) {
    final s = MediaQuery.sizeOf(c);
    LlDeviceClass cls;
    if (s.width < 720) {
      cls = LlDeviceClass.mobile;
    } else if (s.width < 1280) {
      cls = LlDeviceClass.tablet;
    } else {
      cls = LlDeviceClass.desktop;
    }
    return LlResponsive(cls, s);
  }
}
