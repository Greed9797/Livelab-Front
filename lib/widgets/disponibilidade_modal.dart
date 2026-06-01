// Modal de calendário de disponibilidade da apresentadora.
//
// Duas abas:
//   1. Grade Semanal — visão semanal + edição de slots por dia
//   2. Bloqueios     — lista + form de novo bloqueio
//
// Bloqueia fechamento acidental se houver alterações pendentes na grade
// (síntese do conselho — UX).

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

import '../design_system/design_system.dart';
import '../models/apresentadora_bloqueio.dart';
import '../models/disponibilidade_slot.dart';
import '../providers/disponibilidade_provider.dart';
import '../services/api_service.dart';
import 'calendar_week_view.dart';

class DisponibilidadeModal extends ConsumerStatefulWidget {
  final String apresentadoraId;
  final String apresentadoraNome;

  const DisponibilidadeModal({
    super.key,
    required this.apresentadoraId,
    required this.apresentadoraNome,
  });

  static Future<void> open({
    required BuildContext context,
    required String apresentadoraId,
    required String apresentadoraNome,
  }) {
    return showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (_) => Dialog(
        insetPadding: const EdgeInsets.all(AppSpacing.x4),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 920, maxHeight: 760),
          child: DisponibilidadeModal(
            apresentadoraId: apresentadoraId,
            apresentadoraNome: apresentadoraNome,
          ),
        ),
      ),
    );
  }

  @override
  ConsumerState<DisponibilidadeModal> createState() =>
      _DisponibilidadeModalState();
}

class _DisponibilidadeModalState extends ConsumerState<DisponibilidadeModal>
    with SingleTickerProviderStateMixin {
  late final TabController _tabs;
  // Buffer da grade em edição. Inicializado a partir do payload.
  List<DisponibilidadeSlot>? _gradeBuffer;
  bool _gradeDirty = false;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  Future<bool> _confirmClose() async {
    if (!_gradeDirty) return true;
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Descartar alterações?'),
        content: const Text(
            'Você tem alterações na grade que não foram salvas. Deseja descartá-las?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Continuar editando'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Descartar'),
          ),
        ],
      ),
    );
    return ok ?? false;
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(disponibilidadeProvider(widget.apresentadoraId));

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) async {
        if (didPop) return;
        if (await _confirmClose() && context.mounted) {
          Navigator.of(context).pop();
        }
      },
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          _header(context),
          TabBar(
            controller: _tabs,
            labelColor: AppColors.primary,
            indicatorColor: AppColors.primary,
            tabs: const [
              Tab(text: 'Grade Semanal'),
              Tab(text: 'Bloqueios'),
            ],
          ),
          Expanded(
            child: async.when(
              loading: () =>
                  const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(
                child: Text(ApiService.extractErrorMessage(e)),
              ),
              data: (payload) {
                _gradeBuffer ??= List.of(payload.gradeSemanal);
                return TabBarView(
                  controller: _tabs,
                  children: [
                    _GradeTab(
                      payload: payload,
                      buffer: _gradeBuffer!,
                      dirty: _gradeDirty,
                      onChanged: (slots) => setState(() {
                        _gradeBuffer = slots;
                        _gradeDirty = true;
                      }),
                      onSave: () => _salvarGrade(payload),
                      onReset: () => setState(() {
                        _gradeBuffer = List.of(payload.gradeSemanal);
                        _gradeDirty = false;
                      }),
                    ),
                    _BloqueiosTab(
                      apresentadoraId: widget.apresentadoraId,
                      payload: payload,
                    ),
                  ],
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _header(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(AppSpacing.x4),
      child: Row(
        children: [
          Icon(PhosphorIcons.calendarBlank(),
              color: AppColors.primary, size: 22),
          const SizedBox(width: AppSpacing.x3),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text('Disponibilidade', style: AppTypography.h3),
                Text(
                  widget.apresentadoraNome,
                  style: AppTypography.caption
                      .copyWith(color: AppColors.textMuted),
                ),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.close),
            onPressed: () async {
              if (await _confirmClose() && context.mounted) {
                Navigator.of(context).pop();
              }
            },
          ),
        ],
      ),
    );
  }

  Future<void> _salvarGrade(DisponibilidadePayload payload) async {
    try {
      await ref
          .read(disponibilidadeProvider(widget.apresentadoraId).notifier)
          .salvarGrade(_gradeBuffer ?? const []);
      setState(() => _gradeDirty = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Grade salva.')),
        );
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(ApiService.extractErrorMessage(e))),
      );
    }
  }
}

// ─── Aba 1: Grade Semanal ────────────────────────────────────────────────
class _GradeTab extends StatelessWidget {
  final DisponibilidadePayload payload;
  final List<DisponibilidadeSlot> buffer;
  final bool dirty;
  final ValueChanged<List<DisponibilidadeSlot>> onChanged;
  final VoidCallback onSave;
  final VoidCallback onReset;

  const _GradeTab({
    required this.payload,
    required this.buffer,
    required this.dirty,
    required this.onChanged,
    required this.onSave,
    required this.onReset,
  });

  @override
  Widget build(BuildContext context) {
    // Paywall vislumbre da semana atual (com lives e bloqueios reais).
    final previewPayload = DisponibilidadePayload(
      gradeSemanal: buffer,
      bloqueios: payload.bloqueios,
      livesAgendadas: payload.livesAgendadas,
    );
    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppSpacing.x4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CalendarWeekView(
            payload: previewPayload,
            semanaReferencia: DateTime.now(),
          ),
          const SizedBox(height: AppSpacing.x5),
          Text('Slots por dia',
              style: AppTypography.bodyLarge
                  .copyWith(fontWeight: FontWeight.w700)),
          const SizedBox(height: AppSpacing.x2),
          for (var dow = 0; dow < 7; dow++)
            _DiaEditor(
              dia: dow,
              slots:
                  buffer.where((s) => s.diaSemana == dow).toList(growable: false),
              onAdd: () => _addSlot(context, dow),
              onRemove: (slot) {
                final novo = List<DisponibilidadeSlot>.of(buffer)..remove(slot);
                onChanged(novo);
              },
            ),
          const SizedBox(height: AppSpacing.x4),
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              if (dirty)
                AppSecondaryButton(
                  label: 'Descartar',
                  onPressed: onReset,
                ),
              const SizedBox(width: AppSpacing.x2),
              AppPrimaryButton(
                label: 'Salvar grade',
                onPressed: dirty ? onSave : null,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Future<void> _addSlot(BuildContext context, int dow) async {
    final inicio = await showTimePicker(
      context: context,
      initialTime: const TimeOfDay(hour: 9, minute: 0),
      helpText: 'Início — ${DisponibilidadeSlot.diasSemanaLong[dow]}',
    );
    if (inicio == null) return;
    if (!context.mounted) return;
    final fim = await showTimePicker(
      context: context,
      initialTime: TimeOfDay(hour: (inicio.hour + 1) % 24, minute: 0),
      helpText: 'Fim — ${DisponibilidadeSlot.diasSemanaLong[dow]}',
    );
    if (fim == null) return;

    final hi = _format(inicio);
    final hf = _format(fim);
    if (hf.compareTo(hi) <= 0) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Hora fim deve ser maior que início.')),
        );
      }
      return;
    }
    final novo = List<DisponibilidadeSlot>.of(buffer)
      ..add(DisponibilidadeSlot(
          diaSemana: dow, horaInicio: hi, horaFim: hf));
    novo.sort((a, b) {
      final c = a.diaSemana.compareTo(b.diaSemana);
      return c != 0 ? c : a.horaInicio.compareTo(b.horaInicio);
    });
    onChanged(novo);
  }

  static String _format(TimeOfDay t) =>
      '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';
}

class _DiaEditor extends StatelessWidget {
  final int dia;
  final List<DisponibilidadeSlot> slots;
  final VoidCallback onAdd;
  final ValueChanged<DisponibilidadeSlot> onRemove;

  const _DiaEditor({
    required this.dia,
    required this.slots,
    required this.onAdd,
    required this.onRemove,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.x2),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 80,
            child: Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(
                DisponibilidadeSlot.diasSemanaLong[dia],
                style: AppTypography.bodySmall
                    .copyWith(fontWeight: FontWeight.w600),
              ),
            ),
          ),
          Expanded(
            child: Wrap(
              spacing: AppSpacing.x2,
              runSpacing: AppSpacing.x2,
              children: [
                for (final s in slots)
                  Chip(
                    label: Text('${s.horaInicio} – ${s.horaFim}'),
                    onDeleted: () => onRemove(s),
                    deleteIconColor: AppColors.danger,
                  ),
                ActionChip(
                  avatar: Icon(PhosphorIcons.plus(), size: 14),
                  label: const Text('Adicionar slot'),
                  onPressed: onAdd,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Aba 2: Bloqueios ────────────────────────────────────────────────────
class _BloqueiosTab extends ConsumerStatefulWidget {
  final String apresentadoraId;
  final DisponibilidadePayload payload;

  const _BloqueiosTab({
    required this.apresentadoraId,
    required this.payload,
  });

  @override
  ConsumerState<_BloqueiosTab> createState() => _BloqueiosTabState();
}

class _BloqueiosTabState extends ConsumerState<_BloqueiosTab> {
  static final _df = DateFormat("dd/MM/yyyy 'às' HH:mm");

  @override
  Widget build(BuildContext context) {
    final bloqueios = widget.payload.bloqueios;
    return Padding(
      padding: const EdgeInsets.all(AppSpacing.x4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text('Bloqueios pontuais',
                    style: AppTypography.bodyLarge
                        .copyWith(fontWeight: FontWeight.w700)),
              ),
              AppPrimaryButton(
                label: 'Adicionar bloqueio',
                icon: Icons.add,
                onPressed: _adicionar,
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.x3),
          Expanded(
            child: bloqueios.isEmpty
                ? Center(
                    child: Text(
                      'Nenhum bloqueio cadastrado.',
                      style: AppTypography.bodyMedium
                          .copyWith(color: AppColors.textMuted),
                    ),
                  )
                : ListView.separated(
                    itemCount: bloqueios.length,
                    separatorBuilder: (_, __) =>
                        const SizedBox(height: AppSpacing.x2),
                    itemBuilder: (_, i) => _bloqueioCard(bloqueios[i]),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _bloqueioCard(ApresentadoraBloqueio b) {
    return AppCard(
      padding: const EdgeInsets.all(AppSpacing.x3),
      child: Row(
        children: [
          Icon(PhosphorIcons.calendarX(), color: AppColors.danger),
          const SizedBox(width: AppSpacing.x3),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${_df.format(b.dataInicio)} → ${_df.format(b.dataFim)}',
                  style: AppTypography.bodyMedium
                      .copyWith(fontWeight: FontWeight.w600),
                ),
                if ((b.motivo ?? '').isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 2),
                    child: Text(
                      b.motivo!,
                      style: AppTypography.caption
                          .copyWith(color: AppColors.textMuted),
                    ),
                  ),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.delete_outline),
            color: AppColors.danger,
            onPressed: () => _remover(b),
          ),
        ],
      ),
    );
  }

  Future<void> _adicionar() async {
    final hoje = DateTime.now();
    final range = await showDateRangePicker(
      context: context,
      firstDate: hoje.subtract(const Duration(days: 1)),
      lastDate: hoje.add(const Duration(days: 365)),
      helpText: 'Período do bloqueio',
    );
    if (range == null) return;
    if (!mounted) return;
    final motivoCtrl = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Motivo (opcional)'),
        content: TextField(
          controller: motivoCtrl,
          decoration: const InputDecoration(
            hintText: 'ex: Férias, atestado médico…',
          ),
          autofocus: true,
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancelar')),
          FilledButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Confirmar')),
        ],
      ),
    );
    if (ok != true) return;

    final inicio = DateTime(range.start.year, range.start.month,
        range.start.day, 0, 0, 0);
    final fim = DateTime(
        range.end.year, range.end.month, range.end.day, 23, 59, 59);

    try {
      await ref
          .read(disponibilidadeProvider(widget.apresentadoraId).notifier)
          .adicionarBloqueio(
            dataInicio: inicio,
            dataFim: fim,
            motivo: motivoCtrl.text,
          );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Bloqueio adicionado.')),
        );
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(ApiService.extractErrorMessage(e))),
      );
    }
  }

  Future<void> _remover(ApresentadoraBloqueio b) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Remover bloqueio?'),
        content: Text(
            'Bloqueio de ${_df.format(b.dataInicio)} a ${_df.format(b.dataFim)} será excluído.'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancelar')),
          FilledButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Remover')),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await ref
          .read(disponibilidadeProvider(widget.apresentadoraId).notifier)
          .removerBloqueio(b.id);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(ApiService.extractErrorMessage(e))),
      );
    }
  }
}
