import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../widgets/app_scaffold.dart';
import '../../providers/clientes_provider.dart';
import '../../routes/app_routes.dart';
import '../../design_system/design_system.dart';
import '../../utils/doc_validators.dart';
import '../../utils/form_validators.dart';

class CadastroClienteScreen extends ConsumerStatefulWidget {
  const CadastroClienteScreen({super.key});
  @override
  ConsumerState<CadastroClienteScreen> createState() =>
      _CadastroClienteScreenState();
}

class _CadastroClienteScreenState extends ConsumerState<CadastroClienteScreen> {
  final _pageCtrl = PageController();
  final _step1FormKey = GlobalKey<FormState>();
  final _step2FormKey = GlobalKey<FormState>();
  final _docFormKey = GlobalKey<FormState>();
  int _step = 0;
  bool _loading = false;

  // Step 1 — Dados pessoais
  final _nomeCtrl = TextEditingController();
  final _celularCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _docCtrl = TextEditingController(); // CPF ou CNPJ unificado
  String _docType = 'cpf'; // 'cpf' ou 'cnpj'

  // Step 2 — Dados comerciais
  final _razaoCtrl = TextEditingController();
  final _fatCtrl = TextEditingController();
  final _nichoCtrl = TextEditingController();
  final _sigaCtrl = TextEditingController();

  // Step 3 — Localização
  final _cepCtrl = TextEditingController();
  final _cidadeCtrl = TextEditingController();
  final _estadoCtrl = TextEditingController();
  double? _lat, _lng;
  bool _geocodingLoading = false;
  Timer? _cepDebounce;

  // Step 4 — Qualificação
  bool _jaVendeTikTok = false;

  @override
  void dispose() {
    _pageCtrl.dispose();
    _nomeCtrl.dispose();
    _celularCtrl.dispose();
    _emailCtrl.dispose();
    _docCtrl.dispose();
    _razaoCtrl.dispose();
    _fatCtrl.dispose();
    _nichoCtrl.dispose();
    _sigaCtrl.dispose();
    _cepCtrl.dispose();
    _cidadeCtrl.dispose();
    _estadoCtrl.dispose();
    _cepDebounce?.cancel();
    super.dispose();
  }

  void _onCepChanged(String value) {
    _cepDebounce?.cancel();
    final digits = value.replaceAll(RegExp(r'\D'), '');
    if (digits.length != 8) return;
    _cepDebounce =
        Timer(const Duration(milliseconds: 500), () => _buscarCep(digits));
  }

  Future<void> _buscarCep(String cep) async {
    setState(() => _geocodingLoading = true);
    try {
      final data = await ref.read(clientesProvider.notifier).buscarCep(cep);
      setState(() {
        _cidadeCtrl.text = data['cidade'] as String? ?? '';
        _estadoCtrl.text = data['estado'] as String? ?? '';
        _lat = (data['lat'] as num?)?.toDouble();
        _lng = (data['lng'] as num?)?.toDouble();
      });
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Nao foi possivel consultar o CEP agora.')),
      );
    } finally {
      if (mounted) setState(() => _geocodingLoading = false);
    }
  }

  void _nextStep() {
    if (_step == 0) {
      final step1Valid = _step1FormKey.currentState?.validate() ?? true;
      final docValid = _docFormKey.currentState?.validate() ?? true;
      if (!step1Valid || !docValid) return;
    } else if (_step == 1) {
      if (!(_step2FormKey.currentState?.validate() ?? true)) return;
    }
    if (_step < 3) {
      setState(() => _step++);
      _pageCtrl.nextPage(
          duration: const Duration(milliseconds: 300), curve: Curves.easeInOut);
    }
  }

  void _prevStep() {
    if (_step > 0) {
      setState(() => _step--);
      _pageCtrl.previousPage(
          duration: const Duration(milliseconds: 300), curve: Curves.easeInOut);
    }
  }

  Future<void> _salvar({required bool gerarContrato}) async {
    setState(() => _loading = true);
    try {
      final cliente = await ref.read(clientesProvider.notifier).criar({
        'nome': _nomeCtrl.text,
        'celular': _celularCtrl.text,
        if (_emailCtrl.text.isNotEmpty) 'email': _emailCtrl.text,
        if (_docCtrl.text.isNotEmpty && _docType == 'cpf') 'cpf': _docCtrl.text,
        if (_docCtrl.text.isNotEmpty && _docType == 'cnpj') 'cnpj': _docCtrl.text,
        if (_razaoCtrl.text.isNotEmpty) 'razao_social': _razaoCtrl.text,
        if (_nichoCtrl.text.isNotEmpty) 'nicho': _nichoCtrl.text,
        if (_sigaCtrl.text.isNotEmpty) 'siga': _sigaCtrl.text,
        if (_cepCtrl.text.isNotEmpty)
          'cep': _cepCtrl.text.replaceAll(RegExp(r'\D'), ''),
        if (_cidadeCtrl.text.isNotEmpty) 'cidade': _cidadeCtrl.text,
        if (_estadoCtrl.text.isNotEmpty) 'estado': _estadoCtrl.text,
        if (_fatCtrl.text.isNotEmpty)
          'fat_anual': double.tryParse(_fatCtrl.text.replaceAll(',', '.')) ?? 0,
        'vende_tiktok': _jaVendeTikTok,
        if (_lat != null) 'lat': _lat,
        if (_lng != null) 'lng': _lng,
      });
      if (!mounted) return;
      if (gerarContrato) {
        Navigator.pushNamed(context, AppRoutes.contrato,
            arguments: {'clienteId': cliente.id});
      } else {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('Rascunho salvo!')));
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('Erro: $e')));
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      currentRoute: AppRoutes.vendas,
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 640),
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.x8),
            child: AppCard(
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.x8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _StepIndicator(current: _step),
                    const SizedBox(height: AppSpacing.x6),
                    SizedBox(
                      height: 360,
                      child: PageView(
                        controller: _pageCtrl,
                        physics: const NeverScrollableScrollPhysics(),
                        children: [
                          _step1(),
                          _step2(),
                          _step3(),
                          _step4(),
                        ],
                      ),
                    ),
                    const SizedBox(height: AppSpacing.x6),
                    _buildNavButtons(),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _step1() => Form(
        key: _step1FormKey,
        autovalidateMode: AutovalidateMode.onUserInteraction,
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Dados Pessoais',
                  style: AppTypography.bodyLarge
                      .copyWith(fontWeight: FontWeight.w600)),
              const SizedBox(height: AppSpacing.x4),
              _field('Nome Completo *', _nomeCtrl,
                  validator: FormValidators.required()),
              _field('Celular (WhatsApp) *', _celularCtrl,
                  type: TextInputType.phone,
                  validator: FormValidators.composite([
                    FormValidators.required(),
                    FormValidators.telefoneBr,
                  ])),
              _field('Email', _emailCtrl,
                  type: TextInputType.emailAddress,
                  validator: FormValidators.email),
              _docField(),
            ],
          ),
        ),
      );

  Widget _step2() => Form(
        key: _step2FormKey,
        autovalidateMode: AutovalidateMode.onUserInteraction,
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Dados Comerciais',
                  style: AppTypography.bodyLarge
                      .copyWith(fontWeight: FontWeight.w600)),
              const SizedBox(height: AppSpacing.x4),
              _field('Razão Social', _razaoCtrl),
              _field('Faturamento Anual R\$', _fatCtrl,
                  type: TextInputType.number,
                  validator: FormValidators.nonNegativeNumber),
              _field('Nicho (ex: Moda, Eletrônicos)', _nichoCtrl),
            ],
          ),
        ),
      );

  Widget _step3() => SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Localização',
                style: AppTypography.bodyLarge.copyWith(fontWeight: FontWeight.w600)),
            const SizedBox(height: AppSpacing.x4),
            AppTextField(
              controller: _cepCtrl,
              keyboardType: TextInputType.number,
              onChanged: _onCepChanged,
              hint: 'CEP *',
              suffixIcon: _geocodingLoading
                  ? const Padding(
                      padding: EdgeInsets.all(AppSpacing.x3),
                      child: SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2)))
                  : const Icon(Icons.location_on_outlined),
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                Expanded(flex: 3, child: _field('Cidade', _cidadeCtrl)),
                const SizedBox(width: 8),
                Expanded(flex: 1, child: _field('UF', _estadoCtrl)),
              ],
            ),
            if (_lat != null)
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Row(children: [
                  Icon(Icons.check_circle_outline,
                      color: AppColors.success, size: 14),
                  const SizedBox(width: AppSpacing.x1),
                  Text(
                      'Geolocalizado (${_lat!.toStringAsFixed(4)}, ${_lng!.toStringAsFixed(4)})',
                      style: AppTypography.caption.copyWith(color: AppColors.success)),
                ]),
              ),
          ],
        ),
      );

  Widget _step4() => SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Qualificação',
                style: AppTypography.bodyLarge.copyWith(fontWeight: FontWeight.w600)),
            const SizedBox(height: AppSpacing.x4),
            Container(
              decoration: BoxDecoration(
                border: Border.all(color: context.colors.textMuted),
                borderRadius: BorderRadius.circular(AppRadius.md),
              ),
              child: SwitchListTile(
                title: const Text('Já vende no TikTok Live?'),
                subtitle: Text(
                  _jaVendeTikTok ? 'Sim — informe o handle abaixo' : 'Não',
                  style: AppTypography.caption.copyWith(color: context.colors.textMuted),
                ),
                value: _jaVendeTikTok,
                activeThumbColor: AppColors.primary,
                onChanged: (v) => setState(() => _jaVendeTikTok = v),
              ),
            ),
            if (_jaVendeTikTok) ...[
              const SizedBox(height: AppSpacing.x3),
              _field('@ Handle no TikTok (opcional)', _sigaCtrl),
            ],
            const SizedBox(height: AppSpacing.x4),
            const Divider(),
            const SizedBox(height: AppSpacing.x3),
            Text('Revisão',
                style: AppTypography.bodySmall.copyWith(fontWeight: FontWeight.w600)),
            const SizedBox(height: AppSpacing.x2),
            _reviewRow('Nome', _nomeCtrl.text),
            _reviewRow('Celular', _celularCtrl.text),
            if (_emailCtrl.text.isNotEmpty)
              _reviewRow('Email', _emailCtrl.text),
            if (_docCtrl.text.isNotEmpty)
              _reviewRow(_docType.toUpperCase(), _docCtrl.text),
            if (_nichoCtrl.text.isNotEmpty)
              _reviewRow('Nicho', _nichoCtrl.text),
            if (_cidadeCtrl.text.isNotEmpty)
              _reviewRow(
                  'Cidade/UF', '${_cidadeCtrl.text}/${_estadoCtrl.text}'),
          ],
        ),
      );

  Widget _reviewRow(String label, String value) => Padding(
        padding: const EdgeInsets.only(bottom: 4),
        child: Row(children: [
          SizedBox(
              width: 80,
              child: Text(label,
                  style: AppTypography.caption.copyWith(color: context.colors.textSecondary))),
          Expanded(child: Text(value, style: AppTypography.caption)),
        ]),
      );

  Widget _buildNavButtons() {
    if (_loading) return const Center(child: CircularProgressIndicator());
    return Wrap(
      spacing: AppSpacing.x3,
      runSpacing: AppSpacing.x2,
      alignment: WrapAlignment.spaceBetween,
      crossAxisAlignment: WrapCrossAlignment.center,
      children: [
        if (_step > 0)
          AppSecondaryButton(
            onPressed: _prevStep,
            icon: Icons.arrow_back_ios,
            label: 'Voltar',
          )
        else
          const SizedBox.shrink(),
        Wrap(
          spacing: AppSpacing.x3,
          runSpacing: AppSpacing.x2,
          children: [
            if (_step < 3)
              AppPrimaryButton(
                  label: 'PRÓXIMO',
                  icon: Icons.arrow_forward_ios,
                  onPressed: _nextStep)
            else ...[
              AppPrimaryButton(
                label: 'GERAR CONTRATO',
                icon: Icons.description_outlined,
                onPressed: () => _salvar(gerarContrato: true),
              ),
              AppSecondaryButton(
                label: 'RASCUNHO',
                icon: Icons.save_outlined,
                onPressed: () => _salvar(gerarContrato: false),
              ),
            ],
          ],
        ),
      ],
    );
  }

  String _applyDocMask(String digits) {
    if (digits.length <= 11) {
      // CPF: 000.000.000-00
      final d = digits.padRight(11, ' ').substring(0, 11);
      final buf = StringBuffer();
      for (var i = 0; i < d.length; i++) {
        if (i == 3 || i == 6) buf.write('.');
        if (i == 9) buf.write('-');
        buf.write(d[i]);
      }
      return buf.toString().trimRight();
    } else {
      // CNPJ: 00.000.000/0000-00
      final d = digits.substring(0, digits.length.clamp(0, 14)).padRight(14, ' ');
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

  Widget _docField() {
    return Form(
      key: _docFormKey,
      child: Padding(
        padding: const EdgeInsets.only(bottom: 14),
        child: AppTextField(
          controller: _docCtrl,
          keyboardType: TextInputType.number,
          inputFormatters: [cnpjInputFormatter],
          validator: validateCpfOrCnpj,
          onChanged: (value) {
            final digits = value.replaceAll(RegExp(r'\D'), '');
            final newType = digits.length <= 11 ? 'cpf' : 'cnpj';
            final masked = _applyDocMask(digits);
            if (masked != _docCtrl.text) {
              _docCtrl.value = TextEditingValue(
                text: masked,
                selection: TextSelection.collapsed(offset: masked.length),
              );
            }
            if (newType != _docType) setState(() => _docType = newType);
          },
          hint: 'CPF / CNPJ',
          suffixIcon: Padding(
            padding: const EdgeInsets.all(8),
            child: AppBadge(
              label: _docType.toUpperCase(),
              type: AppBadgeType.neutral,
              showDot: false,
            ),
          ),
        ),
      ),
    );
  }

  Widget _field(String label, TextEditingController ctrl,
          {TextInputType? type, String? Function(String?)? validator}) =>
      Padding(
        padding: const EdgeInsets.only(bottom: 14),
        child: AppTextField(
          controller: ctrl,
          keyboardType: type,
          hint: label,
          validator: validator,
        ),
      );
}

class _StepIndicator extends StatelessWidget {
  final int current;
  const _StepIndicator({required this.current});

  static const _labels = [
    'Pessoal',
    'Comercial',
    'Localização',
    'Qualificação'
  ];

  @override
  Widget build(BuildContext context) {
    return Row(
      children: List.generate(_labels.length, (i) {
        final active = i == current;
        final done = i < current;
        return Expanded(
          child: Row(
            children: [
              Column(
                children: [
                  Container(
                    width: 28,
                    height: 28,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: done
                          ? AppColors.success
                          : active
                              ? AppColors.primary
                              : context.colors.borderSubtle,
                    ),
                    child: Center(
                      child: done
                          ? const Icon(Icons.check,
                              size: 14, color: Colors.white)
                          : Text('${i + 1}',
                              style: AppTypography.caption.copyWith(
                                  color: active ? Colors.white : context.colors.textSecondary,
                                  fontWeight: FontWeight.w700)),
                    ),
                  ),
                  const SizedBox(height: AppSpacing.x1),
                  Text(_labels[i],
                      style: AppTypography.caption.copyWith(
                          fontSize: 9,
                          color: active ? AppColors.primary : context.colors.textMuted)),
                ],
              ),
              if (i < _labels.length - 1)
                Expanded(
                    child: Container(
                        height: 1,
                        color: done ? AppColors.success : context.colors.textMuted,
                        margin: const EdgeInsets.only(bottom: AppSpacing.x4))),
            ],
          ),
        );
      }),
    );
  }
}
