import 'package:flutter/material.dart';

/// 📐 Livelab — Espaçamentos (grid 4px)
class AppSpacing {
  AppSpacing._();

  static const double x1 = 4.0;
  static const double x2 = 8.0;
  static const double x3 = 12.0;
  static const double x4 = 16.0;
  static const double x5 = 20.0;
  static const double x6 = 24.0;
  static const double x8 = 32.0;
  static const double x10 = 40.0;
  static const double x12 = 48.0;
  static const double x16 = 64.0;
  static const double sidebarW = 232.0;
}

/// 🟦 Livelab — Border Radius
class AppRadius {
  AppRadius._();

  static const double sm = 8.0;
  static const double md = 12.0;
  static const double lg = 16.0;
  static const double xl = 20.0;
  static const double xxl = 24.0;
  static const double full = 9999.0;

  // Helpers prontos
  static BorderRadius get smR => BorderRadius.circular(sm);
  static BorderRadius get mdR => BorderRadius.circular(md);
  static BorderRadius get lgR => BorderRadius.circular(lg);
  static BorderRadius get xlR => BorderRadius.circular(xl);
  static BorderRadius get xxlR => BorderRadius.circular(xxl);
  static BorderRadius get fullR => BorderRadius.circular(full);
}

/// 🌫️ Livelab — Sombras (elevation)
///
/// Sombras muito suaves, difusas — nunca marcadas.
class AppShadows {
  AppShadows._();

  static const List<BoxShadow> sm = [
    BoxShadow(
      color: Color.fromRGBO(0, 0, 0, 0.04),
      offset: Offset(0, 1),
      blurRadius: 2,
    ),
  ];

  static const List<BoxShadow> md = [
    BoxShadow(
      color: Color.fromRGBO(0, 0, 0, 0.06),
      offset: Offset(0, 4),
      blurRadius: 12,
    ),
  ];

  static const List<BoxShadow> lg = [
    BoxShadow(
      color: Color.fromRGBO(255, 90, 31, 0.08),
      offset: Offset(0, 10),
      blurRadius: 30,
    ),
  ];

  static const List<BoxShadow> xl = [
    BoxShadow(
      color: Color.fromRGBO(0, 0, 0, 0.08),
      offset: Offset(0, 20),
      blurRadius: 50,
    ),
  ];
}

/// 📱 Livelab — Breakpoints responsivos
class AppBreakpoints {
  AppBreakpoints._();

  static const double mobile = 600;
  static const double tablet = 800;
  static const double desktop = 1100;
  static const double wide = 1400;

  static bool isMobile(BuildContext context) =>
      MediaQuery.of(context).size.width < mobile;

  static bool isTablet(BuildContext context) {
    final w = MediaQuery.of(context).size.width;
    return w >= mobile && w < tablet;
  }

  static bool isDesktop(BuildContext context) =>
      MediaQuery.of(context).size.width >= tablet;
}
