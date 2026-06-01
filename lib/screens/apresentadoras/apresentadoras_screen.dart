import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

import '../../design_system/design_system.dart';
import '../../models/apresentadora.dart';
import '../../providers/apresentadoras_provider.dart';
import '../../providers/disponibilidade_provider.dart';
import '../../routes/app_routes.dart';
import '../../services/api_service.dart';
import '../../utils/form_validators.dart';
import '../../widgets/calendar_week_view.dart';
import '../../widgets/disponibilidade_modal.dart';

class ApresentadorasScreen extends ConsumerWidget {
  final bool embedded;
  const ApresentadorasScreen({super.key, this.embedded = false});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(apresentadorasProvider);

    final content = Padding(
      padding: const EdgeInsets.all(AppSpacing.x6),
      child: async.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(
          child: Text(ApiService.extractErrorMessage(error)),
        ),
        data: (items) => items.isEmpty
            ? Center(
                child: Text(
                  'Nenhuma apresentadora cadastrada.',
                  style: AppTypography.bodyMedium
                      .copyWith(color: context.colors.textSecondary),
                ),
              )
            : ListView.separated(
                shrinkWrap: embedded,
                physics: embedded ? const NeverScrollableScrollPhysics() : null,
                itemCount: items.length,
                separatorBuilder: (_, __) =>
                    const SizedBox(height: AppSpacing.x3),
                itemBuilder: (context, index) => _ApresentadoraCard(
                  item: items[index],
                  onEdit: () => _openForm(context, ref, items[index]),
                  onCalendario: () => DisponibilidadeModal.open(
                    context: context,
                    apresentadoraId: items[index].id,
                    apresentadoraNome: items[index].nome,
                  ),
                ),
              ),
      ),
    );

    if (embedded) return content;

    return AppScreenScaffold(
      currentRoute: AppRoutes.apresentadoras,
      eyebrow: 'Pessoas',
      title: 'Apresentadoras',
      titleSerif: true,
      subtitle: 'Controle de pessoas vinculadas à operação de lives.',
      actions: [
        AppPrimaryButton(
          label: 'Nova',
          icon: Icons.add_rounded,
          onPressed: () => _openForm(context, ref),
        ),
      ],
      child: content,
    );
  }

  void _openForm(BuildContext context, WidgetRef ref, [Apresentadora? item]) {
    final nomeCtrl = TextEditingController(text: item?.nome ?? '');
    final telefoneCtrl = TextEditingController(text: item?.telefone ?? '');
    final cargoCtrl = TextEditingController(text: item?.cargo ?? '');
    final emailCtrl = TextEditingController(text: item?.email ?? '');
    final cpfCtrl = TextEditingController(text: item?.cpfCnpj ?? '');
    final cidadeCtrl = TextEditingController(text: item?.cidade ?? '');
    final fixoCtrl =
        TextEditingController(text: item?.fixo.toStringAsFixed(2) ?? '');
    final comissaoCtrl =
        TextEditingController(text: item?.comissaoPct.toStringAsFixed(2) ?? '');
    final metaCtrl = TextEditingController(
        text: item?.metaDiariaGmv.toStringAsFixed(2) ?? '');
    final obsCtrl = TextEditingController(text: item?.observacoes ?? '');
    final linkContratoCtrl =
        TextEditingController(text: item?.linkContrato ?? '');
    final aniversarioCtrl =
        TextEditingController(text: item?.dataAniversario ?? '');
    final dataInicioCtrl =
        TextEditingController(text: item?.dataInicio ?? '');
    final dataFimCtrl = TextEditingController(text: item?.dataFim ?? '');
    var ativo = item?.ativo ?? true;
    var step = 0;
    var criarUsuario = false;
    final usuarioEmailCtrl = TextEditingController(text: item?.email ?? '');
    final usuarioSenhaCtrl = TextEditingController();
    var senhaVisivel = false;
    final dadosFormKey = GlobalKey<FormState>();
    final usuarioFormKey = GlobalKey<FormState>();

    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      backgroundColor: context.colors.bgCard,
      builder: (sheetContext) => StatefulBuilder(
        builder: (context, setState) {
          return Padding(
            padding: EdgeInsets.only(
              left: AppSpacing.x5,
              right: AppSpacing.x5,
              bottom: MediaQuery.of(context).viewInsets.bottom + AppSpacing.x5,
            ),
            child: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                      item == null
                          ? 'Nova apresentadora'
                          : 'Editar apresentadora',
                      style: AppTypography.h3),
                  const SizedBox(height: AppSpacing.x3),
                  // Step indicator
                  Row(children: [
                    _StepBadge(label: '1 · Dados', active: step == 0),
                    const SizedBox(width: AppSpacing.x2),
                    _StepBadge(label: '2 · Usuário', active: step == 1, dim: !criarUsuario),
                  ]),
                  const SizedBox(height: AppSpacing.x4),
                  if (step == 1) ...[
                    Text('Acesso ao app',
                        style: AppTypography.bodyLarge.copyWith(fontWeight: FontWeight.w700)),
                    const SizedBox(height: AppSpacing.x2),
                    SwitchListTile.adaptive(
                      contentPadding: EdgeInsets.zero,
                      title: const Text('Criar conta de acesso ao app'),
                      subtitle: const Text(
                          'A apresentadora poderá fazer login com o email e senha definidos abaixo.'),
                      value: criarUsuario,
                      onChanged: (v) => setState(() {
                        criarUsuario = v;
                        if (v && usuarioEmailCtrl.text.isEmpty) {
                          usuarioEmailCtrl.text = emailCtrl.text;
                        }
                      }),
                    ),
                    if (criarUsuario) ...[
                      const SizedBox(height: AppSpacing.x3),
                      Form(
                        key: usuarioFormKey,
                        autovalidateMode: AutovalidateMode.onUserInteraction,
                        child: Column(children: [
                      AppTextField(
                        controller: usuarioEmailCtrl,
                        hint: 'E-mail de acesso *',
                        keyboardType: TextInputType.emailAddress,
                        validator: FormValidators.composite([
                          FormValidators.required(),
                          FormValidators.email,
                        ]),
                      ),
                      const SizedBox(height: AppSpacing.x3),
                      Row(children: [
                        Expanded(
                          child: AppTextField(
                            controller: usuarioSenhaCtrl,
                            hint: 'Senha *',
                            obscureText: !senhaVisivel,
                            validator: FormValidators.composite([
                              FormValidators.required(),
                              FormValidators.strongPassword,
                            ]),
                          ),
                        ),
                        IconButton(
                          icon: Icon(senhaVisivel
                              ? Icons.visibility_off
                              : Icons.visibility),
                          onPressed: () =>
                              setState(() => senhaVisivel = !senhaVisivel),
                        ),
                        IconButton(
                          tooltip: 'Gerar senha',
                          icon: const Icon(Icons.casino_outlined),
                          onPressed: () => setState(() {
                            usuarioSenhaCtrl.text = _generatePassword();
                            senhaVisivel = true;
                          }),
                        ),
                      ]),
                      const SizedBox(height: AppSpacing.x2),
                      Text(
                        'Mínimo 8 caracteres com letra e número.',
                        style: AppTypography.caption
                            .copyWith(color: context.colors.textMuted),
                      ),
                        ]),
                      ),
                    ] else
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: AppSpacing.x4),
                        child: Text(
                          'Sem acesso ao app — a apresentadora ficará apenas no cadastro interno.',
                          style: AppTypography.bodySmall
                              .copyWith(color: context.colors.textSecondary),
                        ),
                      ),
                  ] else ...[
                  Form(
                    key: dadosFormKey,
                    autovalidateMode: AutovalidateMode.onUserInteraction,
                    child: Column(children: [
                  AppTextField(
                    controller: nomeCtrl,
                    hint: 'Nome *',
                    validator: FormValidators.required(),
                  ),
                  const SizedBox(height: AppSpacing.x3),
                  Row(
                    children: [
                      Expanded(
                          child: AppTextField(
                              controller: telefoneCtrl,
                              hint: 'Telefone',
                              validator: FormValidators.telefoneBr)),
                      const SizedBox(width: AppSpacing.x3),
                      Expanded(
                          child: AppTextField(
                              controller: cargoCtrl, hint: 'Cargo')),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.x3),
                  Row(
                    children: [
                      Expanded(
                          child: AppTextField(
                              controller: emailCtrl,
                              hint: 'E-mail',
                              validator: FormValidators.email)),
                      const SizedBox(width: AppSpacing.x3),
                      Expanded(
                          child: AppTextField(
                              controller: cpfCtrl,
                              hint: 'CPF/CNPJ',
                              validator: FormValidators.cpfOrCnpj)),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.x3),
                  AppTextField(controller: cidadeCtrl, hint: 'Cidade'),
                  const SizedBox(height: AppSpacing.x3),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(child: _LabeledField(
                          label: 'Fixo (R\$)',
                          controller: fixoCtrl,
                          hint: '0,00',
                          validator: FormValidators.nonNegativeNumber)),
                      const SizedBox(width: AppSpacing.x3),
                      Expanded(child: _LabeledField(
                          label: 'Comissão (%)',
                          controller: comissaoCtrl,
                          hint: '0,0',
                          validator: FormValidators.percentage)),
                      const SizedBox(width: AppSpacing.x3),
                      Expanded(child: _LabeledField(
                          label: 'Meta diária GMV',
                          controller: metaCtrl,
                          hint: 'R\$ 0,00',
                          validator: FormValidators.nonNegativeNumber)),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.x3),
                  SwitchListTile.adaptive(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Ativa'),
                    value: ativo,
                    onChanged: (value) => setState(() => ativo = value),
                  ),
                  AppTextField(
                    controller: obsCtrl,
                    hint: 'Observações',
                    keyboardType: TextInputType.multiline,
                  ),
                  const SizedBox(height: AppSpacing.x3),
                  AppTextField(
                    controller: linkContratoCtrl,
                    hint: 'Link do contrato (URL)',
                  ),
                  const SizedBox(height: AppSpacing.x3),
                  AppTextField(
                    controller: aniversarioCtrl,
                    hint: 'Aniversário (YYYY-MM-DD)',
                  ),
                  const SizedBox(height: AppSpacing.x3),
                  Row(
                    children: [
                      Expanded(
                        child: AppTextField(
                          controller: dataInicioCtrl,
                          hint: 'Data início (YYYY-MM-DD)',
                        ),
                      ),
                      const SizedBox(width: AppSpacing.x3),
                      Expanded(
                        child: AppTextField(
                          controller: dataFimCtrl,
                          hint: 'Data fim (YYYY-MM-DD)',
                        ),
                      ),
                    ],
                  ),
                    ]),
                  ),
                  ], // fim do step 0
                  const SizedBox(height: AppSpacing.x5),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      AppSecondaryButton(
                        label: step == 0 ? 'Cancelar' : 'Voltar',
                        onPressed: () {
                          if (step == 0) {
                            Navigator.pop(sheetContext);
                          } else {
                            setState(() => step = 0);
                          }
                        },
                      ),
                      const SizedBox(width: AppSpacing.x2),
                      AppPrimaryButton(
                        label: step == 0 ? 'Próximo' : 'Salvar',
                        onPressed: () async {
                          if (step == 0) {
                            final dadosValid =
                                dadosFormKey.currentState?.validate() ?? false;
                            if (!dadosValid) return;
                            setState(() => step = 1);
                            return;
                          }
                          // step == 1: validar usuário se habilitado e salvar
                          if (criarUsuario) {
                            final usuarioValid =
                                usuarioFormKey.currentState?.validate() ?? false;
                            if (!usuarioValid) return;
                          }
                          final data = <String, dynamic>{
                            'nome': nomeCtrl.text.trim(),
                            'ativo': ativo,
                            'fixo': _toDouble(fixoCtrl.text),
                            'comissao_pct': _toDouble(comissaoCtrl.text),
                            'meta_diaria_gmv': _toDouble(metaCtrl.text),
                          };
                          void put(String k, String? v) {
                            if (v != null && v.isNotEmpty) data[k] = v;
                          }
                          put('telefone', _emptyToNull(telefoneCtrl.text));
                          put('cargo', _emptyToNull(cargoCtrl.text));
                          put('email', _emptyToNull(emailCtrl.text));
                          put('cpf_cnpj', _emptyToNull(cpfCtrl.text));
                          put('cidade', _emptyToNull(cidadeCtrl.text));
                          put('observacoes', _emptyToNull(obsCtrl.text));
                          put('link_contrato', _emptyToNull(linkContratoCtrl.text));
                          put('data_aniversario', _emptyToNull(aniversarioCtrl.text));
                          put('data_inicio', _emptyToNull(dataInicioCtrl.text));
                          put('data_fim', _emptyToNull(dataFimCtrl.text));
                          try {
                            final notifier =
                                ref.read(apresentadorasProvider.notifier);
                            final id =
                                await notifier.salvar(data, id: item?.id);
                            if (criarUsuario) {
                              await notifier.criarUsuario(
                                apresentadoraId: id,
                                nome: nomeCtrl.text.trim(),
                                email: usuarioEmailCtrl.text.trim(),
                                senha: usuarioSenhaCtrl.text,
                              );
                            }
                            if (sheetContext.mounted) {
                              Navigator.pop(sheetContext);
                            }
                            if (context.mounted && criarUsuario) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text(
                                      'Apresentadora salva e acesso criado para ${usuarioEmailCtrl.text.trim()}'),
                                ),
                              );
                            }
                          } catch (error) {
                            if (!context.mounted) return;
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content:
                                    Text(ApiService.extractErrorMessage(error)),
                              ),
                            );
                          }
                        },
                      ),
                    ],
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  static String? _emptyToNull(String value) {
    final trimmed = value.trim();
    return trimmed.isEmpty ? null : trimmed;
  }

  static String _generatePassword() {
    const letters = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
    const digits = '23456789';
    const all = letters + digits;
    final rnd = DateTime.now().microsecondsSinceEpoch;
    final buf = StringBuffer();
    for (var i = 0; i < 10; i++) {
      final src = i < 6 ? all : (i % 2 == 0 ? letters : digits);
      buf.write(src[(rnd >> (i * 3)) % src.length]);
    }
    return buf.toString();
  }

  static double _toDouble(String value) =>
      double.tryParse(value.replaceAll(',', '.')) ?? 0;
}

class _ApresentadoraCard extends ConsumerWidget {
  final Apresentadora item;
  final VoidCallback onEdit;
  final VoidCallback onCalendario;

  const _ApresentadoraCard({
    required this.item,
    required this.onEdit,
    required this.onCalendario,
  });

  static final _money = NumberFormat.currency(locale: 'pt_BR', symbol: 'R\$');
  static final _moneyInt =
      NumberFormat.currency(locale: 'pt_BR', symbol: 'R\$', decimalDigits: 0);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dispoAsync = ref.watch(disponibilidadeProvider(item.id));
    final dispoStatus = dispoAsync.maybeWhen(
      data: avaliarDisponibilidadeAgora,
      orElse: () => null,
    );
    return AppCard(
      padding: const EdgeInsets.all(AppSpacing.x4),
      borderColor: context.colors.borderSubtle,
      child: Row(
        children: [
          CircleAvatar(
            backgroundColor: item.ativo
                ? AppColors.primary.withValues(alpha: 0.12)
                : context.colors.bgMuted,
            child: Text(
              item.nome.isEmpty ? '?' : item.nome[0].toUpperCase(),
              style: TextStyle(
                color:
                    item.ativo ? AppColors.primary : context.colors.textMuted,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          const SizedBox(width: AppSpacing.x4),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(item.nome,
                    style: AppTypography.bodyLarge
                        .copyWith(fontWeight: FontWeight.w700)),
                const SizedBox(height: AppSpacing.x1),
                Text(
                  [
                    if ((item.cargo ?? '').isNotEmpty) item.cargo!,
                    if ((item.cidade ?? '').isNotEmpty) item.cidade!,
                    if ((item.telefone ?? '').isNotEmpty) item.telefone!,
                  ].join(' • '),
                  style: AppTypography.caption
                      .copyWith(color: context.colors.textSecondary),
                ),
                const SizedBox(height: AppSpacing.x2),
                Text(
                  'Fixo ${_money.format(item.fixo)} • ${item.comissaoPct.toStringAsFixed(1)}% • Meta ${_money.format(item.metaDiariaGmv)}',
                  style: AppTypography.caption
                      .copyWith(color: context.colors.textSecondary),
                ),
                if (item.totalLives > 0) ...[
                  const SizedBox(height: AppSpacing.x1),
                  Text(
                    'Lives: ${item.totalLives} • Horas: ${item.totalHoras.toStringAsFixed(1)}h • Fat: ${_moneyInt.format(item.totalFaturamento)}',
                    style: AppTypography.caption
                        .copyWith(color: context.colors.textMuted),
                  ),
                ],
                if (dispoStatus != null) ...[
                  const SizedBox(height: AppSpacing.x1),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 8,
                        height: 8,
                        decoration: BoxDecoration(
                          color: dispoStatus.color,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        dispoStatus.label,
                        style: AppTypography.caption
                            .copyWith(color: dispoStatus.color),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
          AppBadge(
            label: item.ativo ? 'ATIVA' : 'INATIVA',
            type: item.ativo ? AppBadgeType.success : AppBadgeType.neutral,
          ),
          IconButton(
            tooltip: 'Calendário',
            onPressed: onCalendario,
            icon: Icon(PhosphorIcons.calendarBlank()),
            color: context.colors.textSecondary,
          ),
          IconButton(
            onPressed: onEdit,
            icon: const Icon(Icons.edit_outlined),
            color: context.colors.textSecondary,
          ),
        ],
      ),
    );
  }
}

class _StepBadge extends StatelessWidget {
  final String label;
  final bool active;
  final bool dim;
  const _StepBadge({required this.label, required this.active, this.dim = false});

  @override
  Widget build(BuildContext context) {
    final bg = active
        ? AppColors.primary
        : (dim ? context.colors.bgMuted : context.colors.bgCard);
    final fg = active
        ? Colors.white
        : (dim ? context.colors.textMuted : context.colors.textSecondary);
    return Container(
      padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.x3, vertical: 6),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(AppRadius.full),
        border: Border.all(color: active ? AppColors.primary : context.colors.borderSubtle),
      ),
      child: Text(label,
          style: AppTypography.caption.copyWith(
              color: fg, fontWeight: FontWeight.w700)),
    );
  }
}


class _LabeledField extends StatelessWidget {
  const _LabeledField({
    required this.label,
    required this.controller,
    this.hint,
    this.validator,
  });
  final String label;
  final TextEditingController controller;
  final String? hint;
  final String? Function(String?)? validator;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label,
            style: AppTypography.caption.copyWith(
                fontWeight: FontWeight.w700,
                color: context.colors.textSecondary)),
        const SizedBox(height: 4),
        AppTextField(
            controller: controller, hint: hint, validator: validator),
      ],
    );
  }
}
