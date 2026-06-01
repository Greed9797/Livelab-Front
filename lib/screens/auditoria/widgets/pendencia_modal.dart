import 'package:flutter/material.dart';

import '../../../design_system/design_system.dart';

class PendenciaModal extends StatefulWidget {
  const PendenciaModal({super.key});

  @override
  State<PendenciaModal> createState() => _PendenciaModalState();
}

class _PendenciaModalState extends State<PendenciaModal> {
  final _controller = TextEditingController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;
    final canSubmit = _controller.text.trim().length >= 8;

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.xl)),
      child: AnimatedPadding(
        duration: const Duration(milliseconds: 180),
        padding: EdgeInsets.only(bottom: bottomInset),
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppSpacing.x6),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Sinalizar Pendência', style: AppTypography.h3),
              const SizedBox(height: 8),
              Text(
                'Explique o ajuste necessário para ajudar o franqueado a ativar a venda mais rápido.',
                style: AppTypography.bodySmall,
              ),
              const SizedBox(height: 16),
              AppTextField(
                controller: _controller,
                keyboardType: TextInputType.multiline,
                onChanged: (_) => setState(() {}),
                hint: 'Ex: Comprovante de endereço ilegível. Favor reenviar.',
              ),
              const SizedBox(height: 20),
              Row(
                children: [
                  Expanded(
                    child: AppSecondaryButton(
                      onPressed: () => Navigator.of(context).pop(),
                      label: 'Cancelar',
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: AppPrimaryButton(
                      onPressed: canSubmit
                          ? () =>
                              Navigator.of(context).pop(_controller.text.trim())
                          : null,
                      label: 'Salvar Pendência',
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
