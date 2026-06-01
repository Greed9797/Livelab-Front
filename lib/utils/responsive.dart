import 'package:flutter/widgets.dart';
import '../design_system/design_system.dart';

/// Responsive layout helper.
///
/// Usage:
/// ```dart
/// final r = Responsive.of(context);
/// if (r.isDesktop) { ... }
/// GridView(crossAxisCount: r.gridColumns(desktop: 4, tablet: 2, mobile: 1))
/// ```
class Responsive {
  final double width;

  const Responsive._(this.width);

  factory Responsive.of(BuildContext context) =>
      Responsive._(MediaQuery.sizeOf(context).width);

  factory Responsive.fromConstraints(BoxConstraints constraints) =>
      Responsive._(constraints.maxWidth);

  bool get isMobile => width < AppBreakpoints.mobile;
  bool get isTablet => width >= AppBreakpoints.mobile && width < AppBreakpoints.desktop;
  bool get isDesktop => width >= AppBreakpoints.desktop;

  /// Returns one of three values based on the current breakpoint.
  T when<T>({required T mobile, required T tablet, required T desktop}) {
    if (isDesktop) return desktop;
    if (isTablet) return tablet;
    return mobile;
  }

  /// Returns a grid column count appropriate for the current breakpoint.
  int gridColumns({int desktop = 4, int tablet = 2, int mobile = 1}) =>
      when(mobile: mobile, tablet: tablet, desktop: desktop);

  /// Returns horizontal content padding appropriate for the current breakpoint.
  double get contentPadding =>
      when(mobile: 16.0, tablet: 24.0, desktop: 32.0);

  /// Returns card gap (spacing between cards) for the current breakpoint.
  double get cardGap =>
      when(mobile: 12.0, tablet: 16.0, desktop: 20.0);
}
