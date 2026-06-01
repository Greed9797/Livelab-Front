// Dialog reusável Create/Edit/Delete pra Lead. Tema dark fixo (segue CRM v3).
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../models/lead.dart';
import '../../providers/leads_provider.dart';
import '../../utils/form_validators.dart';

class _D {
  static const bg          = Color(0xFF16161A);
  static const surface     = Color(0xFF1E1E22);
  static const input       = Color(0xFF1A1A1E);
  static const border      = Color(0x1AFFFFFF);
  static const borderFocus = Color(0xFFFF6A2F);
  static const text        = Color(0xFFF5F0EB);
  static const textSec     = Color(0xFFB8B2AC);
  static const textMuted   = Color(0xFF75716D);
  static const primary     = Color(0xFFFF6A2F);
  static const danger      = Color(0xFFF87171);
}

const _STAGE_OPTS = [
  ('lead_novo', 'Lead captado'),
  ('contato_iniciado', 'Qualificação'),
  ('reuniao_agendada', 'Reunião agendada'),
  ('proposta_enviada', 'Negociação'),
  ('em_negociacao', 'Contrato enviado'),
  ('aguardando_assinatura', 'Contrato pendente'),
  ('ganho', 'Fechado ganho'),
  ('perdido', 'Fechado perdido'),
];

Future<bool?> showLeadDialog(BuildContext context, {Lead? lead}) {
  return showDialog<bool>(
    context: context,
    barrierColor: Colors.black87,
    builder: (_) => Dialog(
      backgroundColor: _D.bg,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 560),
        child: _LeadForm(lead: lead),
      ),
    ),
  );
}

class _LeadForm extends ConsumerStatefulWidget {
  final Lead? lead;
  const _LeadForm({required this.lead});

  @override
  ConsumerState<_LeadForm> createState() => _LeadFormState();
}

class _LeadFormState extends ConsumerState<_LeadForm> {
  late final TextEditingController _nome;
  late final TextEditingController _cidade;
  late final TextEditingController _estado;
  late final TextEditingController _responsavel;
  late final TextEditingController _origem;
  late final TextEditingController _valor;
  late final TextEditingController _observacoes;
  late final TextEditingController _email;
  late final TextEditingController _whatsapp;
  late String _tipo;
  late String _etapa;
  // Controllers dinâmicos pra cada campo do dados_extras. Key = chave do JSONB.
  final Map<String, TextEditingController> _extras = {};
  bool _saving = false;
  bool _deleting = false;

  bool get _isEdit => widget.lead != null;

  @override
  void initState() {
    super.initState();
    final l = widget.lead;
    _nome = TextEditingController(text: l?.nome ?? '');
    _cidade = TextEditingController(text: l?.cidade ?? '');
    _estado = TextEditingController(text: l?.estado ?? '');
    _responsavel = TextEditingController(text: l?.responsavelNome ?? '');
    _origem = TextEditingController(text: l?.origem ?? '');
    _valor = TextEditingController(
      text: l == null
          ? ''
          : (l.valorOportunidade > 0 ? l.valorOportunidade : l.fatEstimado).toStringAsFixed(0),
    );
    _observacoes = TextEditingController(text: l?.observacoesInternas ?? '');
    _email = TextEditingController(text: l?.contatoEmail ?? '');
    _whatsapp = TextEditingController(text: l?.contatoWhatsapp ?? '');
    _tipo = _detectTipo(l?.nicho);
    _etapa = l?.crmEtapa ?? 'lead_novo';
    // Constrói controllers para cada campo do dados_extras vindo do banco.
    // Mantém ordem original do JSONB para preservar a sequência das seções.
    final extras = l?.dadosExtras ?? const <String, dynamic>{};
    for (final entry in extras.entries) {
      _extras[entry.key] = TextEditingController(text: _stringifyExtra(entry.value));
    }
  }

  static String _stringifyExtra(dynamic v) {
    if (v == null) return '';
    if (v is List) return v.map((e) => e.toString()).where((s) => s.isNotEmpty).join(', ');
    if (v is Map) return v.entries.map((e) => '${e.key}: ${e.value}').join(' · ');
    return v.toString();
  }

  @override
  void dispose() {
    _nome.dispose();
    _cidade.dispose();
    _estado.dispose();
    _responsavel.dispose();
    _origem.dispose();
    _valor.dispose();
    _observacoes.dispose();
    _email.dispose();
    _whatsapp.dispose();
    for (final c in _extras.values) {
      c.dispose();
    }
    super.dispose();
  }

  String _detectTipo(String? nicho) {
    if (nicho == null) return 'Cliente';
    final n = nicho.toLowerCase();
    if (n.contains('unidade') || n.contains('franquead')) return 'Unidade';
    if (n.contains('creator') || n.contains('apresentador')) return 'Creator';
    if (n.contains('cliente') || n.contains('bio_')) return 'Cliente';
    return 'Outro';
  }

  static const _ARRAY_KEYS = {'atrativos'};

  Future<void> _save() async {
    if (_nome.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Nome obrigatório'), backgroundColor: _D.danger),
      );
      return;
    }
    setState(() => _saving = true);
    try {
      final valorNum = double.tryParse(_valor.text.replaceAll(',', '.')) ?? 0;
      // Reconstrói dados_extras do dialog (preserva tipo array para chaves específicas)
      final extras = <String, dynamic>{};
      for (final entry in _extras.entries) {
        final v = entry.value.text.trim();
        if (v.isEmpty) continue;
        if (_ARRAY_KEYS.contains(entry.key)) {
          extras[entry.key] = v.split(',').map((s) => s.trim()).where((s) => s.isNotEmpty).toList();
        } else {
          extras[entry.key] = v;
        }
      }

      final data = <String, dynamic>{
        'nome': _nome.text.trim(),
        if (_cidade.text.trim().isNotEmpty) 'cidade': _cidade.text.trim(),
        if (_estado.text.trim().isNotEmpty) 'estado': _estado.text.trim(),
        if (_responsavel.text.trim().isNotEmpty) 'responsavel_nome': _responsavel.text.trim(),
        if (_origem.text.trim().isNotEmpty) 'origem': _origem.text.trim(),
        if (_email.text.trim().isNotEmpty) 'contato_email': _email.text.trim(),
        if (_whatsapp.text.trim().isNotEmpty) 'contato_whatsapp': _whatsapp.text.trim(),
        if (_tipo != 'Outro') 'nicho': _tipo,
        if (valorNum > 0) ...{
          'valor_oportunidade': valorNum,
          'fat_estimado': valorNum,
        },
        if (_observacoes.text.trim().isNotEmpty) 'observacoes_internas': _observacoes.text.trim(),
        'crm_etapa': _etapa,
        if (extras.isNotEmpty || _isEdit) 'dados_extras': extras,
      };

      final notifier = ref.read(leadsProvider.notifier);
      if (_isEdit) {
        // Atualiza campos
        await notifier.atualizar(widget.lead!.id, data);
        // Se etapa mudou, sincroniza via moverEtapa (endpoint específico)
        if (widget.lead!.crmEtapa != _etapa) {
          await notifier.moverEtapa(widget.lead!.id, _etapa);
        }
      } else {
        await notifier.criar(data);
      }
      if (!mounted) return;
      Navigator.of(context).pop(true);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erro: $e'), backgroundColor: _D.danger),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _delete() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: _D.bg,
        title: Text('Excluir lead?', style: TextStyle(color: _D.text)),
        content: Text(
          'Esta ação não pode ser desfeita. Lead "${widget.lead!.nome}" será removido.',
          style: TextStyle(color: _D.textSec),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text('Cancelar', style: TextStyle(color: _D.textMuted)),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: _D.danger),
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Excluir'),
          ),
        ],
      ),
    );
    if (confirm != true) return;
    setState(() => _deleting = true);
    try {
      await ref.read(leadsProvider.notifier).deletar(widget.lead!.id);
      if (!mounted) return;
      Navigator.of(context).pop(true);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erro ao excluir: $e'), backgroundColor: _D.danger),
        );
      }
    } finally {
      if (mounted) setState(() => _deleting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Theme(
      data: ThemeData.dark(useMaterial3: true).copyWith(
        scaffoldBackgroundColor: _D.bg,
        textTheme: GoogleFonts.interTextTheme(ThemeData.dark().textTheme),
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(24, 24, 24, 18),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    _isEdit ? 'Editar lead' : 'Novo lead',
                    style: GoogleFonts.inter(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: _D.text,
                      letterSpacing: -0.3,
                    ),
                  ),
                ),
                IconButton(
                  icon: Icon(Icons.close, color: _D.textMuted),
                  onPressed: () => Navigator.of(context).pop(false),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Flexible(
              child: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    _Field(label: 'Nome do lead *', controller: _nome, validator: FormValidators.required()),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(child: _Field(label: 'Cidade', controller: _cidade)),
                        const SizedBox(width: 10),
                        SizedBox(width: 90, child: _Field(label: 'UF', controller: _estado)),
                      ],
                    ),
                    const SizedBox(height: 12),
                    _Dropdown(label: 'Etapa', value: _etapa, items: _STAGE_OPTS, onChanged: (v) => setState(() => _etapa = v ?? 'lead_novo')),
                    const SizedBox(height: 12),
                    _Field(label: 'Responsável', controller: _responsavel),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(child: _Field(label: 'Origem', controller: _origem, hint: 'ex: bio_cliente, indicação, outbound')),

                        const SizedBox(width: 10),
                        Expanded(child: _Field(label: 'Valor (R\$)', controller: _valor, keyboard: TextInputType.number, validator: FormValidators.nonNegativeNumber)),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(child: _Field(label: 'E-mail', controller: _email, keyboard: TextInputType.emailAddress, validator: FormValidators.email)),
                        const SizedBox(width: 10),
                        Expanded(child: _Field(label: 'WhatsApp', controller: _whatsapp, keyboard: TextInputType.phone, validator: FormValidators.telefoneBr)),
                      ],
                    ),
                    if (_extras.isNotEmpty) ...[
                      const SizedBox(height: 18),
                      _BioFormFields(extras: _extras),
                    ],
                    const SizedBox(height: 12),
                    _Field(label: 'Anotações do operador', controller: _observacoes, multiline: true),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 18),
            Row(
              children: [
                if (_isEdit)
                  TextButton.icon(
                    onPressed: _deleting ? null : _delete,
                    icon: _deleting
                        ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: _D.danger))
                        : Icon(Icons.delete_outline, size: 16, color: _D.danger),
                    label: Text('Excluir', style: TextStyle(color: _D.danger)),
                  ),
                const Spacer(),
                TextButton(
                  onPressed: _saving ? null : () => Navigator.of(context).pop(false),
                  child: Text('Cancelar', style: TextStyle(color: _D.textMuted)),
                ),
                const SizedBox(width: 8),
                FilledButton.icon(
                  onPressed: _saving ? null : _save,
                  style: FilledButton.styleFrom(backgroundColor: _D.primary, foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12)),
                  icon: _saving
                      ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Icon(Icons.check, size: 16),
                  label: Text(_isEdit ? 'Salvar' : 'Criar'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _Field extends StatelessWidget {
  final String label;
  final TextEditingController controller;
  final String? hint;
  final bool multiline;
  final TextInputType? keyboard;
  final String? Function(String?)? validator;
  const _Field({required this.label, required this.controller, this.hint, this.multiline = false, this.keyboard, this.validator});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: GoogleFonts.inter(fontSize: 11.5, fontWeight: FontWeight.w600, color: _D.textSec, letterSpacing: 0.1)),
        const SizedBox(height: 6),
        TextFormField(
          controller: controller,
          validator: validator,
          autovalidateMode: validator != null ? AutovalidateMode.onUserInteraction : AutovalidateMode.disabled,
          minLines: multiline ? 3 : 1,
          maxLines: multiline ? 5 : 1,
          keyboardType: keyboard,
          cursorColor: _D.primary,
          style: GoogleFonts.inter(fontSize: 13, color: _D.text),
          decoration: InputDecoration(
            isDense: true,
            hintText: hint,
            hintStyle: GoogleFonts.inter(fontSize: 13, color: _D.textMuted),
            filled: true,
            fillColor: _D.input,
            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: BorderSide(color: _D.border),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: BorderSide(color: _D.border),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: BorderSide(color: _D.borderFocus, width: 1.4),
            ),
          ),
        ),
      ],
    );
  }
}

class _Dropdown extends StatelessWidget {
  final String label;
  final String value;
  final List<(String, String)> items;
  final ValueChanged<String?> onChanged;
  const _Dropdown({required this.label, required this.value, required this.items, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: GoogleFonts.inter(fontSize: 11.5, fontWeight: FontWeight.w600, color: _D.textSec, letterSpacing: 0.1)),
        const SizedBox(height: 6),
        Container(
          decoration: BoxDecoration(
            color: _D.input,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: _D.border),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<String>(
              value: items.any((e) => e.$1 == value) ? value : items.first.$1,
              isExpanded: true,
              icon: Icon(Icons.keyboard_arrow_down_rounded, color: _D.textMuted),
              dropdownColor: _D.surface,
              borderRadius: BorderRadius.circular(10),
              style: GoogleFonts.inter(fontSize: 13, color: _D.text),
              onChanged: onChanged,
              items: items.map((e) => DropdownMenuItem(value: e.$1, child: Text(e.$2))).toList(),
            ),
          ),
        ),
      ],
    );
  }
}

/// Renderiza as chaves do dados_extras como campos editáveis agrupados em
/// seções. Cada chave conhecida ganha label humanizado; chaves novas
/// recebem fallback automático. Salvar persiste tudo via dados_extras JSONB.
class _BioFormFields extends StatelessWidget {
  final Map<String, TextEditingController> extras;
  const _BioFormFields({required this.extras});

  static const _LABELS = <String, String>{
    'nome': 'Nome',
    'cidade': 'Cidade',
    'estado': 'Estado',
    'email': 'E-mail',
    'whatsapp': 'WhatsApp',
    'telefone': 'Telefone',
    'segmento': 'Segmento',
    'nicho': 'Nicho',
    'fat_anual': 'Faturamento anual',
    'faturamento': 'Faturamento',
    'fat_estimado': 'Faturamento estimado',
    'situacao': 'Situação atual',
    'experiencia_franquia': 'Experiência c/ franquias',
    'conhece_live_commerce': 'Conhece live commerce',
    'socios': 'Sócios',
    'capital': 'Capital disponível',
    'prazo_inicio': 'Prazo para início',
    'espaco_fisico': 'Espaço físico',
    'horario': 'Melhor horário',
    'atrativos': 'O que mais atrai',
    'receio': 'Principal receio',
    'interesse': 'Nível de interesse',
  };

  static String _humanLabel(String key) =>
      _LABELS[key] ??
      key.split('_').map((p) => p.isEmpty ? p : '${p[0].toUpperCase()}${p.substring(1)}').join(' ');

  // Agrupa chaves em seções pra hierarquia visual
  static const _SECTIONS = <(String, List<String>)>[
    ('IDENTIFICAÇÃO', ['nome', 'cidade', 'estado', 'telefone']),
    ('PERFIL', ['situacao', 'experiencia_franquia', 'conhece_live_commerce', 'socios', 'segmento', 'nicho']),
    ('CAPACIDADE', ['capital', 'fat_anual', 'faturamento', 'fat_estimado', 'prazo_inicio', 'espaco_fisico', 'horario']),
    ('MOTIVAÇÃO', ['atrativos', 'receio', 'interesse']),
  ];

  @override
  Widget build(BuildContext context) {
    if (extras.isEmpty) return const SizedBox.shrink();

    // Distribui chaves em seções; chaves não mapeadas vão pra "OUTROS"
    final allKeys = extras.keys.toList();
    final assigned = <String>{};
    final groupedSections = <({String title, List<String> keys})>[];
    for (final (title, keys) in _SECTIONS) {
      final present = keys.where(allKeys.contains).toList();
      if (present.isNotEmpty) {
        groupedSections.add((title: title, keys: present));
        assigned.addAll(present);
      }
    }
    final outros = allKeys.where((k) => !assigned.contains(k)).toList();
    if (outros.isNotEmpty) {
      groupedSections.add((title: 'OUTROS', keys: outros));
    }

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: _D.input,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: _D.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'Dados do formulário',
            style: GoogleFonts.inter(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: _D.text,
              letterSpacing: 0.4,
            ),
          ),
          for (final s in groupedSections) ...[
            const SizedBox(height: 12),
            Text(
              s.title,
              style: GoogleFonts.inter(
                fontSize: 10,
                fontWeight: FontWeight.w800,
                color: _D.primary,
                letterSpacing: 0.8,
              ),
            ),
            const SizedBox(height: 6),
            for (final k in s.keys) ...[
              const SizedBox(height: 8),
              _Field(label: _humanLabel(k), controller: extras[k]!),
            ],
          ],
        ],
      ),
    );
  }
}

