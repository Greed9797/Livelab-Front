import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/cabine.dart';
import '../models/cliente.dart';
import '../models/fila_ativacao_item.dart';
import '../providers/cabines_provider.dart';
import '../providers/clientes_provider.dart';
import '../routes/app_routes.dart';
import '../services/api_service.dart';
import '../design_system/design_system.dart';
import '../utils/doc_validators.dart';

Future<void> showReservarCabineModal({
  required BuildContext context,
  required Cabine cabine,
}) {
  return showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    backgroundColor: context.colors.bgCard,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadius.xl)),
    ),
    builder: (_) => _ReservarCabineSheet(cabine: cabine),
  );
}

class _ReservarCabineSheet extends ConsumerStatefulWidget {
  final Cabine cabine;
  const _ReservarCabineSheet({required this.cabine});

  @override
  ConsumerState<_ReservarCabineSheet> createState() =>
      _ReservarCabineSheetState();
}

class _ReservarCabineSheetState extends ConsumerState<_ReservarCabineSheet> {
  bool _modeNovo = false;
  Cliente? _selectedCliente;
  bool _loading = false;

  final _formKey = GlobalKey<FormState>();
  final _nomeCtrl = TextEditingController();
  final _celularCtrl = TextEditingController();
  final _docCtrl = TextEditingController();
  String _docType = 'cpf';

  @override
  void dispose() {
    _nomeCtrl.dispose();
    _celularCtrl.dispose();
    _docCtrl.dispose();
    super.dispose();
  }

  String _applyDocMask(String digits) {
    if (digits.length <= 11) {
      final d = digits.padRight(11, ' ').substring(0, 11);
      final buf = StringBuffer();
      for (var i = 0; i < d.length; i++) {
        if (i == 3 || i == 6) buf.write('.');
        if (i == 9) buf.write('-');
        buf.write(d[i]);
      }
      return buf.toString().trimRight();
    } else {
      final d =
          digits.substring(0, digits.length.clamp(0, 14)).padRight(14, ' ');
      final buf = StringBuffer();
      for (var i = 0; i < d.length; i++) {
        if (i == 2 || i == 5) buf.write('.');
        if (i == 8) buf.write('/');
        if (i == 12) buf.write('-');
        buf.write(d[i]);
      }
      return buf.toString().trimRight();
    }
  }

  Future<void> _reservarComContrato(String contratoId) async {
    setState(() => _loading = true);
    try {
      await ref.read(cabinesProvider.notifier).reservarCabine(
            cabineId: widget.cabine.id,
            contratoId: contratoId,
          );
      if (!mounted) return;
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
              'Cabine ${widget.cabine.numero.toString().padLeft(2, '0')} reservada com sucesso.'),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(ApiService.extractErrorMessage(e))),
      );
    }
  }

  Future<void> _criarClienteEReservar() async {
    if (!_formKey.currentState!.validate()) return;
    final nome = _nomeCtrl.text.trim();
    if (nome.isEmpty) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Nome é obrigatório')));
      return;
    }
    final phoneDigits = _celularCtrl.text.replaceAll(RegExp(r'\D'), '');
    if (phoneDigits.length < 10 || phoneDigits.length > 11) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('Celular inválido — informe 10 ou 11 dígitos')));
      return;
    }

    setState(() => _loading = true);

    // Step 1: Create client
    Cliente cliente;
    try {
      cliente = await ref.read(clientesProvider.notifier).criar({
        'nome': nome,
        'celular': _celularCtrl.text,
        if (_docCtrl.text.isNotEmpty && _docType == 'cpf') 'cpf': _docCtrl.text,
        if (_docCtrl.text.isNotEmpty && _docType == 'cnpj')
          'cnpj': _docCtrl.text,
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(ApiService.extractErrorMessage(e))),
      );
      return;
    }

    if (!mounted) return;

    // Step 2: Create quick contract (rascunho with defaults)
    String contratoId;
    try {
      final contratoResp = await ApiService.post(
        '/contratos/quick',
        data: {'cliente_id': cliente.id},
      );
      contratoId = (contratoResp.data as Map<String, dynamic>)['id'] as String;
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Cliente criado, mas falha ao criar contrato: ${ApiService.extractErrorMessage(e)}',
          ),
        ),
      );
      return;
    }

    if (!mounted) return;

    // Step 3: Reserve the cabine
    try {
      await ref.read(cabinesProvider.notifier).reservarCabine(
            cabineId: widget.cabine.id,
            contratoId: contratoId,
          );
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Contrato criado, mas falha ao reservar cabine: ${ApiService.extractErrorMessage(e)}',
          ),
        ),
      );
      return;
    }

    if (!mounted) return;

    // Step 4 & 5: Close modal and show success
    Navigator.pop(context);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          'Cabine reservada para ${cliente.nome}',
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final clientes = ref.watch(clientesProvider).valueOrNull ?? [];
    final fila = ref.watch(filaAtivacaoProvider).valueOrNull ?? [];

    FilaAtivacaoItem? contratoDoCliente;
    if (_selectedCliente != null) {
      for (final item in fila) {
        if (item.clienteId == _selectedCliente!.id) {
          contratoDoCliente = item;
          break;
        }
      }
    }

    return Padding(
      padding: EdgeInsets.fromLTRB(
        AppSpacing.x5,
        AppSpacing.x2,
        AppSpacing.x5,
        AppSpacing.x5 + MediaQuery.of(context).viewInsets.bottom,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Reservar Cabine ${widget.cabine.numero.toString().padLeft(2, '0')}',
            style: AppTypography.h2.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: AppSpacing.x1),
          Text(
            'Selecione ou cadastre o cliente que vai usar esta cabine.',
            style: AppTypography.bodySmall
                .copyWith(color: context.colors.textSecondary),
          ),
          const SizedBox(height: AppSpacing.x4),
          SegmentedButton<bool>(
            segments: const [
              ButtonSegment(
                value: false,
                label: Text('Cliente existente'),
                icon: Icon(Icons.person_search_outlined),
              ),
              ButtonSegment(
                value: true,
                label: Text('Novo cliente'),
                icon: Icon(Icons.person_add_outlined),
              ),
            ],
            selected: {_modeNovo},
            onSelectionChanged: (v) => setState(() {
              _modeNovo = v.first;
              _selectedCliente = null;
            }),
            style: SegmentedButton.styleFrom(
              selectedBackgroundColor:
                  AppColors.primary.withValues(alpha: 0.12),
              selectedForegroundColor: AppColors.primary,
            ),
          ),
          const SizedBox(height: AppSpacing.x4),
          if (!_modeNovo) ...[
            Autocomplete<Cliente>(
              optionsBuilder: (textEditingValue) {
                final query = textEditingValue.text.toLowerCase();
                if (query.isEmpty) return const Iterable.empty();
                return clientes.where((c) =>
                    c.nome.toLowerCase().contains(query) ||
                    (c.email?.toLowerCase().contains(query) ?? false));
              },
              displayStringForOption: (c) => c.nome,
              onSelected: (cliente) =>
                  setState(() => _selectedCliente = cliente),
              fieldViewBuilder: (ctx, ctrl, focusNode, onSubmit) =>
                  TextFormField(
                controller: ctrl,
                focusNode: focusNode,
                onFieldSubmitted: (_) => onSubmit(),
                style: AppTypography.bodyMedium,
                decoration: InputDecoration(
                  hintText: 'Buscar cliente por nome...',
                  prefixIcon: Icon(Icons.search,
                      color: ctx.colors.textMuted, size: 20),
                ),
              ),
              optionsViewBuilder: (ctx, onSelected, options) => Align(
                alignment: Alignment.topLeft,
                child: Material(
                  elevation: 4,
                  borderRadius: BorderRadius.circular(AppRadius.md),
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(
                        maxHeight: 220, maxWidth: 400),
                    child: ListView.builder(
                      shrinkWrap: true,
                      padding: EdgeInsets.zero,
                      itemCount: options.length,
                      itemBuilder: (_, i) {
                        final c = options.elementAt(i);
                        return ListTile(
                          dense: true,
                          leading: CircleAvatar(
                            radius: 16,
                            backgroundColor:
                                AppColors.primary.withValues(alpha: 0.12),
                            child: Text(
                              c.nome[0].toUpperCase(),
                              style: AppTypography.caption
                                  .copyWith(color: AppColors.primary),
                            ),
                          ),
                          title: Text(c.nome,
                              style: AppTypography.bodySmall.copyWith(
                                  fontWeight: FontWeight.w600)),
                          subtitle: c.cidade != null
                              ? Text(c.cidade!,
                                  style: AppTypography.caption)
                              : null,
                          onTap: () => onSelected(c),
                        );
                      },
                    ),
                  ),
                ),
              ),
            ),
            if (_selectedCliente != null) ...[
              const SizedBox(height: AppSpacing.x3),
              Container(
                padding: const EdgeInsets.all(AppSpacing.x3),
                decoration: BoxDecoration(
                  color: contratoDoCliente != null
                      ? AppColors.success.withValues(alpha: 0.08)
                      : AppColors.warning.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(AppRadius.md),
                  border: Border.all(
                    color: contratoDoCliente != null
                        ? AppColors.success.withValues(alpha: 0.3)
                        : AppColors.warning.withValues(alpha: 0.3),
                  ),
                ),
                child: Row(
                  children: [
                    Icon(
                      contratoDoCliente != null
                          ? Icons.check_circle_outline
                          : Icons.warning_amber_outlined,
                      color: contratoDoCliente != null
                          ? AppColors.success
                          : AppColors.warning,
                      size: 18,
                    ),
                    const SizedBox(width: AppSpacing.x2),
                    Expanded(
                      child: contratoDoCliente != null
                          ? Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Contrato na fila de ativação',
                                  style: AppTypography.caption.copyWith(
                                      color: AppColors.success,
                                      fontWeight: FontWeight.w600),
                                ),
                                Text(
                                  'R\$ ${contratoDoCliente.valorFixo.toStringAsFixed(2)} fixo • ${contratoDoCliente.comissaoPct.toStringAsFixed(0)}% comissão',
                                  style: AppTypography.caption.copyWith(
                                      color: context.colors.textSecondary),
                                ),
                              ],
                            )
                          : Text(
                              'Cliente sem contrato ativo. Crie um contrato primeiro.',
                              style: AppTypography.caption
                                  .copyWith(color: AppColors.warning),
                            ),
                    ),
                  ],
                ),
              ),
            ],
          ] else ...[
            Form(
              key: _formKey,
              child: Column(
                children: [
                  AppTextField(
                    controller: _nomeCtrl,
                    hint: 'Nome Completo *',
                    prefixIcon: Icons.person_outline,
                  ),
                  const SizedBox(height: AppSpacing.x3),
                  AppTextField(
                    controller: _celularCtrl,
                    hint: 'Celular (WhatsApp) *',
                    keyboardType: TextInputType.phone,
                    prefixIcon: Icons.phone_outlined,
                  ),
                  const SizedBox(height: AppSpacing.x3),
                  AppTextField(
                    controller: _docCtrl,
                    hint: 'CPF / CNPJ (opcional)',
                    keyboardType: TextInputType.number,
                    prefixIcon: Icons.badge_outlined,
                    inputFormatters: [cnpjInputFormatter],
                    validator: validateCpfOrCnpj,
                    onChanged: (value) {
                      final digits = value.replaceAll(RegExp(r'\D'), '');
                      final newType = digits.length <= 11 ? 'cpf' : 'cnpj';
                      final masked = _applyDocMask(digits);
                      if (masked != _docCtrl.text) {
                        _docCtrl.value = TextEditingValue(
                          text: masked,
                          selection:
                              TextSelection.collapsed(offset: masked.length),
                        );
                      }
                      if (newType != _docType) setState(() => _docType = newType);
                    },
                    suffixIcon: Padding(
                      padding: const EdgeInsets.all(8),
                      child: AppBadge(
                        label: _docType.toUpperCase(),
                        type: AppBadgeType.neutral,
                        showDot: false,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: AppSpacing.x5),
          if (_loading)
            const Center(child: CircularProgressIndicator())
          else
            Row(
              children: [
                Expanded(
                  child: AppSecondaryButton(
                    label: 'Cancelar',
                    fullWidth: true,
                    onPressed: () => Navigator.pop(context),
                  ),
                ),
                const SizedBox(width: AppSpacing.x3),
                Expanded(
                  child: AppPrimaryButton(
                    fullWidth: true,
                    label: _buildConfirmLabel(contratoDoCliente),
                    onPressed: _buildConfirmCallback(contratoDoCliente),
                  ),
                ),
              ],
            ),
          const SizedBox(height: AppSpacing.x2),
        ],
      ),
    );
  }

  String _buildConfirmLabel(FilaAtivacaoItem? contrato) {
    if (_modeNovo) return 'Criar e Reservar';
    if (_selectedCliente == null) return 'Selecione um cliente';
    return contrato != null ? 'Reservar Cabine' : 'Criar Contrato';
  }

  VoidCallback? _buildConfirmCallback(FilaAtivacaoItem? contrato) {
    if (_modeNovo) return _criarClienteEReservar;
    if (_selectedCliente == null) return null;
    if (contrato != null) return () => _reservarComContrato(contrato.id);
    return () => Navigator.pushNamed(
          context,
          AppRoutes.contrato,
          arguments: {'clienteId': _selectedCliente!.id},
        );
  }
}
