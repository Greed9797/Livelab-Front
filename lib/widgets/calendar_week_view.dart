// Visão semanal de disponibilidade da apresentadora.
//
// Renderiza 7 colunas (Dom-Sáb) × slots de 1h (default 8h-22h).
// Cada célula é colorida por estado:
//   verde  → dentro da grade, sem bloqueio nem live
//   cinza  → fora da grade
//   vermelho → bloqueio pontual sobreposto
//   azul   → live agendada/em andamento
//
// Cálculo é client-side somente para *visualização*. O check de conflito
// real ao agendar live continua sendo server-side via /v1/disponibilidade/check.

import 'package:flutter/material.dart';

import '../design_system/design_system.dart';
import '../models/disponibilidade_slot.dart';
import '../providers/disponibilidade_provider.dart';

enum _SlotState { foraGrade, disponivel, bloqueado, comLive }

class CalendarWeekView extends StatelessWidget {
  final DisponibilidadePayload payload;
  final DateTime semanaReferencia; // qualquer data dentro da semana exibida
  final int horaInicio;
  final int horaFim;

  const CalendarWeekView({
    super.key,
    required this.payload,
    required this.semanaReferencia,
    this.horaInicio = 8,
    this.horaFim = 22,
  });

  /// Domingo da semana de [semanaReferencia].
  DateTime get _domingo {
    final ref = DateTime(
      semanaReferencia.year,
      semanaReferencia.month,
      semanaReferencia.day,
    );
    // Dart: DateTime.weekday → 1=Mon … 7=Sun. Convertemos pra 0=Sun.
    final dow = ref.weekday % 7;
    return ref.subtract(Duration(days: dow));
  }

  _SlotState _stateFor(DateTime cellStart, DateTime cellEnd) {
    final dow = cellStart.weekday % 7; // 0=Sun ... 6=Sat
    final cellInicio = '${cellStart.hour.toString().padLeft(2, '0')}:00';
    final cellFim = '${cellEnd.hour.toString().padLeft(2, '0')}:00';

    final emGrade = payload.gradeSemanal.any((s) =>
        s.diaSemana == dow &&
        _timeLte(s.horaInicio, cellInicio) &&
        _timeGte(s.horaFim, cellFim));

    final temBloqueio = payload.bloqueios.any((b) =>
        b.dataInicio.isBefore(cellEnd) && b.dataFim.isAfter(cellStart));

    final temLive = payload.livesAgendadas.any((l) {
      final fim = l.dataFim ?? l.dataInicio.add(const Duration(hours: 4));
      return l.dataInicio.isBefore(cellEnd) && fim.isAfter(cellStart);
    });

    if (temLive) return _SlotState.comLive;
    if (temBloqueio) return _SlotState.bloqueado;
    if (emGrade) return _SlotState.disponivel;
    return _SlotState.foraGrade;
  }

  static bool _timeLte(String a, String b) => a.compareTo(b) <= 0;
  static bool _timeGte(String a, String b) => a.compareTo(b) >= 0;

  @override
  Widget build(BuildContext context) {
    final dom = _domingo;
    final hours = List.generate(horaFim - horaInicio, (i) => horaInicio + i);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.x3, vertical: AppSpacing.x2),
          decoration: BoxDecoration(
            color: AppColors.warningBg,
            borderRadius: BorderRadius.circular(AppRadius.sm),
          ),
          child: Row(
            children: [
              const Icon(Icons.info_outline, size: 16, color: AppColors.warning),
              const SizedBox(width: AppSpacing.x2),
              Expanded(
                child: Text(
                  'Horários exibidos no fuso local do navegador.',
                  style: AppTypography.caption.copyWith(color: AppColors.warning),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.x3),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: ConstrainedBox(
            constraints: const BoxConstraints(minWidth: 720),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _headerRow(context, dom),
                const SizedBox(height: 4),
                for (final h in hours) _hourRow(context, dom, h),
                const SizedBox(height: AppSpacing.x3),
                _legenda(context),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _headerRow(BuildContext context, DateTime dom) {
    final theme = Theme.of(context);
    return Row(
      children: [
        const SizedBox(width: 56),
        for (var i = 0; i < 7; i++)
          Expanded(
            child: Container(
              padding: const EdgeInsets.symmetric(vertical: 6),
              alignment: Alignment.center,
              child: Column(
                children: [
                  Text(
                    DisponibilidadeSlot.diasSemanaShort[i],
                    style: AppTypography.caption.copyWith(
                      fontWeight: FontWeight.w700,
                      color: theme.colorScheme.onSurface,
                    ),
                  ),
                  Text(
                    '${dom.add(Duration(days: i)).day}',
                    style: AppTypography.bodySmall.copyWith(
                      color: AppColors.textMuted,
                    ),
                  ),
                ],
              ),
            ),
          ),
      ],
    );
  }

  Widget _hourRow(BuildContext context, DateTime dom, int hour) {
    return Row(
      children: [
        SizedBox(
          width: 56,
          child: Padding(
            padding: const EdgeInsets.only(right: 4),
            child: Text(
              '${hour.toString().padLeft(2, '0')}:00',
              style: AppTypography.caption
                  .copyWith(color: AppColors.textMuted),
              textAlign: TextAlign.right,
            ),
          ),
        ),
        for (var i = 0; i < 7; i++)
          Expanded(child: _cell(context, dom.add(Duration(days: i)), hour)),
      ],
    );
  }

  Widget _cell(BuildContext context, DateTime day, int hour) {
    final start = DateTime(day.year, day.month, day.day, hour);
    final end = start.add(const Duration(hours: 1));
    final state = _stateFor(start, end);

    final color = switch (state) {
      _SlotState.foraGrade => AppColors.bgMuted,
      _SlotState.disponivel => AppColors.success.withValues(alpha: 0.18),
      _SlotState.bloqueado => AppColors.danger.withValues(alpha: 0.25),
      _SlotState.comLive => AppColors.info.withValues(alpha: 0.25),
    };

    return Container(
      height: 28,
      margin: const EdgeInsets.all(1),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(4),
      ),
    );
  }

  Widget _legenda(BuildContext context) {
    return Wrap(
      spacing: AppSpacing.x4,
      runSpacing: AppSpacing.x2,
      children: [
        _legendaItem(AppColors.success.withValues(alpha: 0.45), 'Disponível'),
        _legendaItem(AppColors.bgMuted, 'Fora da grade'),
        _legendaItem(AppColors.danger.withValues(alpha: 0.5), 'Bloqueio'),
        _legendaItem(AppColors.info.withValues(alpha: 0.5), 'Live agendada'),
      ],
    );
  }

  Widget _legendaItem(Color color, String label) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 12,
          height: 12,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(2),
          ),
        ),
        const SizedBox(width: 6),
        Text(label, style: AppTypography.caption),
      ],
    );
  }
}

/// Helper: avalia "está disponível AGORA?" client-side.
/// Retorna texto curto ("Disponível agora" / "Indisponível") + cor.
({String label, Color color}) avaliarDisponibilidadeAgora(
    DisponibilidadePayload payload) {
  final now = DateTime.now();
  final dow = now.weekday % 7;
  final hhmm =
      '${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}';

  final emGrade = payload.gradeSemanal.any((s) =>
      s.diaSemana == dow &&
      s.horaInicio.compareTo(hhmm) <= 0 &&
      s.horaFim.compareTo(hhmm) > 0);
  final temBloqueio = payload.bloqueios
      .any((b) => b.dataInicio.isBefore(now) && b.dataFim.isAfter(now));
  final emLive = payload.livesAgendadas.any((l) {
    final fim = l.dataFim ?? l.dataInicio.add(const Duration(hours: 4));
    return l.dataInicio.isBefore(now) && fim.isAfter(now);
  });

  if (emLive) {
    return (label: 'Em live', color: AppColors.info);
  }
  if (temBloqueio) {
    return (label: 'Indisponível', color: AppColors.danger);
  }
  if (emGrade) {
    return (label: 'Disponível agora', color: AppColors.success);
  }
  return (label: 'Fora do expediente', color: AppColors.textMuted);
}

