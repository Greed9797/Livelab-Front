import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../design_system/design_system.dart';

class TempPasswordDialog extends StatelessWidget {
  const TempPasswordDialog({
    super.key,
    required this.nome,
    required this.email,
    required this.senhaTemporaria,
  });

  final String nome;
  final String email;
  final String senhaTemporaria;

  static Future<void> show(
    BuildContext context, {
    required String nome,
    required String email,
    required String senhaTemporaria,
  }) {
    return showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (_) => TempPasswordDialog(
        nome: nome,
        email: email,
        senhaTemporaria: senhaTemporaria,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Usuário criado com sucesso'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Nome: $nome', style: AppTypography.bodyMedium),
          Text('E-mail: $email', style: AppTypography.bodyMedium),
          const SizedBox(height: AppSpacing.x4),
          Text(
            'Senha temporária',
            style: AppTypography.bodySmall.copyWith(
              color: AppColors.textMuted,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: AppSpacing.x1),
          _SenhaField(senha: senhaTemporaria),
          const SizedBox(height: AppSpacing.x3),
          Container(
            padding: const EdgeInsets.all(AppSpacing.x3),
            decoration: BoxDecoration(
              color: AppColors.warningBg,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: AppColors.warning.withOpacity(0.4)),
            ),
            child: Row(
              children: [
                Icon(Icons.warning_amber_rounded,
                    color: AppColors.warning, size: 18),
                const SizedBox(width: AppSpacing.x2),
                Expanded(
                  child: Text(
                    'Mostre esta senha apenas uma vez. Ela não poderá ser recuperada.',
                    style: AppTypography.bodySmall.copyWith(
                      color: AppColors.warning,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
      actions: [
        AppPrimaryButton(
          label: 'Entendi, já copiei',
          onPressed: () => Navigator.of(context).pop(),
        ),
      ],
    );
  }
}

class _SenhaField extends StatefulWidget {
  const _SenhaField({required this.senha});
  final String senha;

  @override
  State<_SenhaField> createState() => _SenhaFieldState();
}

class _SenhaFieldState extends State<_SenhaField> {
  bool _copied = false;

  Future<void> _copy() async {
    await Clipboard.setData(ClipboardData(text: widget.senha));
    setState(() => _copied = true);
    await Future.delayed(const Duration(seconds: 2));
    if (mounted) setState(() => _copied = false);
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.x3,
        vertical: AppSpacing.x2,
      ),
      decoration: BoxDecoration(
        color: AppColors.bgMuted,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppColors.borderLight),
      ),
      child: Row(
        children: [
          Expanded(
            child: SelectableText(
              widget.senha,
              style: AppTypography.bodyMedium.copyWith(
                fontFamily: 'monospace',
                letterSpacing: 1.5,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          const SizedBox(width: AppSpacing.x2),
          IconButton(
            tooltip: _copied ? 'Copiado' : 'Copiar senha',
            onPressed: _copy,
            iconSize: 18,
            visualDensity: VisualDensity.compact,
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
            icon: Icon(
              _copied ? Icons.check_circle_rounded : Icons.copy_rounded,
              color: _copied ? AppColors.success : AppColors.textMuted,
            ),
          ),
        ],
      ),
    );
  }
}
