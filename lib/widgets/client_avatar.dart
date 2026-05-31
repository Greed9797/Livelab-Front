import 'package:flutter/material.dart';
import '../../design_system/design_system.dart';

enum ClientAvatarTone { success, warning, neutral }

class ClientAvatar extends StatelessWidget {
  final String initials;
  final ClientAvatarTone tone;
  final double size;

  const ClientAvatar({
    super.key,
    required this.initials,
    this.tone = ClientAvatarTone.neutral,
    this.size = 40,
  });

  @override
  Widget build(BuildContext context) {
    final (bg, fg) = switch (tone) {
      ClientAvatarTone.success => (AppColors.successBg, AppColors.success),
      ClientAvatarTone.warning => (AppColors.warningBg, AppColors.warning),
      ClientAvatarTone.neutral => (context.colors.primarySoftBg, AppColors.primary),
    };
    return Container(
      width: size, height: size,
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(size / 2)),
      child: Center(
        child: Text(
          initials.isNotEmpty ? initials[0].toUpperCase() : '?',
          style: TextStyle(color: fg, fontWeight: FontWeight.w600, fontSize: size / 2.5),
        ),
      ),
    );
  }
}