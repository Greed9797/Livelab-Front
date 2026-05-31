import 'package:flutter/material.dart';

import '../../../design_system/design_system.dart';

class ReprovarModal extends StatefulWidget {
  const ReprovarModal({super.key});

  @override
  State<ReprovarModal> createState() => _ReprovarModalState();
}

class _ReprovarModalState extends State<ReprovarModal> {
  static const quickReasons = [
    'Restrição no CNPJ',
    'Documento inconsistente',
    'Política interna',
  ];

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
              Row(
                children: [
                  const Icon(Icons.warning_amber_rounded,
                      color: AppColors.danger),
                  const SizedBox(width: 12),
                  Text('Reprovar Operação', style: AppTypography.h3),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                'Informe o motivo da restrição para manter a auditoria clara e auditável.',
                style: AppTypography.bodySmall,
              ),
              const SizedBox(height: 16),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: quickReasons
                    .map((reason) => FilterChip(
                          label: Text(reason),
                          selected: _controller.text == reason,
                          onSelected: (selected) {
                            if (selected) {
                              _controller.text = reason;
                              setState(() {});
                            }
                          },
                        ))
                    .toList(),
              ),
              const SizedBox(height: 16),
              AppTextField(
                controller: _controller,
                keyboardType: TextInputType.multiline,
                onChanged: (_) => setState(() {}),
                hint: 'Descreva a razão da restrição comercial ou cadastral.',
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
                      label: 'Confirmar Restrição',
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
