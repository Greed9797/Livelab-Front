import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:signature/signature.dart';
import '../../widgets/app_scaffold.dart';
import '../../models/cliente.dart';
import '../../models/pacote.dart';
import '../../providers/contratos_provider.dart';
import '../../providers/clientes_provider.dart';
import '../../providers/pacotes_provider.dart';
import '../../routes/app_routes.dart';
import '../../design_system/design_system.dart';
import '../../utils/form_validators.dart';

class ContratoScreen extends ConsumerStatefulWidget {
  const ContratoScreen({super.key});
  @override
  ConsumerState<ContratoScreen> createState() => _ContratoScreenState();
}

class _ContratoScreenState extends ConsumerState<ContratoScreen> {
  bool _loading = false;
  String? _contratoId;
  Pacote? _selectedPacote;
  double _horasContratadas = 0;
  double _horasConsumidas = 0;

  final _valoresFormKey = GlobalKey<FormState>();
  final _valorCtrl = TextEditingController(text: '2990.00');
  final _comissaoCtrl = TextEditingController(text: '5');
  // W3-A: @ TikTok do contrato — obrigatório pra integração com a live.
  final _tiktokCtrl = TextEditingController();
  // Garante que só pré-preenchemos do cliente uma vez (evita sobrescrever
  // edição manual a cada rebuild).
  bool _tiktokPrefilled = false;

  String? get _clienteId {
    final args = ModalRoute.of(context)?.settings.arguments as Map?;
    return args?['clienteId'] as String?;
  }

  @override
  void dispose() {
    _valorCtrl.dispose();
    _comissaoCtrl.dispose();
    _tiktokCtrl.dispose();
    super.dispose();
  }

  Future<void> _criarContrato() async {
    final clienteId = _clienteId;
    if (clienteId == null || _contratoId != null) return;
    if (!(_valoresFormKey.currentState?.validate() ?? false)) return;
    final valorFixo =
        double.tryParse(_valorCtrl.text.replaceAll(',', '.')) ?? 0;
    final comissaoPct = double.tryParse(_comissaoCtrl.text) ?? 0;
    setState(() => _loading = true);
    try {
      final tiktokRaw = _tiktokCtrl.text.trim();
      final result =
          await ref.read(contratosProvider.notifier).criarComDetalhes(
                clienteId: clienteId,
                valorFixo: valorFixo,
                comissaoPct: comissaoPct,
                pacoteId: _selectedPacote?.id,
                tiktokUsername: tiktokRaw.isEmpty ? null : tiktokRaw,
              );
      if (mounted) {
        setState(() {
          _contratoId = result['id'] as String;
          _horasContratadas =
              double.tryParse('${result['horas_contratadas'] ?? 0}') ?? 0;
          _horasConsumidas =
              double.tryParse('${result['horas_consumidas'] ?? 0}') ?? 0;
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Erro ao criar contrato: $e')));
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _abrirPadAssinatura() async {
    final contratoId = _contratoId;
    if (contratoId == null) return;
    await showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => _SignatureDialog(
        onConfirm: (base64) async {
          Navigator.of(ctx).pop();
          await _assinarDigital(contratoId, base64);
        },
        onCancel: () => Navigator.of(ctx).pop(),
      ),
    );
  }

  Future<void> _assinarDigital(String contratoId, String base64) async {
    setState(() => _loading = true);
    try {
      final result = await ref.read(contratosProvider.notifier).assinarDigital(
            id: contratoId,
            signatureBase64: base64,
          );
      if (!mounted) return;
      Navigator.pushNamed(context, AppRoutes.analiseCredito, arguments: {
        'contratoId': contratoId,
        'aprovadoAutomatico': result['aprovado'] == true,
        'requerBackoffice': result['requer_backoffice'] == true,
        'score': result['score'],
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('Erro ao assinar: $e')));
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _enviarWhatsApp() async {
    final clienteId = _clienteId ?? '';
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
          content:
              Text('Link copiado: https://liveshop.app/assinar/$clienteId')),
    );
  }

  @override
  Widget build(BuildContext context) {
    final clienteId = _clienteId;
    final clientes =
        ref.watch(clientesProvider).valueOrNull ?? const <Cliente>[];
    final pacotes = ref
            .watch(pacotesProvider)
            .valueOrNull
            ?.where((p) => p.ativo)
            .toList() ??
        const <Pacote>[];

    Cliente? cliente;
    if (clienteId != null) {
      for (final c in clientes) {
        if (c.id == clienteId) {
          cliente = c;
          // Pré-preenche @TikTok com o do cliente, uma única vez.
          // Sem RegExp em hot path — barato e idempotente.
          if (!_tiktokPrefilled &&
              _tiktokCtrl.text.trim().isEmpty &&
              (c.tiktokUsername?.isNotEmpty ?? false)) {
            _tiktokCtrl.text = c.tiktokUsername!;
            _tiktokPrefilled = true;
          }
          break;
        }
      }
    }

    final valorDisplay =
        _selectedPacote?.valorFixo.toStringAsFixed(2) ?? _valorCtrl.text;
    final comissaoDisplay =
        _selectedPacote?.comissaoPct.toStringAsFixed(2) ?? _comissaoCtrl.text;

    return AppScaffold(
      currentRoute: AppRoutes.vendas,
      child: Row(
        children: [
          Expanded(
            flex: 3,
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(AppSpacing.x8),
              child: Card(
                child: Padding(
                  padding: const EdgeInsets.all(AppSpacing.x10),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Center(
                          child: Text('CONTRATO DE PARCERIA',
                              style: AppTypography.h3.copyWith(
                                  fontWeight: FontWeight.w500,
                                  letterSpacing: 1))),
                      Center(
                          child: Text('LIVELAB ESTÚDIO',
                              style: AppTypography.bodySmall
                                  .copyWith(color: AppColors.primary))),
                      const SizedBox(height: AppSpacing.x8),
                      Text(
                          'CONTRATANTE: ${cliente?.nome ?? '[Nome do Cliente]'}'),
                      if (cliente?.email != null) ...[
                        const SizedBox(height: AppSpacing.x2),
                        Text('EMAIL: ${cliente!.email}'),
                      ],
                      if (cliente?.cidade != null) ...[
                        const SizedBox(height: AppSpacing.x2),
                        Text(
                            'CIDADE: ${cliente!.cidade}/${cliente.estado ?? ''}'),
                      ],
                      if (_selectedPacote != null) ...[
                        const SizedBox(height: AppSpacing.x2),
                        Text('PACOTE: ${_selectedPacote!.nome}'),
                      ],
                      const Divider(height: AppSpacing.x8),
                      Text(
                        'O presente contrato tem por objeto a prestação de serviços de transmissão ao vivo (Livelab) pela CONTRATADA, conforme plano escolhido, com vigência de 12 (doze) meses a partir da data de assinatura.\n\n'
                        'Cláusula 1ª — DAS OBRIGAÇÕES DA CONTRATADA\nA CONTRATADA se compromete a disponibilizar cabine, equipamentos, apresentador e suporte técnico para realização das transmissões conforme cronograma acordado.\n\n'
                        'Cláusula 2ª — DAS OBRIGAÇÕES DO CONTRATANTE\nO CONTRATANTE se compromete ao pagamento das mensalidades nas datas acordadas e ao fornecimento dos produtos para transmissão.\n\n'
                        'Cláusula 3ª — DO VALOR\nO valor mensal mínimo acordado é de R\$ $valorDisplay, vencendo todo dia 10 de cada mês. A cobrança variável corresponde a $comissaoDisplay% sobre o faturamento apurado nas lives. Enquanto a variável não superar o fixo, cobra-se o fixo; quando superar, cobra-se o valor variável.',
                        style: AppTypography.caption.copyWith(height: 1.6),
                      ),
                      const SizedBox(height: AppSpacing.x10),
                      Text('Assinatura do Contratante:',
                          style: AppTypography.caption
                              .copyWith(color: context.colors.textSecondary)),
                      const SizedBox(height: AppSpacing.x2),
                      Container(
                        width: 240,
                        height: 64,
                        decoration: BoxDecoration(
                          border: Border.all(color: context.colors.textMuted),
                          borderRadius: BorderRadius.circular(AppRadius.sm),
                        ),
                        child: Center(
                          child: Text('(clique em "Assinar Agora" →)',
                              style: AppTypography.caption.copyWith(
                                  color: context.colors.textSecondary)),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
          Container(
            width: 240,
            color: context.colors.bgCard,
            padding: const EdgeInsets.all(AppSpacing.x5),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text('Pacote',
                    style: AppTypography.bodyMedium
                        .copyWith(fontWeight: FontWeight.w600)),
                const SizedBox(height: AppSpacing.x3),
                if (pacotes.isEmpty)
                  Text(
                      'Nenhum pacote cadastrado.\nConfigure em Configurações → Pacotes.',
                      style: AppTypography.caption
                          .copyWith(color: context.colors.textSecondary))
                else
                  AppDropdown<String>(
                    value: _selectedPacote?.id,
                    hint: 'Selecionar pacote',
                    items: pacotes
                        .map((p) => DropdownMenuItem(
                              value: p.id,
                              child: Text(
                                  '${p.nome} — R\$ ${p.valorFixo.toStringAsFixed(0)} + ${p.comissaoPct.toStringAsFixed(1)}%',
                                  style: AppTypography.bodySmall),
                            ))
                        .toList(),
                    onChanged: (id) {
                      if (id == null) return;
                      final p = pacotes.firstWhere((p) => p.id == id);
                      setState(() {
                        _selectedPacote = p;
                        _valorCtrl.text = p.valorFixo.toStringAsFixed(2);
                        _comissaoCtrl.text = p.comissaoPct.toStringAsFixed(2);
                      });
                    },
                  ),
                if (_contratoId != null && _horasContratadas > 0) ...[
                  const SizedBox(height: AppSpacing.x3),
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: AppSpacing.x3, vertical: AppSpacing.x2),
                    decoration: BoxDecoration(
                      color: AppColors.info.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(AppRadius.sm),
                      border: Border.all(
                          color: AppColors.info.withValues(alpha: 0.25)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.timer_outlined,
                            size: 14, color: AppColors.info),
                        const SizedBox(width: AppSpacing.x2),
                        Expanded(
                          child: Text(
                            'Saldo de horas: ${(_horasContratadas - _horasConsumidas).toStringAsFixed(1)} / ${_horasContratadas.toStringAsFixed(1)} h',
                            style: AppTypography.caption
                                .copyWith(color: AppColors.info),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
                const SizedBox(height: AppSpacing.x4),
                Text('Valores',
                    style: AppTypography.bodyMedium
                        .copyWith(fontWeight: FontWeight.w600)),
                const SizedBox(height: AppSpacing.x3),
                Form(
                  key: _valoresFormKey,
                  autovalidateMode: AutovalidateMode.onUserInteraction,
                  child: Column(
                    children: [
                      AppTextField(
                        controller: _valorCtrl,
                        hint: 'Valor mensal mínimo R\$',
                        keyboardType: const TextInputType.numberWithOptions(
                            decimal: true),
                        validator: FormValidators.composite([
                          FormValidators.required(),
                          FormValidators.positiveNumber,
                        ]),
                      ),
                      const SizedBox(height: AppSpacing.x2),
                      AppTextField(
                        controller: _comissaoCtrl,
                        hint: '% sobre faturamento',
                        keyboardType: TextInputType.number,
                        validator: FormValidators.composite([
                          FormValidators.required(),
                          FormValidators.percentage,
                        ]),
                      ),
                      const SizedBox(height: AppSpacing.x2),
                      // W3-A: @TikTok obrigatório pra integração com a live.
                      // Auto-preenchido com cliente.tiktokUsername; pode ser
                      // sobrescrito (cada contrato pode ter um @ próprio).
                      TextFormField(
                        key: const ValueKey('contrato_tiktok'),
                        controller: _tiktokCtrl,
                        keyboardType: TextInputType.text,
                        autovalidateMode: AutovalidateMode.onUserInteraction,
                        textInputAction: TextInputAction.done,
                        style: AppTypography.bodyMedium,
                        decoration: InputDecoration(
                          hintText: 'Conta TikTok do cliente — ex: lojinha_oficial',
                          prefixText: '@ ',
                          prefixStyle: AppTypography.bodyMedium
                              .copyWith(color: context.colors.textSecondary),
                        ),
                        validator: FormValidators.composite([
                          FormValidators.required('Informe o @TikTok do cliente'),
                          FormValidators.tiktokUsername,
                        ]),
                      ),
                    ],
                  ),
                ),
                const Spacer(),
                if (_loading)
                  const Center(child: CircularProgressIndicator())
                else if (_contratoId == null) ...[
                  AppPrimaryButton(
                    key: const ValueKey('contrato_criar_btn'),
                    label: 'CRIAR CONTRATO',
                    icon: Icons.description_outlined,
                    fullWidth: true,
                    onPressed: _criarContrato,
                  ),
                ] else ...[
                  AppPrimaryButton(
                    label: 'ASSINAR AGORA',
                    icon: Icons.draw_outlined,
                    color: AppColors.success,
                    onPressed: _abrirPadAssinatura,
                  ),
                  const SizedBox(height: AppSpacing.x3),
                  AppPrimaryButton(
                    label: 'ENVIAR POR WHATSAPP',
                    icon: Icons.send_outlined,
                    outlined: true,
                    onPressed: _enviarWhatsApp,
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SignatureDialog extends StatefulWidget {
  final void Function(String base64) onConfirm;
  final VoidCallback onCancel;
  const _SignatureDialog({required this.onConfirm, required this.onCancel});

  @override
  State<_SignatureDialog> createState() => _SignatureDialogState();
}

class _SignatureDialogState extends State<_SignatureDialog> {
  late final SignatureController _ctrl;
  bool _acceptedTerms = false;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _ctrl = SignatureController(
      penStrokeWidth: 2.5,
      penColor: Colors.black, // intentional: black ink on white canvas
    );
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  Future<void> _confirmar() async {
    if (_ctrl.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('Desenhe sua assinatura antes de confirmar')),
      );
      return;
    }
    setState(() => _saving = true);
    final bytes = await _ctrl.toPngBytes();
    if (bytes == null) {
      setState(() => _saving = false);
      return;
    }
    final base64Str = base64Encode(bytes);
    widget.onConfirm(base64Str);
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Assinar Contrato'),
      content: SizedBox(
        width: 480,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Desenhe sua assinatura abaixo:',
                style: AppTypography.label
                    .copyWith(color: context.colors.textSecondary)),
            const SizedBox(height: AppSpacing.x2),
            Container(
              decoration: BoxDecoration(
                border: Border.all(color: context.colors.textMuted),
                borderRadius: BorderRadius.circular(AppRadius.md),
                color: context.colors.bgPage,
              ),
              child: Signature(
                controller: _ctrl,
                height: 180,
                backgroundColor: context.colors.bgPage,
              ),
            ),
            Align(
              alignment: Alignment.centerRight,
              child: AppGhostButton(
                label: 'Limpar',
                onPressed: () => _ctrl.clear(),
                icon: Icons.refresh,
              ),
            ),
            const SizedBox(height: AppSpacing.x2),
            Row(
              children: [
                Checkbox(
                  value: _acceptedTerms,
                  onChanged: (v) => setState(() => _acceptedTerms = v ?? false),
                ),
                Expanded(
                  child: Text(
                      'Li e aceito os termos do contrato de parceria Livelab',
                      style: AppTypography.caption),
                ),
              ],
            ),
          ],
        ),
      ),
      actions: [
        AppSecondaryButton(label: 'Cancelar', onPressed: widget.onCancel),
        AppPrimaryButton(
          onPressed: (_acceptedTerms && !_saving) ? _confirmar : null,
          isLoading: _saving,
          label: 'Confirmar Assinatura',
        ),
      ],
    );
  }
}
