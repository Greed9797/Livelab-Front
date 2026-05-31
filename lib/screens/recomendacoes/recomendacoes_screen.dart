import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../providers/recomendacoes_provider.dart';
import '../../providers/clientes_provider.dart';
import '../../routes/app_routes.dart';
import '../../services/api_service.dart';
import '../../design_system/design_system.dart';
import '../../widgets/responsive_grid.dart';
import '../../widgets/empty_state_widget.dart';
import '../../widgets/skeleton_list.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

class RecomendacoesScreen extends ConsumerWidget {
  const RecomendacoesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final recsAsync = ref.watch(recomendacoesProvider);

    return AppScreenScaffold(
      currentRoute: AppRoutes.recomendacoes,
      eyebrow: 'Programa de indicações',
      titleSerif: true,
      title: 'Recomendações',
      subtitle: 'Gerencie indicações de potenciais clientes.',
      actions: [
        AppPrimaryButton(
          label: 'ADICIONAR',
          icon: Icons.add,
          onPressed: () => _showAddDialog(context, ref),
        ),
      ],
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.x6),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // KPI strip
            Consumer(
              builder: (context, ref, _) {
                final recsAsync = ref.watch(recomendacoesProvider);
                final recs = recsAsync.valueOrNull ?? [];
                final total = recs.length;
                final convertidas = recs.where((r) => r.status == 'convertido').length;
                final pendentes = recs.where((r) => r.status != 'convertido').length;
                return ResponsiveGrid(
                  mobileColumns: 1,
                  tabletColumns: 3,
                  desktopColumns: 3,
                  spacing: AppSpacing.x3,
                  runSpacing: AppSpacing.x3,
                  children: [
                    KpiAccentCard(
                      label: 'Indicações',
                      value: '$total',
                      sub: 'total',
                      accentTop: true,
                    ),
                    KpiAccentCard(
                      label: 'Convertidas',
                      value: '$convertidas',
                      sub: 'finalizadas',
                      valueColor: AppColors.success,
                    ),
                    KpiAccentCard(
                      label: 'Pendentes',
                      value: '$pendentes',
                      sub: 'em acompanhamento',
                      valueColor: AppColors.warning,
                    ),
                  ],
                );
              },
            ),
            const SizedBox(height: AppSpacing.x5),
            const AppSectionHeader(
              title: 'Indicações',
              subtitle: 'Todas as recomendações recebidas.',
            ),
            Expanded(
              child: recsAsync.when(
                loading: () => const Padding(
                  padding: EdgeInsets.all(AppSpacing.x4),
                  child: SkeletonList(itemCount: 6, itemHeight: 64),
                ),
                error: (e, _) => Center(
                  child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(ApiService.extractErrorMessage(e)),
                        const SizedBox(height: AppSpacing.x3),
                        AppSecondaryButton(
                          onPressed: () => ref
                              .read(recomendacoesProvider.notifier)
                              .refresh(),
                          label: 'Tentar novamente',
                        ),
                      ]),
                ),
                data: (recs) => recs.isEmpty
                    ? EmptyStateWidget(
                        icon: PhosphorIcons.handshake(),
                        title: 'Nenhuma recomendação ainda',
                        message:
                            'Indique potenciais clientes e ganhe bônus quando elas converterem em contratos.',
                        actionLabel: 'Adicionar primeira',
                        onAction: () => _showAddDialog(context, ref),
                      )
                    : AppTable(
                        columns: const [
                          AppTableColumn(label: 'INDICAÇÃO', align: 'left'),
                          AppTableColumn(label: 'STATUS', align: 'center'),
                          AppTableColumn(label: 'GANHO', align: 'right'),
                        ],
                        rows: recs.map((r) => AppTableRow(
                          cells: [
                            Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Container(
                                  width: 34, height: 34,
                                  decoration: BoxDecoration(
                                    color: context.colors.primarySoftBg,
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: const Icon(Icons.handshake_outlined,
                                      color: AppColors.primary, size: 18),
                                ),
                                const SizedBox(width: AppSpacing.x3),
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Text(r.nomeIndicado,
                                      style: AppTypography.bodyMedium.copyWith(fontWeight: FontWeight.w600)),
                                    Text('Indicado por: ${r.recomendante}',
                                      style: AppTypography.caption.copyWith(color: context.colors.textMuted)),
                                  ],
                                ),
                              ],
                            ),
                            AppBadge(
                              label: r.status == 'convertido' ? 'Convertida' : 'Pendente',
                              type: r.status == 'convertido' ? AppBadgeType.success : AppBadgeType.warning,
                              showDot: false,
                            ),
                            r.status == 'convertido'
                                ? Text(
                                    '+${NumberFormat.currency(locale: 'pt_BR', symbol: 'R\$', decimalDigits: 2).format(500.0)}',
                                    style: AppTypography.bodyMedium.copyWith(
                                      fontWeight: FontWeight.w700,
                                      color: AppColors.primary,
                                    ),
                                  )
                                : Text('—', style: AppTypography.bodyMedium.copyWith(color: context.colors.textMuted)),
                          ],
                          onTap: r.status == 'pendente'
                              ? () => _converter(context, ref, r)
                              : null,
                        )).toList(),
                        hoverHighlight: true,
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showAddDialog(BuildContext context, WidgetRef ref) {
    final indicadoCtrl = TextEditingController();
    final recomendanteCtrl = TextEditingController();
    final formKey = GlobalKey<FormState>();

    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppRadius.xl)),
        title: const Text('Adicionar Recomendação'),
        content: Form(
          key: formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              AppTextField(
                controller: indicadoCtrl,
                hint: 'Nome do Potencial Cliente',
                validator: (v) {
                  if (v == null || v.trim().length < 3) {
                    return 'Nome deve ter pelo menos 3 caracteres';
                  }
                  if (!RegExp(r'^[a-zA-ZÀ-ÿ\s]+$').hasMatch(v.trim())) {
                    return 'Nome deve conter apenas letras';
                  }
                  return null;
                },
              ),
              const SizedBox(height: AppSpacing.x3),
              AppTextField(
                controller: recomendanteCtrl,
                hint: 'Quem está recomendando',
                validator: (v) {
                  if (v == null || v.trim().length < 3) {
                    return 'Nome deve ter pelo menos 3 caracteres';
                  }
                  return null;
                },
              ),
            ],
          ),
        ),
        actions: [
          AppSecondaryButton(
            label: 'Cancelar',
            onPressed: () => Navigator.pop(context),
          ),
          AppPrimaryButton(
            onPressed: () async {
              if (!formKey.currentState!.validate()) return;
              Navigator.pop(context);
              try {
                await ref.read(recomendacoesProvider.notifier).criar({
                  'nome_indicado': indicadoCtrl.text.trim(),
                  'recomendante': recomendanteCtrl.text.trim(),
                });
              } catch (e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                        content: Text(ApiService.extractErrorMessage(e))),
                  );
                }
              }
            },
            label: 'SALVAR',
          ),
        ],
      ),
    );
  }

  Future<void> _converter(
      BuildContext context, WidgetRef ref, Recomendacao r) async {
    final result = await showDialog<Map<String, dynamic>>(
      context: context,
      barrierDismissible: false,
      builder: (_) => _NegociarDialog(recomendacao: r),
    );
    if (result == null || !context.mounted) return;

    try {
      final resp = await ref.read(recomendacoesProvider.notifier).converter(
        r.id,
        dados: result,
      );
      if (!context.mounted) return;

      final altoRisco = resp['alto_risco'] == true;
      final score = resp['score'] as int? ?? 0;
      final clienteId = resp['cliente_id'] as String?;

      ref.invalidate(clientesProvider);

      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(altoRisco
            ? 'Cliente convertido (Score: $score — alto risco). Iniciando contrato...'
            : 'Cliente convertido com sucesso! (Score: $score). Iniciando contrato...'),
        backgroundColor: altoRisco ? AppColors.danger : AppColors.success,
      ));

      Navigator.pushNamed(
        context,
        AppRoutes.contrato,
        arguments: {'clienteId': clienteId},
      );
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(ApiService.extractErrorMessage(e))),
        );
      }
    }
  }
}

// _RecomendacaoTile removido: substituído pelo AppCardListItem inline
// na lista (recomendacoes_screen.dart linhas 110-160).

// ─── Dialog de negociação com mini-formulário ───────────────────────────────

class _NegociarDialog extends StatefulWidget {
  final Recomendacao recomendacao;
  const _NegociarDialog({required this.recomendacao});

  @override
  State<_NegociarDialog> createState() => _NegociarDialogState();
}

class _NegociarDialogState extends State<_NegociarDialog> {
  final _celularCtrl = TextEditingController();
  final _cnpjCtrl = TextEditingController();
  final _cepCtrl = TextEditingController();
  final _cidadeCtrl = TextEditingController();
  final _estadoCtrl = TextEditingController();
  final _fatCtrl = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  bool _hasCnpj = false;
  bool _highFat = false;

  String get _riscoLabel {
    int score = 0;
    if (_highFat) score += 50;
    if (_hasCnpj) score += 20;
    if (score >= 60) return 'BAIXO RISCO';
    if (score >= 20) return 'RISCO MODERADO';
    return 'ALTO RISCO';
  }

  Color _riscoColor() {
    int score = 0;
    if (_highFat) score += 50;
    if (_hasCnpj) score += 20;
    if (score >= 60) return AppColors.success;
    if (score >= 20) return AppColors.warning;
    return AppColors.danger;
  }

  void _updateRisco() {
    final fat = double.tryParse(_fatCtrl.text.replaceAll(',', '.')) ?? 0;
    setState(() {
      _hasCnpj = _cnpjCtrl.text.replaceAll(RegExp(r'\D'), '').length >= 14;
      _highFat = fat > 50000;
    });
  }

  @override
  void dispose() {
    _celularCtrl.dispose();
    _cnpjCtrl.dispose();
    _cepCtrl.dispose();
    _cidadeCtrl.dispose();
    _estadoCtrl.dispose();
    _fatCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final riscoColor = _riscoColor();
    return Dialog(
      shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.xl)),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 480),
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppSpacing.x6),
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.handshake_outlined,
                        color: AppColors.primary),
                    const SizedBox(width: AppSpacing.x3),
                    Expanded(
                      child: Text('Negociar com ${widget.recomendacao.nomeIndicado}',
                          style: AppTypography.h3),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.x4),

                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(AppSpacing.x3),
                  decoration: BoxDecoration(
                    color: riscoColor.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(AppRadius.md),
                    border: Border.all(color: riscoColor.withValues(alpha: 0.4)),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        _riscoLabel == 'ALTO RISCO'
                            ? Icons.warning_amber_rounded
                            : Icons.shield_outlined,
                        color: riscoColor,
                        size: 20,
                      ),
                      const SizedBox(width: AppSpacing.x2),
                      Text(
                        _riscoLabel,
                        style: AppTypography.caption.copyWith(
                          color: riscoColor,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const Spacer(),
                      Text(
                        'Preencha para melhorar o score',
                        style: AppTypography.caption
                            .copyWith(color: context.colors.textMuted),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: AppSpacing.x4),

                AppTextField(
                  controller: _celularCtrl,
                  keyboardType: TextInputType.phone,
                  hint: 'Celular (WhatsApp) *',
                  validator: (v) =>
                      (v == null || v.trim().isEmpty) ? 'Obrigatório' : null,
                ),
                const SizedBox(height: AppSpacing.x3),
                AppTextField(
                  controller: _cnpjCtrl,
                  keyboardType: TextInputType.number,
                  onChanged: (_) => _updateRisco(),
                  hint: 'CNPJ',
                  suffixIcon: _hasCnpj
                      ? const Icon(Icons.check_circle,
                          color: AppColors.success, size: 18)
                      : null,
                ),
                const SizedBox(height: AppSpacing.x3),
                AppTextField(
                  controller: _fatCtrl,
                  keyboardType: TextInputType.number,
                  onChanged: (_) => _updateRisco(),
                  hint: 'Faturamento Anual R\$',
                  suffixIcon: _highFat
                      ? const Icon(Icons.check_circle,
                          color: AppColors.success, size: 18)
                      : null,
                ),
                const SizedBox(height: AppSpacing.x3),
                Row(
                  children: [
                    Expanded(
                      flex: 2,
                      child: AppTextField(
                        controller: _cepCtrl,
                        keyboardType: TextInputType.number,
                        hint: 'CEP',
                      ),
                    ),
                    const SizedBox(width: AppSpacing.x2),
                    Expanded(
                      flex: 2,
                      child: AppTextField(
                        controller: _cidadeCtrl,
                        hint: 'Cidade',
                      ),
                    ),
                    const SizedBox(width: AppSpacing.x2),
                    Expanded(
                      child: AppTextField(
                        controller: _estadoCtrl,
                        hint: 'UF',
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.x6),

                Row(
                  children: [
                    Expanded(
                      child: AppSecondaryButton(
                        label: 'Cancelar',
                        onPressed: () => Navigator.pop(context),
                        fullWidth: true,
                      ),
                    ),
                    const SizedBox(width: AppSpacing.x3),
                    Expanded(
                      child: AppPrimaryButton(
                        onPressed: () {
                          if (!_formKey.currentState!.validate()) return;
                          Navigator.pop(context, {
                            'celular': _celularCtrl.text.trim(),
                            if (_cnpjCtrl.text.trim().isNotEmpty)
                              'cnpj': _cnpjCtrl.text.trim(),
                            if (_fatCtrl.text.trim().isNotEmpty)
                              'fat_anual': double.tryParse(
                                      _fatCtrl.text.replaceAll(',', '.')) ??
                                  0,
                            if (_cepCtrl.text.trim().isNotEmpty)
                              'cep': _cepCtrl.text.trim(),
                            if (_cidadeCtrl.text.trim().isNotEmpty)
                              'cidade': _cidadeCtrl.text.trim(),
                            if (_estadoCtrl.text.trim().isNotEmpty)
                              'estado': _estadoCtrl.text.trim(),
                          });
                        },
                        icon: Icons.send_rounded,
                        label: 'Converter para Lead',
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
