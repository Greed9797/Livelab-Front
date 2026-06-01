import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../models/lead.dart';

enum FilterOp {
  contains,
  equals,
  notEquals,
  gt,
  gte,
  lt,
  lte,
  isEmpty,
  isNotEmpty,
}

extension FilterOpLabel on FilterOp {
  String get label {
    switch (this) {
      case FilterOp.contains: return 'contém';
      case FilterOp.equals: return '=';
      case FilterOp.notEquals: return '≠';
      case FilterOp.gt: return '>';
      case FilterOp.gte: return '≥';
      case FilterOp.lt: return '<';
      case FilterOp.lte: return '≤';
      case FilterOp.isEmpty: return 'está vazio';
      case FilterOp.isNotEmpty: return 'tem valor';
    }
  }
  bool get needsValue =>
      this != FilterOp.isEmpty && this != FilterOp.isNotEmpty;
}

enum FieldType { text, number, etapa }

class FieldSpec {
  final String key;        // identificador interno
  final String label;      // pt-BR
  final FieldType type;
  final bool isExtra;      // true = procura em lead.dadosExtras
  const FieldSpec({
    required this.key,
    required this.label,
    required this.type,
    this.isExtra = false,
  });
}

const kLeadFields = <FieldSpec>[
  FieldSpec(key: 'nome', label: 'Nome do lead', type: FieldType.text),
  FieldSpec(key: 'cidade', label: 'Cidade', type: FieldType.text),
  FieldSpec(key: 'estado', label: 'Estado', type: FieldType.text),
  FieldSpec(key: 'crm_etapa', label: 'Etapa', type: FieldType.etapa),
  FieldSpec(key: 'origem', label: 'Origem', type: FieldType.text),
  FieldSpec(key: 'responsavel_nome', label: 'Responsável', type: FieldType.text),
  FieldSpec(key: 'valor_oportunidade', label: 'Valor (R\$)', type: FieldType.number),
  FieldSpec(key: 'fat_estimado', label: 'Faturamento estimado', type: FieldType.number),
  FieldSpec(key: 'contato_email', label: 'E-mail', type: FieldType.text),
  FieldSpec(key: 'contato_whatsapp', label: 'WhatsApp', type: FieldType.text),
  // Extras (dados_extras JSONB)
  FieldSpec(key: 'capital', label: 'Capital disponível', type: FieldType.text, isExtra: true),
  FieldSpec(key: 'situacao', label: 'Situação atual', type: FieldType.text, isExtra: true),
  FieldSpec(key: 'experiencia_franquia', label: 'Experiência c/ franquias', type: FieldType.text, isExtra: true),
  FieldSpec(key: 'conhece_live_commerce', label: 'Conhece live commerce', type: FieldType.text, isExtra: true),
  FieldSpec(key: 'socios', label: 'Sócios', type: FieldType.text, isExtra: true),
  FieldSpec(key: 'prazo_inicio', label: 'Prazo para início', type: FieldType.text, isExtra: true),
  FieldSpec(key: 'espaco_fisico', label: 'Espaço físico', type: FieldType.text, isExtra: true),
  FieldSpec(key: 'horario', label: 'Melhor horário', type: FieldType.text, isExtra: true),
  FieldSpec(key: 'interesse', label: 'Nível de interesse', type: FieldType.text, isExtra: true),
  FieldSpec(key: 'atrativos', label: 'Atrativos', type: FieldType.text, isExtra: true),
  FieldSpec(key: 'receio', label: 'Receio', type: FieldType.text, isExtra: true),
  FieldSpec(key: 'segmento', label: 'Segmento', type: FieldType.text, isExtra: true),
  FieldSpec(key: 'fat_anual', label: 'Faturamento anual', type: FieldType.number, isExtra: true),
];

const kEtapaOptions = <(String, String)>[
  ('lead_novo', 'Lead captado'),
  ('contato_iniciado', 'Contato iniciado'),
  ('reuniao_agendada', 'Reunião agendada'),
  ('proposta_enviada', 'Proposta enviada'),
  ('em_negociacao', 'Em negociação'),
  ('aguardando_assinatura', 'Aguardando assinatura'),
  ('ganho', 'Ganho'),
  ('perdido', 'Perdido'),
];

class LeadFilter {
  final String fieldKey;
  final FilterOp op;
  final String value;
  const LeadFilter({required this.fieldKey, required this.op, this.value = ''});

  LeadFilter copyWith({String? fieldKey, FilterOp? op, String? value}) =>
      LeadFilter(
        fieldKey: fieldKey ?? this.fieldKey,
        op: op ?? this.op,
        value: value ?? this.value,
      );

  FieldSpec? get spec {
    for (final f in kLeadFields) {
      if (f.key == fieldKey) return f;
    }
    return null;
  }

  /// Extrai o valor bruto do lead pra esse field. Pode ser String, num, null.
  Object? extract(Lead lead) {
    final s = spec;
    if (s == null) return null;
    if (s.isExtra) {
      final raw = lead.dadosExtras[s.key];
      if (raw is List) return raw.map((e) => e.toString()).join(', ');
      return raw;
    }
    switch (s.key) {
      case 'nome': return lead.nome;
      case 'cidade': return lead.cidade;
      case 'estado': return lead.estado;
      case 'crm_etapa': return lead.crmEtapa;
      case 'origem': return lead.origem;
      case 'responsavel_nome': return lead.responsavelNome;
      case 'valor_oportunidade': return lead.valorOportunidade;
      case 'fat_estimado': return lead.fatEstimado;
      case 'contato_email': return lead.contatoEmail;
      case 'contato_whatsapp': return lead.contatoWhatsapp;
    }
    return null;
  }

  /// Tenta extrair número de uma string ("Até R$ 40.000" → 40000, "80k" → 80000).
  static double? _parseMoney(Object? raw) {
    if (raw == null) return null;
    if (raw is num) return raw.toDouble();
    final s = raw.toString().toLowerCase().replaceAll(RegExp(r'[^\d,.kmKM]'), ' ').trim();
    final tokens = s.split(RegExp(r'\s+')).where((t) => t.isNotEmpty).toList();
    if (tokens.isEmpty) return null;
    // Pega último token (geralmente o número final). Suporta sufixo "k" e "m".
    final last = tokens.last;
    final mult = last.endsWith('m') ? 1000000 : last.endsWith('k') ? 1000 : 1;
    final clean = last.replaceAll(RegExp(r'[km]'), '').replaceAll(',', '.');
    final dotted = clean.split('.');
    final normalized = dotted.length > 1 && dotted.last.length == 3
        ? dotted.join('') // 40.000 → 40000
        : clean;
    final n = double.tryParse(normalized);
    return n == null ? null : n * mult;
  }

  bool matches(Lead lead) {
    final raw = extract(lead);
    final s = spec;
    final isNum = s?.type == FieldType.number ||
        op == FilterOp.gt ||
        op == FilterOp.gte ||
        op == FilterOp.lt ||
        op == FilterOp.lte;

    switch (op) {
      case FilterOp.isEmpty:
        if (raw == null) return true;
        return raw.toString().trim().isEmpty;
      case FilterOp.isNotEmpty:
        if (raw == null) return false;
        return raw.toString().trim().isNotEmpty;
      case FilterOp.contains:
        if (raw == null) return false;
        return raw.toString().toLowerCase().contains(value.toLowerCase());
      case FilterOp.equals:
        if (raw == null) return value.isEmpty;
        return raw.toString().toLowerCase() == value.toLowerCase();
      case FilterOp.notEquals:
        if (raw == null) return value.isNotEmpty;
        return raw.toString().toLowerCase() != value.toLowerCase();
      case FilterOp.gt:
      case FilterOp.gte:
      case FilterOp.lt:
      case FilterOp.lte:
        final n = isNum ? _parseMoney(raw) : double.tryParse(raw?.toString() ?? '');
        final v = double.tryParse(value.replaceAll(',', '.'));
        if (n == null || v == null) return false;
        switch (op) {
          case FilterOp.gt: return n > v;
          case FilterOp.gte: return n >= v;
          case FilterOp.lt: return n < v;
          case FilterOp.lte: return n <= v;
          default: return false;
        }
    }
  }
}

List<Lead> applyFilters(List<Lead> leads, List<LeadFilter> filters) {
  if (filters.isEmpty) return leads;
  return leads.where((l) => filters.every((f) => f.matches(l))).toList();
}

// ─────────────────────────── UI ───────────────────────────

class LeadFilterBuilder extends StatefulWidget {
  final List<LeadFilter> filters;
  final ValueChanged<List<LeadFilter>> onChanged;
  final Color bg;
  final Color border;
  final Color text;
  final Color textMuted;
  final Color primary;

  const LeadFilterBuilder({
    super.key,
    required this.filters,
    required this.onChanged,
    required this.bg,
    required this.border,
    required this.text,
    required this.textMuted,
    required this.primary,
  });

  @override
  State<LeadFilterBuilder> createState() => _LeadFilterBuilderState();
}

class _LeadFilterBuilderState extends State<LeadFilterBuilder> {
  void _add() {
    final next = List<LeadFilter>.of(widget.filters)
      ..add(const LeadFilter(fieldKey: 'nome', op: FilterOp.contains));
    widget.onChanged(next);
  }

  void _remove(int idx) {
    final next = List<LeadFilter>.of(widget.filters)..removeAt(idx);
    widget.onChanged(next);
  }

  void _update(int idx, LeadFilter f) {
    final next = List<LeadFilter>.of(widget.filters);
    next[idx] = f;
    widget.onChanged(next);
  }

  void _clear() => widget.onChanged(const []);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: widget.bg,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: widget.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.filter_alt_outlined, size: 16, color: widget.primary),
              const SizedBox(width: 6),
              Text(
                'Filtros',
                style: GoogleFonts.inter(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: widget.text,
                  letterSpacing: 0.4,
                ),
              ),
              const SizedBox(width: 8),
              if (widget.filters.isNotEmpty)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                  decoration: BoxDecoration(
                    color: widget.primary.withValues(alpha: 0.18),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    '${widget.filters.length} ativo${widget.filters.length == 1 ? '' : 's'}',
                    style: GoogleFonts.inter(
                      fontSize: 10,
                      fontWeight: FontWeight.w700,
                      color: widget.primary,
                    ),
                  ),
                ),
              const Spacer(),
              if (widget.filters.isNotEmpty)
                TextButton.icon(
                  onPressed: _clear,
                  icon: Icon(Icons.close, size: 14, color: widget.textMuted),
                  label: Text(
                    'Limpar',
                    style: TextStyle(color: widget.textMuted, fontSize: 12),
                  ),
                ),
              TextButton.icon(
                onPressed: _add,
                icon: Icon(Icons.add, size: 14, color: widget.primary),
                label: Text(
                  'Adicionar filtro',
                  style: TextStyle(color: widget.primary, fontSize: 12, fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ),
          if (widget.filters.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 4),
              child: Text(
                'Nenhum filtro aplicado. Adicione um filtro pra refinar o pipeline.',
                style: GoogleFonts.inter(fontSize: 11.5, color: widget.textMuted, fontStyle: FontStyle.italic),
              ),
            )
          else
            for (var i = 0; i < widget.filters.length; i++) ...[
              const SizedBox(height: 8),
              _FilterRow(
                index: i,
                filter: widget.filters[i],
                onChanged: (f) => _update(i, f),
                onRemove: () => _remove(i),
                bg: widget.bg,
                border: widget.border,
                text: widget.text,
                textMuted: widget.textMuted,
                primary: widget.primary,
              ),
            ],
        ],
      ),
    );
  }
}

class _FilterRow extends StatelessWidget {
  final int index;
  final LeadFilter filter;
  final ValueChanged<LeadFilter> onChanged;
  final VoidCallback onRemove;
  final Color bg, border, text, textMuted, primary;

  const _FilterRow({
    required this.index,
    required this.filter,
    required this.onChanged,
    required this.onRemove,
    required this.bg,
    required this.border,
    required this.text,
    required this.textMuted,
    required this.primary,
  });

  List<FilterOp> _opsFor(FieldType t) {
    if (t == FieldType.number) {
      return const [
        FilterOp.equals, FilterOp.gt, FilterOp.gte, FilterOp.lt, FilterOp.lte,
        FilterOp.isEmpty, FilterOp.isNotEmpty,
      ];
    }
    if (t == FieldType.etapa) {
      return const [FilterOp.equals, FilterOp.notEquals, FilterOp.isEmpty, FilterOp.isNotEmpty];
    }
    return const [
      FilterOp.contains, FilterOp.equals, FilterOp.notEquals,
      FilterOp.isEmpty, FilterOp.isNotEmpty,
    ];
  }

  @override
  Widget build(BuildContext context) {
    final spec = filter.spec ?? kLeadFields.first;
    final ops = _opsFor(spec.type);
    final op = ops.contains(filter.op) ? filter.op : ops.first;

    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        if (index > 0)
          Padding(
            padding: const EdgeInsets.only(right: 8),
            child: Text(
              'E',
              style: GoogleFonts.inter(
                fontSize: 10,
                fontWeight: FontWeight.w800,
                color: textMuted,
                letterSpacing: 1,
              ),
            ),
          ),
        Expanded(
          flex: 3,
          child: _MiniDropdown<String>(
            value: spec.key,
            items: kLeadFields.map((f) => (f.key, f.label)).toList(),
            onChanged: (k) => onChanged(filter.copyWith(fieldKey: k, value: '')),
            border: border, text: text, primary: primary,
          ),
        ),
        const SizedBox(width: 8),
        SizedBox(
          width: 130,
          child: _MiniDropdown<FilterOp>(
            value: op,
            items: ops.map((o) => (o, o.label)).toList(),
            onChanged: (o) => onChanged(filter.copyWith(op: o)),
            border: border, text: text, primary: primary,
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          flex: 3,
          child: op.needsValue
              ? (spec.type == FieldType.etapa
                  ? _MiniDropdown<String>(
                      value: kEtapaOptions.any((e) => e.$1 == filter.value)
                          ? filter.value
                          : kEtapaOptions.first.$1,
                      items: kEtapaOptions,
                      onChanged: (v) => onChanged(filter.copyWith(value: v)),
                      border: border, text: text, primary: primary,
                    )
                  : _MiniInput(
                      value: filter.value,
                      hint: spec.type == FieldType.number ? '0' : '',
                      onChanged: (v) => onChanged(filter.copyWith(value: v)),
                      keyboard: spec.type == FieldType.number
                          ? const TextInputType.numberWithOptions(decimal: true)
                          : TextInputType.text,
                      border: border, text: text, textMuted: textMuted,
                    ))
              : SizedBox(
                  height: 34,
                  child: Center(
                    child: Text(
                      '—',
                      style: GoogleFonts.inter(color: textMuted, fontSize: 13),
                    ),
                  ),
                ),
        ),
        IconButton(
          tooltip: 'Remover',
          icon: Icon(Icons.close, size: 16, color: textMuted),
          onPressed: onRemove,
        ),
      ],
    );
  }
}

class _MiniDropdown<T> extends StatelessWidget {
  final T value;
  final List<(T, String)> items;
  final ValueChanged<T> onChanged;
  final Color border, text, primary;

  const _MiniDropdown({
    required this.value,
    required this.items,
    required this.onChanged,
    required this.border,
    required this.text,
    required this.primary,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 34,
      padding: const EdgeInsets.symmetric(horizontal: 10),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: border),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<T>(
          value: items.any((e) => e.$1 == value) ? value : items.first.$1,
          isExpanded: true,
          isDense: true,
          icon: Icon(Icons.keyboard_arrow_down_rounded, color: text, size: 18),
          dropdownColor: const Color(0xFF1E1E22),
          borderRadius: BorderRadius.circular(10),
          style: GoogleFonts.inter(fontSize: 12.5, color: text),
          onChanged: (v) { if (v != null) onChanged(v); },
          items: items
              .map((e) => DropdownMenuItem<T>(
                    value: e.$1,
                    child: Text(e.$2, overflow: TextOverflow.ellipsis),
                  ))
              .toList(),
        ),
      ),
    );
  }
}

class _MiniInput extends StatefulWidget {
  final String value;
  final String hint;
  final ValueChanged<String> onChanged;
  final TextInputType keyboard;
  final Color border, text, textMuted;

  const _MiniInput({
    required this.value,
    required this.hint,
    required this.onChanged,
    required this.keyboard,
    required this.border,
    required this.text,
    required this.textMuted,
  });

  @override
  State<_MiniInput> createState() => _MiniInputState();
}

class _MiniInputState extends State<_MiniInput> {
  late final TextEditingController _ctrl;

  @override
  void initState() {
    super.initState();
    _ctrl = TextEditingController(text: widget.value);
  }

  @override
  void didUpdateWidget(covariant _MiniInput old) {
    super.didUpdateWidget(old);
    if (old.value != widget.value && widget.value != _ctrl.text) {
      _ctrl.text = widget.value;
    }
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 34,
      child: TextField(
        controller: _ctrl,
        keyboardType: widget.keyboard,
        onChanged: widget.onChanged,
        style: GoogleFonts.inter(fontSize: 12.5, color: widget.text),
        decoration: InputDecoration(
          isDense: true,
          hintText: widget.hint,
          hintStyle: GoogleFonts.inter(fontSize: 12.5, color: widget.textMuted),
          contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 9),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: BorderSide(color: widget.border),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: BorderSide(color: widget.border),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: BorderSide(color: widget.border),
          ),
        ),
      ),
    );
  }
}
