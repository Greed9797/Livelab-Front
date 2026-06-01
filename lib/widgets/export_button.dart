// lib/widgets/export_button.dart
// Botão de exportação reusável — usa AppPrimaryButton com isLoading nativo.

import 'package:flutter/material.dart';

import '../design_system/design_system.dart';

class ExportButton extends StatelessWidget {
  final String label;
  final IconData? icon;
  final Future<void> Function() onPressed;
  final bool isLoading;
  final bool outlined;

  const ExportButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.icon,
    this.isLoading = false,
    this.outlined = true,
  });

  @override
  Widget build(BuildContext context) {
    return AppPrimaryButton(
      label: label,
      icon: icon,
      isLoading: isLoading,
      outlined: outlined,
      onPressed: isLoading
          ? null
          : () {
              // Dispara async, swallow rethrow — provider já guarda erro em state.
              onPressed().catchError((Object e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text(e.toString())),
                  );
                }
              });
            },
    );
  }
}
