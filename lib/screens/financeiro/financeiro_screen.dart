import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';

import '../../design_system/app_components.dart';
import '../../widgets/skeleton_list.dart';
import '../../providers/financeiro_provider.dart';
import '../../routes/app_routes.dart';
import '../../services/api_service.dart';
import '../../livelab/core/responsive.dart';
import '../../livelab/theme/livelab_theme.dart';
import '../../livelab/theme/tokens.dart';
import '../../livelab/widgets/livelab_scaffold.dart';
import '../boletos/boletos_screen.dart';
import '../../utils/form_validators.dart';

class FinanceiroScreen extends ConsumerStatefulWidget {
  const FinanceiroScreen({super.key});

  @override
  ConsumerState<FinanceiroScreen> createState() => _FinanceiroScreenState();
}

class _FinanceiroScreenState extends ConsumerState<FinanceiroScreen> {
  int _tab = 0;

  void _refresh() {
    ref.invalidate(financeiroProvider);
    ref.invalidate(custosProvider);
    ref.invalidate(fluxoCaixaProvider);
    ref.invalidate(faturamentoPorClienteProvider);
  }

  @override
  Widget build(BuildContext context) {
    return LivelabScaffold(
      currentRoute: AppRoutes.financeiro,
      onRefresh: _refresh,
      child: _content(),
    );
  }

  Widget _content() {
    final t = context.llTokens;
    final r = LlResponsive.of(context);
    final pad = r.isMobile ? 16.0 : 28.0;

    return SingleChildScrollView(
      padding: EdgeInsets.fromLTRB(pad, 16, pad, 28),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _pageHeader(t),
          const SizedBox(height: 18),
          _periodSwitcher(t),
          const SizedBox(height: 14),
          _tabStrip(t),
          const SizedBox(height: 18),
          if (_tab == 0) _OperacionalTab(t: t),
          if (_tab == 1) _PorClienteTab(t: t),
          if (_tab == 2) _RecebiveisTab(t: t),
          if (_tab == 3) const BoletosTab(),
        ],
      ),
    );
  }

  Widget _pageHeader(LlTokens t) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '— SAÚDE FINANCEIRA',
                style: TextStyle(
                  color: t.primary,
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 1.2,
                ),
              ),
              const SizedBox(height: 4),
              Text.rich(
                TextSpan(
                  children: [
                    TextSpan(
                      text: 'Painel ',
                      style: TextStyle(
                        color: t.textPrimary,
                        fontSize: 32,
                        fontWeight: FontWeight.w700,
                        letterSpacing: -0.9,
                      ),
                    ),
                    TextSpan(
                      text: 'Financeiro',
                      style: GoogleFonts.instrumentSerif(
                        color: t.primary,
                        fontStyle: FontStyle.italic,
                        fontSize: 36,
                        fontWeight: FontWeight.w400,
                        letterSpacing: -1,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'Faturamento, custos, fluxo de caixa e boletos da unidade.',
                style: TextStyle(color: t.textMuted, fontSize: 13),
              ),
            ],
          ),
        ),
        Material(
          color: t.bgElev1,
          borderRadius: BorderRadius.circular(12),
          child: InkWell(
            borderRadius: BorderRadius.circular(12),
            onTap: _refresh,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                border: Border.all(color: t.border),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.refresh, size: 14, color: t.textSecondary),
                  const SizedBox(width: 6),
                  Text(
                    'Atualizar',
                    style: TextStyle(
                      color: t.textSecondary,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _periodSwitcher(LlTokens t) {
    final selected = ref.watch(financeiroPeriodoProvider);
    const opts = [
      ('mes', 'Mês'),
      ('trimestre', 'Trimestre'),
      ('ano', '12 meses'),
    ];
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: opts.map((o) {
        final active = selected == o.$1;
        return Material(
          color: active ? t.primarySoft : t.bgElev1,
          borderRadius: BorderRadius.circular(10),
          child: InkWell(
            borderRadius: BorderRadius.circular(10),
            onTap: () =>
                ref.read(financeiroPeriodoProvider.notifier).state = o.$1,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
              decoration: BoxDecoration(
                border: Border.all(color: active ? t.primary : t.border),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                o.$2,
                style: TextStyle(
                  color: active ? t.primary : t.textSecondary,
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _tabStrip(LlTokens t) {
    const tabs = [
      (Icons.payments_outlined, 'Operacional'),
      (Icons.groups_outlined, 'Por Cliente'),
      (Icons.account_balance_wallet_outlined, 'Recebíveis'),
      (Icons.receipt_long_outlined, 'Boletos'),
    ];
    return LayoutBuilder(
      builder: (c, box) {
        final isCompact = box.maxWidth < 640;
        return Wrap(
          spacing: 8,
          runSpacing: 8,
          children: List.generate(tabs.length, (i) {
            final active = _tab == i;
            return Material(
              color: active ? t.primarySoft : t.bgElev1,
              borderRadius: BorderRadius.circular(12),
              child: InkWell(
                borderRadius: BorderRadius.circular(12),
                onTap: () => setState(() => _tab = i),
                child: Container(
                  padding: EdgeInsets.symmetric(
                    horizontal: isCompact ? 12 : 16,
                    vertical: 10,
                  ),
                  decoration: BoxDecoration(
                    border: Border.all(color: active ? t.primary : t.border),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        tabs[i].$1,
                        size: 16,
                        color: active ? t.primary : t.textSecondary,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        tabs[i].$2,
                        style: TextStyle(
                          color: active ? t.primary : t.textSecondary,
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          }),
        );
      },
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers compartilhados
// ─────────────────────────────────────────────────────────────────────────────

final _fmtBrlCompact =
    NumberFormat.compactSimpleCurrency(locale: 'pt_BR', decimalDigits: 1);
final _fmtBrl =
    NumberFormat.currency(locale: 'pt_BR', symbol: 'R\$', decimalDigits: 2);

String _fmtCompetencia(String iso) {
  try {
    final d = DateTime.parse(iso);
    return DateFormat('dd/MM/yyyy', 'pt_BR').format(d);
  } catch (_) {
    return iso.split('T').first;
  }
}

Widget _cardShell(
  LlTokens t, {
  required Widget child,
  EdgeInsets padding = const EdgeInsets.all(18),
}) {
  return Container(
    padding: padding,
    decoration: BoxDecoration(
      color: t.bgElev1,
      borderRadius: BorderRadius.circular(16),
      border: Border.all(color: t.border),
      boxShadow: t.shadowCard,
    ),
    child: child,
  );
}

Widget _finKpiCard(
  LlTokens t, {
  required String label,
  required double value,
  required String sub,
  required Color color,
}) {
  return _cardShell(
    t,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                label,
                style: TextStyle(
                  color: t.textMuted,
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 1.0,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            Container(
              width: 9,
              height: 9,
              decoration: BoxDecoration(color: color, shape: BoxShape.circle),
            ),
          ],
        ),
        const SizedBox(height: 12),
        RichText(
          text: TextSpan(
            children: [
              TextSpan(
                text: 'R\$ ',
                style: TextStyle(
                  color: color.withValues(alpha: 0.7),
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  fontFamily: GoogleFonts.inter().fontFamily,
                ),
              ),
              TextSpan(
                text: value >= 1000
                    ? _fmtBrlCompact.format(value).replaceAll('R\$', '').trim()
                    : NumberFormat('#,##0.00', 'pt_BR').format(value),
                style: TextStyle(
                  color: color,
                  fontSize: 30,
                  fontWeight: FontWeight.w700,
                  letterSpacing: -0.8,
                  fontFeatures: const [FontFeature.tabularFigures()],
                  fontFamily: GoogleFonts.inter().fontFamily,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 6),
        Text(
          sub,
          style: TextStyle(color: t.textMuted, fontSize: 11),
        ),
      ],
    ),
  );
}

Widget _eyebrow(LlTokens t, String text) {
  return Row(
    children: [
      Container(width: 18, height: 1, color: t.primary),
      const SizedBox(width: 8),
      Text(
        text,
        style: TextStyle(
          color: t.textMuted,
          fontSize: 11,
          fontWeight: FontWeight.w700,
          letterSpacing: 1.4,
        ),
      ),
    ],
  );
}

Widget _blockHeader(LlTokens t, String title, {Widget? trailing}) {
  return Padding(
    padding: const EdgeInsets.only(bottom: 12),
    child: Row(
      children: [
        Expanded(
          child: Text(
            title,
            style: TextStyle(
              color: t.textPrimary,
              fontSize: 14,
              fontWeight: FontWeight.w700,
              letterSpacing: -0.2,
            ),
          ),
        ),
        if (trailing != null) trailing,
      ],
    ),
  );
}

Widget _kpiGrid(LlTokens t, List<Widget> cards) {
  return LayoutBuilder(
    builder: (c, box) {
      final cols = box.maxWidth < 640 ? 1 : 3;
      return GridView.builder(
        primary: false,
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: cols,
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
          mainAxisExtent: 142,
        ),
        itemCount: cards.length,
        itemBuilder: (_, i) => cards[i],
      );
    },
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Aba: Operacional
// ─────────────────────────────────────────────────────────────────────────────

class _OperacionalTab extends ConsumerWidget {
  final LlTokens t;
  const _OperacionalTab({required this.t});

  static const _categorias = [
    _Categoria('Aluguel', Icons.home_outlined, 'aluguel'),
    _Categoria('Salários', Icons.people_outline, 'salario'),
    _Categoria('Energia', Icons.bolt_outlined, 'energia'),
    _Categoria('Internet', Icons.wifi, 'internet'),
    _Categoria('Outros', Icons.more_horiz, 'outros'),
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final resumoAsync = ref.watch(financeiroProvider);
    final fluxoAsync = ref.watch(fluxoCaixaProvider);
    final custosAsync = ref.watch(custosProvider);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // KPI strip
        resumoAsync.when(
          loading: () => const SkeletonList(itemCount: 3, itemHeight: 140),
          error: (e, _) => _errorBox(t, e),
          data: (r) => _kpiGrid(t, [
            _finKpiCard(
              t,
              label: 'RECEITA FRANQUEADORA',
              value: r.fatBruto,
              sub: 'fixo + comissão',
              color: t.info,
            ),
            _finKpiCard(
              t,
              label: 'RECEITA LÍQUIDA',
              value: r.fatLiquido,
              sub: 'após custos operacionais',
              color: t.success,
            ),
            _finKpiCard(
              t,
              label: 'CUSTOS OPERACIONAIS',
              value: r.totalCustos,
              sub: 'total no período',
              color: t.danger,
            ),
          ]),
        ),
        const SizedBox(height: 22),
        // Fluxo de caixa
        _cardShell(
          t,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _blockHeader(t, 'Fluxo de Caixa — período atual'),
              fluxoAsync.when(
                loading: () => const SkeletonList(itemCount: 1, itemHeight: 90),
                error: (e, _) => _errorBox(t, e),
                data: (fluxo) => _FluxoCaixaPanel(
                  t: t,
                  entradas: fluxo.totalEntradas,
                  saidas: fluxo.totalSaidas,
                  saldo: fluxo.saldo,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 18),
        // Custos do mês
        _cardShell(
          t,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _blockHeader(
                t,
                'Custos do Mês',
                trailing: _AddButton(
                  t: t,
                  label: 'Adicionar',
                  onTap: () =>
                      _showAdicionarCusto(context, ref, t, categoria: null),
                ),
              ),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: _categorias.map((cat) {
                  return Material(
                    color: t.bgElev2,
                    borderRadius: BorderRadius.circular(999),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(999),
                      onTap: () => _showAdicionarCusto(context, ref, t,
                          categoria: cat),
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 14, vertical: 8),
                        decoration: BoxDecoration(
                          border: Border.all(color: t.border),
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(cat.icon,
                                size: 14, color: t.textSecondary),
                            const SizedBox(width: 6),
                            Text(
                              cat.label,
                              style: TextStyle(
                                color: t.textPrimary,
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 16),
              custosAsync.when(
                loading: () => const Padding(
                  padding: EdgeInsets.symmetric(vertical: 18),
                  child: Center(child: CircularProgressIndicator()),
                ),
                error: (e, _) => _errorBox(t, e),
                data: (custos) {
                  if (custos.isEmpty) {
                    return _EmptyCustos(t: t);
                  }
                  return Column(
                    children: custos
                        .map((c) => _CustoTile(t: t, custo: c, ref: ref))
                        .toList(),
                  );
                },
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _FluxoCaixaPanel extends StatelessWidget {
  final LlTokens t;
  final double entradas;
  final double saidas;
  final double saldo;
  const _FluxoCaixaPanel({
    required this.t,
    required this.entradas,
    required this.saidas,
    required this.saldo,
  });

  @override
  Widget build(BuildContext context) {
    final total = entradas + saidas;
    final entradasPct = total > 0 ? entradas / total : 1.0;
    final saidasPct = total > 0 ? saidas / total : 0.0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('GMV DAS LIVES',
                      style: TextStyle(
                        color: t.textMuted,
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 1.2,
                      )),
                  const SizedBox(height: 4),
                  Text(
                    _fmtBrl.format(entradas),
                    style: TextStyle(
                      color: t.success,
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      fontFeatures: const [FontFeature.tabularFigures()],
                    ),
                  ),
                ],
              ),
            ),
            Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: saldo >= 0 ? t.successSoft : t.dangerSoft,
                borderRadius: BorderRadius.circular(999),
              ),
              child: Text(
                '${saldo >= 0 ? '+' : ''}${_fmtBrl.format(saldo)}',
                style: TextStyle(
                  color: saldo >= 0 ? t.success : t.danger,
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  fontFeatures: const [FontFeature.tabularFigures()],
                ),
              ),
            ),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text('CUSTOS',
                      style: TextStyle(
                        color: t.textMuted,
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 1.2,
                      )),
                  const SizedBox(height: 4),
                  Text(
                    _fmtBrl.format(saidas),
                    style: TextStyle(
                      color: t.danger,
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      fontFeatures: const [FontFeature.tabularFigures()],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 14),
        ClipRRect(
          borderRadius: BorderRadius.circular(999),
          child: SizedBox(
            height: 8,
            child: Row(
              children: [
                Expanded(
                  flex: (entradasPct * 1000).round().clamp(0, 1000),
                  child: Container(color: t.success),
                ),
                Expanded(
                  flex: (saidasPct * 1000).round().clamp(0, 1000),
                  child: Container(color: t.danger),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _AddButton extends StatelessWidget {
  final LlTokens t;
  final String label;
  final VoidCallback onTap;
  const _AddButton({required this.t, required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: t.primary,
      borderRadius: BorderRadius.circular(10),
      child: InkWell(
        borderRadius: BorderRadius.circular(10),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.add, size: 14, color: Colors.white),
              const SizedBox(width: 6),
              Text(
                label,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _EmptyCustos extends StatelessWidget {
  final LlTokens t;
  const _EmptyCustos({required this.t});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 32),
      child: Column(
        children: [
          Icon(Icons.account_balance_wallet_outlined,
              size: 32, color: t.textMuted),
          const SizedBox(height: 10),
          Text(
            'Nenhum custo cadastrado este mês.',
            style: TextStyle(
              color: t.textPrimary,
              fontSize: 13,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Adicione um custo para acompanhar a saúde operacional.',
            style: TextStyle(color: t.textMuted, fontSize: 12),
          ),
        ],
      ),
    );
  }
}

class _CustoTile extends StatelessWidget {
  final LlTokens t;
  final dynamic custo; // CustoCadastrado
  final WidgetRef ref;
  const _CustoTile({required this.t, required this.custo, required this.ref});

  IconData _iconFor(String tipo) {
    switch (tipo) {
      case 'aluguel':
        return Icons.home_outlined;
      case 'salario':
        return Icons.people_outline;
      case 'energia':
        return Icons.bolt_outlined;
      case 'internet':
        return Icons.wifi;
      default:
        return Icons.more_horiz;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: t.bgElev2,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: t.border),
      ),
      child: Row(
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: t.dangerSoft,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(_iconFor(custo.tipo), size: 16, color: t.danger),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  custo.descricao,
                  style: TextStyle(
                    color: t.textPrimary,
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                Text(
                  _fmtCompetencia(custo.competencia),
                  style: TextStyle(color: t.textMuted, fontSize: 11),
                ),
              ],
            ),
          ),
          Text(
            _fmtBrl.format(custo.valor),
            style: TextStyle(
              color: t.danger,
              fontSize: 14,
              fontWeight: FontWeight.w700,
              fontFeatures: const [FontFeature.tabularFigures()],
            ),
          ),
          IconButton(
            tooltip: 'Remover',
            icon: Icon(Icons.delete_outline, size: 18, color: t.textMuted),
            onPressed: () async {
              final confirm = await showDialog<bool>(
                context: context,
                builder: (ctx) => AlertDialog(
                  backgroundColor: t.bgElev1,
                  title: Text('Excluir custo?',
                      style: TextStyle(color: t.textPrimary)),
                  content: Text(
                    'Excluir "${custo.descricao}" no valor de R\$ ${custo.valor.toStringAsFixed(2)}? Esta ação não pode ser desfeita.',
                    style: TextStyle(color: t.textSecondary),
                  ),
                  actions: [
                    AppSecondaryButton(
                      label: 'Cancelar',
                      onPressed: () => Navigator.of(ctx).pop(false),
                    ),
                    AppDangerButton(
                      label: 'Excluir',
                      onPressed: () => Navigator.of(ctx).pop(true),
                    ),
                  ],
                ),
              );
              if (confirm != true) return;
              try {
                await ref.read(custosProvider.notifier).deletar(custo.id);
                ref.invalidate(financeiroProvider);
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                      backgroundColor: t.success,
                      content: const Text('Custo removido')));
                }
              } catch (e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                      backgroundColor: t.danger,
                      content: Text(ApiService.extractErrorMessage(e))));
                }
              }
            },
          ),
        ],
      ),
    );
  }
}

class _Categoria {
  final String label;
  final IconData icon;
  final String valor;
  const _Categoria(this.label, this.icon, this.valor);
}

void _showAdicionarCusto(
  BuildContext context,
  WidgetRef ref,
  LlTokens t, {
  _Categoria? categoria,
}) {
  final formKey = GlobalKey<FormState>();
  final descCtrl = TextEditingController(text: categoria?.label);
  final valorCtrl = TextEditingController();
  String tipo = categoria?.valor ?? 'outros';

  showDialog(
    context: context,
    builder: (ctx) => StatefulBuilder(
      builder: (ctx, setState) => AlertDialog(
        backgroundColor: t.bgElev1,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text('Adicionar custo',
            style: TextStyle(color: t.textPrimary, fontWeight: FontWeight.w700)),
        content: SizedBox(
          width: 360,
          child: Form(
            key: formKey,
            autovalidateMode: AutovalidateMode.onUserInteraction,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextFormField(
                  controller: descCtrl,
                  style: TextStyle(color: t.textPrimary),
                  decoration: InputDecoration(
                    labelText: 'Descrição *',
                    labelStyle: TextStyle(color: t.textMuted),
                    border: const OutlineInputBorder(),
                  ),
                  validator: FormValidators.required(),
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: valorCtrl,
                  keyboardType:
                      const TextInputType.numberWithOptions(decimal: true),
                  style: TextStyle(color: t.textPrimary),
                  decoration: InputDecoration(
                    labelText: 'R\$ Valor *',
                    labelStyle: TextStyle(color: t.textMuted),
                    border: const OutlineInputBorder(),
                  ),
                  validator: FormValidators.composite([
                    FormValidators.required(),
                    FormValidators.positiveNumber,
                  ]),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  initialValue: tipo,
                  dropdownColor: t.bgElev1,
                  style: TextStyle(color: t.textPrimary),
                  decoration: InputDecoration(
                    labelText: 'Categoria',
                    labelStyle: TextStyle(color: t.textMuted),
                    border: const OutlineInputBorder(),
                  ),
                  items: const [
                    DropdownMenuItem(value: 'aluguel', child: Text('Aluguel')),
                    DropdownMenuItem(value: 'salario', child: Text('Salários')),
                    DropdownMenuItem(value: 'energia', child: Text('Energia')),
                    DropdownMenuItem(value: 'internet', child: Text('Internet')),
                    DropdownMenuItem(value: 'outros', child: Text('Outros')),
                  ],
                  onChanged: (v) => setState(() => tipo = v ?? 'outros'),
                ),
              ],
            ),
          ),
        ),
        actions: [
          AppSecondaryButton(
            label: 'Cancelar',
            onPressed: () => Navigator.pop(ctx),
          ),
          AppPrimaryButton(
            label: 'Salvar',
            onPressed: () async {
              if (!(formKey.currentState?.validate() ?? false)) return;
              final valorStr = valorCtrl.text.replaceAll(',', '.');
              final valor = double.tryParse(valorStr);
              if (valor == null || valor <= 0) return;
              Navigator.pop(ctx);
              try {
                await ref.read(custosProvider.notifier).adicionar({
                  'descricao': descCtrl.text,
                  'valor': valor,
                  'tipo': tipo,
                  'competencia':
                      '${DateTime.now().year}-${DateTime.now().month.toString().padLeft(2, '0')}',
                });
                ref.invalidate(financeiroProvider);
              } catch (e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                      content: Text(ApiService.extractErrorMessage(e))));
                }
              }
            },
          ),
        ],
      ),
    ),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Aba: Por Cliente
// ─────────────────────────────────────────────────────────────────────────────

class _PorClienteTab extends ConsumerWidget {
  final LlTokens t;
  const _PorClienteTab({required this.t});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncRows = ref.watch(faturamentoPorClienteProvider);

    return _cardShell(
      t,
      padding: EdgeInsets.zero,
      child: asyncRows.when(
        loading: () => const Padding(
          padding: EdgeInsets.symmetric(vertical: 32),
          child: Center(child: CircularProgressIndicator()),
        ),
        error: (e, _) => Padding(
          padding: const EdgeInsets.all(18),
          child: _errorBox(t, e),
        ),
        data: (clientes) {
          if (clientes.isEmpty) {
            return Padding(
              padding: const EdgeInsets.symmetric(vertical: 32),
              child: Center(
                child: Text(
                  'Nenhum faturamento registrado neste período.',
                  style: TextStyle(color: t.textMuted, fontSize: 13),
                ),
              ),
            );
          }
          final total = clientes.fold(0.0, (s, c) => s + c.total);
          final maxV = clientes.fold(0.0, (m, c) => c.total > m ? c.total : m);
          final maxShare = total > 0 ? (maxV / total * 100) : 1.0;

          return Column(
            children: [
              _PorClienteHeader(t: t),
              ...List.generate(clientes.length, (i) {
                final c = clientes[i];
                final share = total > 0 ? (c.total / total * 100) : 0.0;
                return _PorClienteRow(
                  t: t,
                  letter: c.nome.isNotEmpty ? c.nome[0].toUpperCase() : '?',
                  name: c.nome,
                  nicho: (c.nicho?.isNotEmpty ?? false) ? c.nicho! : '—',
                  fat: c.total,
                  share: share,
                  maxShare: maxShare,
                  isLast: i == clientes.length - 1,
                );
              }),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
                decoration: BoxDecoration(
                  color: t.bgElev2,
                  borderRadius: const BorderRadius.vertical(
                      bottom: Radius.circular(16)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('TOTAL DO PERÍODO',
                        style: TextStyle(
                          color: t.textMuted,
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 1.2,
                        )),
                    Text(
                      _fmtBrl.format(total),
                      style: TextStyle(
                        color: t.textPrimary,
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        fontFeatures: const [FontFeature.tabularFigures()],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _PorClienteHeader extends StatelessWidget {
  final LlTokens t;
  const _PorClienteHeader({required this.t});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
      decoration: BoxDecoration(
        border: Border(bottom: BorderSide(color: t.border)),
      ),
      child: Row(
        children: [
          Expanded(flex: 4, child: _hdr(t, 'CLIENTE')),
          Expanded(flex: 2, child: _hdr(t, 'NICHO')),
          Expanded(flex: 2, child: _hdr(t, 'FATURAMENTO', right: true)),
          Expanded(flex: 3, child: _hdr(t, 'PARTICIPAÇÃO', right: true)),
        ],
      ),
    );
  }

  Widget _hdr(LlTokens t, String text, {bool right = false}) {
    return Text(
      text,
      textAlign: right ? TextAlign.right : TextAlign.left,
      style: TextStyle(
        color: t.textMuted,
        fontSize: 10,
        fontWeight: FontWeight.w700,
        letterSpacing: 1.2,
      ),
    );
  }
}

class _PorClienteRow extends StatelessWidget {
  final LlTokens t;
  final String letter;
  final String name;
  final String nicho;
  final double fat;
  final double share;
  final double maxShare;
  final bool isLast;
  const _PorClienteRow({
    required this.t,
    required this.letter,
    required this.name,
    required this.nicho,
    required this.fat,
    required this.share,
    required this.maxShare,
    required this.isLast,
  });

  @override
  Widget build(BuildContext context) {
    final pctOfMax = maxShare > 0 ? (share / maxShare).clamp(0.0, 1.0) : 0.0;
    final isZero = share == 0;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
      decoration: BoxDecoration(
        border: isLast
            ? null
            : Border(bottom: BorderSide(color: t.hairline)),
      ),
      child: Row(
        children: [
          Expanded(
            flex: 4,
            child: Row(
              children: [
                Container(
                  width: 32,
                  height: 32,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: t.primarySoft,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    letter,
                    style: TextStyle(
                      color: t.primary,
                      fontWeight: FontWeight.w700,
                      fontSize: 13,
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    name,
                    style: TextStyle(
                      color: t.textPrimary,
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            flex: 2,
            child: Text(
              nicho,
              style: TextStyle(color: t.textMuted, fontSize: 12),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          Expanded(
            flex: 2,
            child: Text(
              _fmtBrl.format(fat),
              textAlign: TextAlign.right,
              style: TextStyle(
                color: t.textPrimary,
                fontSize: 13,
                fontWeight: FontWeight.w700,
                fontFeatures: const [FontFeature.tabularFigures()],
              ),
            ),
          ),
          Expanded(
            flex: 3,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                Text(
                  '${share.toStringAsFixed(1)}%',
                  style: TextStyle(
                    color: isZero ? t.textMuted : t.primary,
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(width: 8),
                SizedBox(
                  width: 80,
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(999),
                    child: Container(
                      height: 6,
                      color: t.bgElev2,
                      child: FractionallySizedBox(
                        alignment: Alignment.centerLeft,
                        widthFactor: pctOfMax,
                        child: Container(
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              colors: [
                                t.primary,
                                t.primary.withValues(alpha: 0.6),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Aba: Recebíveis
// ─────────────────────────────────────────────────────────────────────────────

class _RecebiveisTab extends ConsumerWidget {
  final LlTokens t;
  const _RecebiveisTab({required this.t});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final resumoAsync = ref.watch(financeiroProvider);

    return resumoAsync.when(
      loading: () => const SizedBox(
        height: 240,
        child: Center(child: CircularProgressIndicator()),
      ),
      error: (e, _) => _errorBox(t, e),
      data: (r) {
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _eyebrow(t, 'RECEBÍVEIS DO FRANQUEADO'),
            const SizedBox(height: 14),
            _kpiGrid(t, [
              _finKpiCard(
                t,
                label: 'BRUTO',
                value: r.fatBruto,
                sub: 'faturamento total',
                color: t.info,
              ),
              _finKpiCard(
                t,
                label: 'LÍQUIDO',
                value: r.fatLiquido,
                sub: 'após custos',
                color: t.success,
              ),
              _finKpiCard(
                t,
                label: 'CUSTOS',
                value: r.totalCustos,
                sub: 'operacionais',
                color: t.danger,
              ),
            ]),
            const SizedBox(height: 22),
            _cardShell(
              t,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  _blockHeader(t, 'Bruto × Líquido × Custos'),
                  Text(
                    'Comparativo do período selecionado.',
                    style: TextStyle(color: t.textMuted, fontSize: 11),
                  ),
                  const SizedBox(height: 18),
                  _CompareBars(t: t, resumo: r),
                  const SizedBox(height: 14),
                  Wrap(
                    spacing: 18,
                    runSpacing: 8,
                    children: [
                      _legend(t, t.info, 'Fat. Bruto'),
                      _legend(t, t.success, 'Fat. Líquido'),
                      _legend(t, t.danger, 'Custos'),
                    ],
                  ),
                ],
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _legend(LlTokens t, Color c, String label) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(color: c, shape: BoxShape.circle),
        ),
        const SizedBox(width: 6),
        Text(label,
            style: TextStyle(
              color: t.textSecondary,
              fontSize: 12,
              fontWeight: FontWeight.w600,
            )),
      ],
    );
  }
}

class _CompareBars extends StatelessWidget {
  final LlTokens t;
  final dynamic resumo; // FinanceiroResumo
  const _CompareBars({required this.t, required this.resumo});

  @override
  Widget build(BuildContext context) {
    final maxV = [resumo.fatBruto, resumo.fatLiquido, resumo.totalCustos]
        .fold<double>(1, (a, b) => b > a ? b : a);
    final bars = [
      ('Bruto', resumo.fatBruto as double, t.info),
      ('Líquido', resumo.fatLiquido as double, t.success),
      ('Custos', resumo.totalCustos as double, t.danger),
    ];

    return Column(
      children: bars.map((b) {
        final w = b.$2 == 0 ? 0.0 : (b.$2 / maxV).clamp(0.0, 1.0);
        return Padding(
          padding: const EdgeInsets.symmetric(vertical: 6),
          child: Row(
            children: [
              SizedBox(
                width: 70,
                child: Text(
                  b.$1,
                  style: TextStyle(
                    color: t.textSecondary,
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              Expanded(
                child: Stack(
                  children: [
                    Container(
                      height: 28,
                      decoration: BoxDecoration(
                        color: t.bgElev2,
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                    FractionallySizedBox(
                      widthFactor: w,
                      child: Container(
                        height: 28,
                        decoration: BoxDecoration(
                          color: b.$3,
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                    ),
                    Positioned.fill(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 10),
                        child: Align(
                          alignment: Alignment.centerRight,
                          child: Text(
                            _fmtBrl.format(b.$2),
                            style: TextStyle(
                              color: b.$2 == 0 ? t.textMuted : Colors.white,
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              fontFeatures: const [FontFeature.tabularFigures()],
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Erros compartilhados
// ─────────────────────────────────────────────────────────────────────────────

Widget _errorBox(LlTokens t, Object e) {
  return Container(
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(
      color: t.dangerSoft,
      borderRadius: BorderRadius.circular(10),
      border: Border.all(color: t.danger.withValues(alpha: 0.3)),
    ),
    child: Text(
      ApiService.extractErrorMessage(e),
      style: TextStyle(color: t.danger, fontSize: 12),
    ),
  );
}
