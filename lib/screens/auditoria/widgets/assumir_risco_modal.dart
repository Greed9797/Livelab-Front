import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../design_system/design_system.dart';
import '../../../models/contrato.dart';
import '../../../providers/contratos_provider.dart';

class AssumirRiscoModal extends ConsumerStatefulWidget {
  final Contrato contrato;

  const AssumirRiscoModal({super.key, required this.contrato});

  @override
  ConsumerState<AssumirRiscoModal> createState() => _AssumirRiscoModalState();
}

class _AssumirRiscoModalState extends ConsumerState<AssumirRiscoModal> {
  final _confirmacaoCtrl = TextEditingController();
  final _senhaCtrl = TextEditingController();

  bool _loading = false;

  bool get _canSubmit {
    return _confirmacaoCtrl.text.trim().toUpperCase() == 'CONCORDO' &&
        _senhaCtrl.text.trim().isNotEmpty &&
        !_loading;
  }

  @override
  void dispose() {
    _confirmacaoCtrl.dispose();
    _senhaCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_canSubmit) return;

    setState(() => _loading = true);

    try {
      await ref.read(contratosProvider.notifier).assumirRisco(
            widget.contrato.id,
            confirmacao: _confirmacaoCtrl.text.trim().toUpperCase(),
            senha: _senhaCtrl.text.trim(),
          );

      if (!mounted) return;

      Navigator.of(context).pop(true);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Operação ativada. Lembre-se: inadimplência desta conta é de sua responsabilidade comercial.',
          ),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(_friendlyError(e))),
      );
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  String _friendlyError(Object e) {
    final raw = e.toString();
    if (raw.contains('Confirmação inválida')) {
      return 'Digite CONCORDO para confirmar a assunção do risco.';
    }
    if (raw.contains('Senha inválida')) {
      return 'A senha informada está incorreta.';
    }
    if (raw.contains('Senha é obrigatória')) {
      return 'Informe sua senha para continuar.';
    }
    return 'Não foi possível assumir o risco agora. Tente novamente.';
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.xl)),
      child: AnimatedPadding(
        duration: const Duration(milliseconds: 180),
        padding: EdgeInsets.only(bottom: bottomInset),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 520),
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(AppSpacing.x6),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.warning_amber_rounded,
                        color: AppColors.primary),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text('Assumir Risco da Operação',
                          style: AppTypography.h3),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(AppSpacing.x4),
                  decoration: BoxDecoration(
                    color: context.colors.bgMuted,
                    borderRadius: BorderRadius.circular(AppRadius.lg),
                    border: Border.all(color: AppColors.primary),
                  ),
                  child: Text(
                    'Ao assumir esta operação, os valores de inadimplência poderão ser descontados integralmente dos seus repasses futuros, conforme as regras comerciais da franqueadora.',
                    style: AppTypography.bodySmall
                        .copyWith(color: context.colors.textPrimary),
                  ),
                ),
                const SizedBox(height: 20),
                Text('Para continuar, digite a palavra CONCORDO:',
                    style: AppTypography.bodySmall),
                const SizedBox(height: 8),
                AppTextField(
                  controller: _confirmacaoCtrl,
                  hint: 'Digite CONCORDO',
                  onChanged: (_) => setState(() {}),
                ),
                const SizedBox(height: 16),
                Text('Confirme sua senha:', style: AppTypography.bodySmall),
                const SizedBox(height: 8),
                AppTextField(
                  controller: _senhaCtrl,
                  obscureText: true,
                  onChanged: (_) => setState(() {}),
                  hint: 'Sua senha',
                ),
                const SizedBox(height: 24),
                Row(
                  children: [
                    Expanded(
                      child: AppSecondaryButton(
                        onPressed: _loading
                            ? null
                            : () => Navigator.of(context).pop(false),
                        label: 'Cancelar',
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: AppPrimaryButton(
                        onPressed: _canSubmit ? _submit : null,
                        isLoading: _loading,
                        label: 'Ativar e Assumir Risco',
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
