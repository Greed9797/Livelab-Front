import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';
import '../design_system/design_system.dart';

class SkeletonList extends StatelessWidget {
  final int itemCount;
  final double itemHeight;
  final EdgeInsetsGeometry padding;
  final bool scrollable;

  const SkeletonList({
    super.key,
    this.itemCount = 6,
    this.itemHeight = 72,
    this.padding = EdgeInsets.zero,
    this.scrollable = false,
  });

  @override
  Widget build(BuildContext context) {
    final base = context.colors.bgMuted;
    final highlight = context.colors.bgCard;

    final items = List.generate(itemCount, (i) {
      return Padding(
        padding: const EdgeInsets.only(bottom: AppSpacing.x3),
        child: Shimmer.fromColors(
          baseColor: base,
          highlightColor: highlight,
          period: const Duration(milliseconds: 1200),
          child: Container(
            height: itemHeight,
            decoration: BoxDecoration(
              color: base,
              borderRadius: BorderRadius.circular(AppRadius.lg),
            ),
          ),
        ),
      );
    });

    final col = Column(children: items);
    return Padding(
      padding: padding,
      child: scrollable ? SingleChildScrollView(child: col) : col,
    );
  }
}

class SkeletonCard extends StatelessWidget {
  final double height;
  final BorderRadius? borderRadius;

  const SkeletonCard({super.key, this.height = 120, this.borderRadius});

  @override
  Widget build(BuildContext context) {
    final base = context.colors.bgMuted;
    final highlight = context.colors.bgCard;
    return Shimmer.fromColors(
      baseColor: base,
      highlightColor: highlight,
      period: const Duration(milliseconds: 1200),
      child: Container(
        height: height,
        decoration: BoxDecoration(
          color: base,
          borderRadius: borderRadius ?? BorderRadius.circular(AppRadius.lg),
        ),
      ),
    );
  }
}
