import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/tenants_provider.dart';
import '../../services/api_service.dart';
import '../../design_system/design_system.dart';
import '../../utils/form_validators.dart';
import '../../widgets/temp_password_dialog.dart';

class CriarFranquiaDialog extends ConsumerStatefulWidget {
  const CriarFranquiaDialog({super.key});

  @override
  ConsumerState<CriarFranquiaDialog> createState() =>
      _CriarFranquiaDialogState();
}

class _CriarFranquiaDialogState extends ConsumerState<CriarFranquiaDialog> {
  final _formKey = GlobalKey<FormState>();
  final _nomeCtrl = TextEditingController();
  final _cnpjCtrl = TextEditingController();
  final _telefoneCtrl = TextEditingController();
  final _emailContatoCtrl = TextEditingController();
  final _ownerNomeCtrl = TextEditingController();
  final _ownerEmailCtrl = TextEditingController();
  final _ownerSenhaCtrl = TextEditingController();
  bool _saving = false;

  @override
  void dispose() {
    _nomeCtrl.dispose();
    _cnpjCtrl.dispose();
    _telefoneCtrl.dispose();
    _emailContatoCtrl.dispose();
    _ownerNomeCtrl.dispose();
    _ownerEmailCtrl.dispose();
    _ownerSenhaCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      insetPadding: const EdgeInsets.all(AppSpacing.x4),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 520),
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.x6),
          child: Form(
            key: _formKey,
            autovalidateMode: AutovalidateMode.onUserInteraction,
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Nova Franquia', style: AppTypography.h3),
                  const SizedBox(height: AppSpacing.x2),
                  Text(
                    'Cria tenant + usuário franqueado (owner) em uma transação.',
                    style: AppTypography.bodySmall
                        .copyWith(color: AppColors.textMuted),
                  ),
                  const SizedBox(height: AppSpacing.x6),

                  _SectionTitle('Dados da Franquia'),
                  const SizedBox(height: AppSpacing.x3),

                  _Label('Nome da unidade *'),
                  TextFormField(
                    controller: _nomeCtrl,
                    decoration: _dec('Ex: Livelab SP Faria Lima'),
                    validator: FormValidators.required(),
                  ),
                  const SizedBox(height: AppSpacing.x3),

                  Row(children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _Label('CNPJ'),
                          TextFormField(
                            controller: _cnpjCtrl,
                            decoration: _dec('00.000.000/0001-00'),
                            validator: FormValidators.cnpj,
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: AppSpacing.x3),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _Label('Telefone'),
                          TextFormField(
                            controller: _telefoneCtrl,
                            keyboardType: TextInputType.phone,
                            decoration: _dec('(11) 9 0000-0000'),
                            validator: FormValidators.telefoneBr,
                          ),
                        ],
                      ),
                    ),
                  ]),
                  const SizedBox(height: AppSpacing.x3),

                  _Label('E-mail de contato'),
                  TextFormField(
                    controller: _emailContatoCtrl,
                    keyboardType: TextInputType.emailAddress,
                    decoration: _dec('contato@unidade.com.br'),
                    validator: FormValidators.email,
                  ),
                  const SizedBox(height: AppSpacing.x6),

                  _SectionTitle('Usuário Franqueado (Owner)'),
                  const SizedBox(height: AppSpacing.x3),

                  _Label('Nome do franqueado *'),
                  TextFormField(
                    controller: _ownerNomeCtrl,
                    decoration: _dec('Nome completo'),
                    validator: FormValidators.required(),
                  ),
                  const SizedBox(height: AppSpacing.x3),

                  _Label('E-mail do franqueado *'),
                  TextFormField(
                    controller: _ownerEmailCtrl,
                    keyboardType: TextInputType.emailAddress,
                    decoration: _dec('email@unidade.com.br'),
                    validator: FormValidators.composite([
                      FormValidators.required(),
                      FormValidators.email,
                    ]),
                  ),
                  const SizedBox(height: AppSpacing.x3),

                  _Label('Senha temporária (opcional)'),
                  TextFormField(
                    controller: _ownerSenhaCtrl,
                    decoration:
                        _dec('Deixe em branco para gerar automaticamente'),
                    validator: FormValidators.minLength(8),
                  ),
                  const SizedBox(height: AppSpacing.x6),

                  Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      AppSecondaryButton(
                        label: 'Cancelar',
                        onPressed: () => Navigator.of(context).pop(),
                      ),
                      const SizedBox(width: AppSpacing.x3),
                      AppPrimaryButton(
                        label: 'Criar franquia',
                        onPressed: _saving ? null : _submit,
                        isLoading: _saving,
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() => _saving = true);

    try {
      final payload = {
        'nome': _nomeCtrl.text.trim(),
        if (_cnpjCtrl.text.trim().isNotEmpty) 'cnpj': _cnpjCtrl.text.trim(),
        if (_telefoneCtrl.text.trim().isNotEmpty)
          'telefone_contato': _telefoneCtrl.text.trim(),
        if (_emailContatoCtrl.text.trim().isNotEmpty)
          'email_contato': _emailContatoCtrl.text.trim(),
        'franqueado': {
          'nome': _ownerNomeCtrl.text.trim(),
          'email': _ownerEmailCtrl.text.trim(),
          if (_ownerSenhaCtrl.text.trim().isNotEmpty)
            'senha_temporaria': _ownerSenhaCtrl.text.trim(),
        },
      };

      final result =
          await ref.read(tenantsProvider.notifier).criarFranquia(payload);

      if (!mounted) return;
      Navigator.of(context).pop();

      final owner = result['owner'] as Map<String, dynamic>;
      await TempPasswordDialog.show(
        context,
        nome: owner['nome'] as String,
        email: owner['email'] as String,
        senhaTemporaria: result['senha_temporaria'] as String,
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(ApiService.extractErrorMessage(e)),
        backgroundColor: AppColors.danger,
      ));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  InputDecoration _dec(String? hint) => InputDecoration(
        hintText: hint,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.x3,
          vertical: AppSpacing.x2,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.sm),
          borderSide: BorderSide(color: AppColors.borderLight),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.sm),
          borderSide: BorderSide(color: AppColors.borderLight),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.sm),
          borderSide: BorderSide(color: AppColors.primary, width: 1.5),
        ),
      );
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle(this.text);
  final String text;

  @override
  Widget build(BuildContext context) => Text(
        text,
        style: AppTypography.bodyMedium.copyWith(
          fontWeight: FontWeight.w700,
          color: AppColors.textSecondary,
        ),
      );
}

class _Label extends StatelessWidget {
  const _Label(this.text);
  final String text;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: AppSpacing.x1),
        child: Text(
          text,
          style: AppTypography.bodySmall.copyWith(
            fontWeight: FontWeight.w600,
            color: AppColors.textSecondary,
          ),
        ),
      );
}
