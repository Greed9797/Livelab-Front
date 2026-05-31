import 'package:animations/animations.dart';
import 'package:flutter/material.dart';

/// Returns a Route that uses SharedAxisTransition (Z-axis / fade-through) for
/// premium feel. Replaces the default MaterialPageRoute slide.
Route<T> buildPremiumRoute<T>({
  required Widget child,
  RouteSettings? settings,
  bool fullscreenDialog = false,
}) {
  return PageRouteBuilder<T>(
    settings: settings,
    fullscreenDialog: fullscreenDialog,
    transitionDuration: const Duration(milliseconds: 300),
    reverseTransitionDuration: const Duration(milliseconds: 250),
    pageBuilder: (context, animation, secondaryAnimation) => child,
    transitionsBuilder: (context, animation, secondaryAnimation, child) {
      return SharedAxisTransition(
        animation: animation,
        secondaryAnimation: secondaryAnimation,
        transitionType: SharedAxisTransitionType.scaled,
        child: child,
      );
    },
  );
}
