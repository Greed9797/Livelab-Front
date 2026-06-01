import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

import '../../design_system/app_colors.dart';
import '../../design_system/app_colors_theme.dart';
import '../../design_system/app_components.dart';
import '../../design_system/app_screen_scaffold.dart';
import '../../design_system/app_tokens.dart';
import '../../design_system/app_typography.dart';
import '../../providers/cliente_agenda_provider.dart';
import '../../routes/app_routes.dart';
import '../../services/api_service.dart';
import '../../widgets/skeleton_list.dart';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const _kTimeStart = 8 * 60; // 08:00 in minutes from midnight
const _kTimeEnd = 22 * 60; // 22:00
const _kStep = 30; // 30-min slots
const _kCellW = 88.0;
const _kCellH = 48.0;
const _kTimeColW = 56.0;

String _fmt2(int n) => n.toString().padLeft(2, '0');

String _cellTimeLabel(int minuteOfDay) =>
    '${_fmt2(minuteOfDay ~/ 60)}:${_fmt2(minuteOfDay % 60)}';

/// Returns true if slot covers [cellMinute, cellMinute+30)
bool _slotCoversCell(AgendaSlot slot, String data, int cellMinute) {
  if (slot.data != data) return false;
  final startParts = slot.horaInicio.split(':');
  final endParts = slot.horaFim.split(':');
  if (startParts.length < 2 || endParts.length < 2) return false;
  final slotStart = int.parse(startParts[0]) * 60 + int.parse(startParts[1]);
  final slotEnd = int.parse(endParts[0]) * 60 + int.parse(endParts[1]);
  return cellMinute >= slotStart && cellMinute < slotEnd;
}

String _fmtDate(DateTime d) =>
    '${d.year.toString().padLeft(4, '0')}-'
    '${d.month.toString().padLeft(2, '0')}-'
    '${d.day.toString().padLeft(2, '0')}';

String _dateLabel(DateTime d) {
  final df = DateFormat('dd/MM', 'pt_BR');
  return df.format(d);
}

String _dateLabelFull(DateTime d) {
  final df = DateFormat("dd/MM/yyyy (EEEE)", 'pt_BR');
  return df.format(d);
}

String _weekdayShort(DateTime d) {
  const labels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  return labels[d.weekday - 1];
}

String _addMinutes(String hhmm, int minutes) {
  final parts = hhmm.split(':');
  final totalMin = int.parse(parts[0]) * 60 + int.parse(parts[1]) + minutes;
  final h = (totalMin ~/ 60).clamp(0, 23);
  final m = totalMin % 60;
  return '${_fmt2(h)}:${_fmt2(m)}';
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────────────────────────────────────

class ClienteAgendaScreen extends ConsumerWidget {
  const ClienteAgendaScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return AppScreenScaffold(
      currentRoute: AppRoutes.clienteAgenda,
      eyebrow: 'AGENDA',
      title: 'Minha Agenda',
      actions: [
        IconButton(
          tooltip: 'Atualizar',
          onPressed: () => ref.read(clienteAgendaProvider.notifier).refresh(),
          icon: Icon(
            PhosphorIcons.arrowClockwise(),
            color: context.colors.textSecondary,
          ),
        ),
      ],
      child: const ClienteAgendaBody(),
    );
  }
}

// Body reusável em tabs externas
class ClienteAgendaBody extends ConsumerStatefulWidget {
  const ClienteAgendaBody({super.key});

  @override
  ConsumerState<ClienteAgendaBody> createState() => _ClienteAgendaBodyState();
}

class _ClienteAgendaBodyState extends ConsumerState<ClienteAgendaBody> {
  late DateTime _selectedDay;

  @override
  void initState() {
    super.initState();
    _selectedDay = DateTime.now();
  }

  void _prevWeek() {
    final agendaAsync = ref.read(clienteAgendaProvider);
    final currentMonday =
        agendaAsync.valueOrNull?.semanaInicio ?? DateTime.now();
    final prevMonday = currentMonday.subtract(const Duration(days: 7));
    ref.read(clienteAgendaProvider.notifier).fetchSemana(prevMonday);
    setState(() {
      _selectedDay = prevMonday;
    });
  }

  void _nextWeek() {
    final agendaAsync = ref.read(clienteAgendaProvider);
    final currentMonday =
        agendaAsync.valueOrNull?.semanaInicio ?? DateTime.now();
    final nextMonday = currentMonday.add(const Duration(days: 7));
    ref.read(clienteAgendaProvider.notifier).fetchSemana(nextMonday);
    setState(() {
      _selectedDay = nextMonday;
    });
  }

  @override
  Widget build(BuildContext context) {
    final agendaAsync = ref.watch(clienteAgendaProvider);

    return Stack(
        children: [
          Column(
            children: [
              _WeekNavigator(
                agendaAsync: agendaAsync,
                onPrev: _prevWeek,
                onNext: _nextWeek,
              ),
              agendaAsync.when(
                loading: () => _DayTabs(
                  semanaInicio: agendaAsync.valueOrNull?.semanaInicio ??
                      _mondayOf(DateTime.now()),
                  selectedDay: _selectedDay,
                  onDaySelected: (d) => setState(() => _selectedDay = d),
                ),
                error: (_, __) => const SizedBox.shrink(),
                data: (state) => _DayTabs(
                  semanaInicio: state.semanaInicio,
                  selectedDay: _selectedDay,
                  onDaySelected: (d) => setState(() => _selectedDay = d),
                ),
              ),
              Expanded(
                child: agendaAsync.when(
                  loading: () => const SkeletonList(itemCount: 4, itemHeight: 100),
                  error: (error, _) => _ErrorView(
                    message: ApiService.extractErrorMessage(error),
                    onRetry: () =>
                        ref.read(clienteAgendaProvider.notifier).refresh(),
                  ),
                  data: (state) => _AgendaGrid(
                    cabines: state.cabines,
                    slots: state.slots,
                    selectedDay: _selectedDay,
                    semanaInicio: state.semanaInicio,
                    onTapLivre: (cabineId, cabineNumero, data, horaInicio) {
                      _openBottomSheet(
                        context,
                        cabineId: cabineId,
                        cabineNumero: cabineNumero,
                        data: data,
                        horaInicio: horaInicio,
                      );
                    },
                  ),
                ),
              ),
            ],
          ),
          Positioned(
            bottom: AppSpacing.x6,
            right: AppSpacing.x6,
            child: FloatingActionButton.extended(
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text(
                        'Toque em um horário livre na agenda para solicitar uma live.'),
                    duration: Duration(seconds: 3),
                  ),
                );
              },
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              icon: Icon(PhosphorIcons.plus()),
              label: const Text(
                'Solicitar nova live',
                style: TextStyle(fontWeight: FontWeight.w700),
              ),
            ),
          ),
        ],
      );
  }

  void _openBottomSheet(
    BuildContext context, {
    required String cabineId,
    required int cabineNumero,
    required String data,
    required String horaInicio,
  }) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: context.colors.bgCard,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadius.lg)),
      ),
      builder: (_) => _NovaLiveBottomSheet(
        cabineId: cabineId,
        cabineNumero: cabineNumero,
        data: data,
        horaInicio: horaInicio,
        onSuccess: () {
          ref.read(clienteAgendaProvider.notifier).refresh();
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text(
                  'Solicitacao enviada! A unidade ira confirmar em breve.'),
              backgroundColor: AppColors.success,
              duration: Duration(seconds: 4),
            ),
          );
        },
        onConflict: () {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text(
                  'Horario indisponivel. Escolha outro horario ou cabine.'),
              backgroundColor: AppColors.danger,
              duration: Duration(seconds: 4),
            ),
          );
        },
        onError: (msg) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(msg),
              backgroundColor: AppColors.danger,
              duration: const Duration(seconds: 4),
            ),
          );
        },
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Monday helper (duplicated for screen-local use)
// ─────────────────────────────────────────────────────────────────────────────

DateTime _mondayOf(DateTime date) {
  final day = date.weekday;
  return DateTime(date.year, date.month, date.day - (day - 1));
}

// ─────────────────────────────────────────────────────────────────────────────
// Week Navigator
// ─────────────────────────────────────────────────────────────────────────────

class _WeekNavigator extends StatelessWidget {
  final AsyncValue<AgendaState> agendaAsync;
  final VoidCallback onPrev;
  final VoidCallback onNext;

  const _WeekNavigator({
    required this.agendaAsync,
    required this.onPrev,
    required this.onNext,
  });

  @override
  Widget build(BuildContext context) {
    final monday = agendaAsync.valueOrNull?.semanaInicio ?? _mondayOf(DateTime.now());
    final sunday = monday.add(const Duration(days: 6));

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.x4,
        vertical: AppSpacing.x2,
      ),
      decoration: BoxDecoration(
        color: context.colors.bgCard,
        border: Border(
          bottom: BorderSide(color: context.colors.borderSubtle),
        ),
      ),
      child: Row(
        children: [
          AppGhostButton(
            label: 'Anterior',
            onPressed: onPrev,
            icon: Icons.chevron_left,
          ),
          Expanded(
            child: Text(
              'Semana de ${_dateLabel(monday)} a ${_dateLabel(sunday)}',
              textAlign: TextAlign.center,
              style: AppTypography.bodySmall.copyWith(
                fontWeight: FontWeight.w700,
                color: context.colors.textPrimary,
              ),
            ),
          ),
          AppGhostButton(
            label: 'Proxima',
            onPressed: onNext,
            icon: Icons.chevron_right,
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Day Tabs
// ─────────────────────────────────────────────────────────────────────────────

class _DayTabs extends StatelessWidget {
  final DateTime semanaInicio;
  final DateTime selectedDay;
  final ValueChanged<DateTime> onDaySelected;

  const _DayTabs({
    required this.semanaInicio,
    required this.selectedDay,
    required this.onDaySelected,
  });

  @override
  Widget build(BuildContext context) {
    final days = List.generate(7, (i) => semanaInicio.add(Duration(days: i)));
    final selectedFmt = _fmtDate(selectedDay);

    return Container(
      height: 64,
      decoration: BoxDecoration(
        color: context.colors.bgCard,
        border: Border(
          bottom: BorderSide(color: context.colors.borderSubtle),
        ),
      ),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.x4,
          vertical: AppSpacing.x2,
        ),
        child: Row(
          children: days.map((day) {
            final isSelected = _fmtDate(day) == selectedFmt;
            final isToday = _fmtDate(day) == _fmtDate(DateTime.now());

            return GestureDetector(
              onTap: () => onDaySelected(day),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 150),
                margin: const EdgeInsets.only(right: AppSpacing.x2),
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.x4,
                  vertical: AppSpacing.x1,
                ),
                decoration: BoxDecoration(
                  color: isSelected
                      ? AppColors.primary
                      : isToday
                          ? context.colors.primarySoftBg
                          : context.colors.bgMuted,
                  borderRadius: BorderRadius.circular(AppRadius.full),
                  border: isToday && !isSelected
                      ? Border.all(
                          color: AppColors.primary.withValues(alpha: 0.5))
                      : null,
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      _weekdayShort(day),
                      style: AppTypography.caption.copyWith(
                        fontWeight: FontWeight.w600,
                        color: isSelected
                            ? Colors.white
                            : context.colors.textMuted,
                        fontSize: 11,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      day.day.toString(),
                      style: AppTypography.bodySmall.copyWith(
                        fontWeight: FontWeight.w800,
                        color: isSelected
                            ? Colors.white
                            : context.colors.textPrimary,
                      ),
                    ),
                  ],
                ),
              ),
            );
          }).toList(),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Agenda Grid
// ─────────────────────────────────────────────────────────────────────────────

class _AgendaGrid extends StatelessWidget {
  final List<AgendaCabine> cabines;
  final List<AgendaSlot> slots;
  final DateTime selectedDay;
  final DateTime semanaInicio;
  final void Function(
          String cabineId, int cabineNumero, String data, String horaInicio)
      onTapLivre;

  const _AgendaGrid({
    required this.cabines,
    required this.slots,
    required this.selectedDay,
    required this.semanaInicio,
    required this.onTapLivre,
  });

  @override
  Widget build(BuildContext context) {
    if (cabines.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.x8),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                PhosphorIcons.calendarBlank(),
                size: 56,
                color: context.colors.textMuted,
              ),
              const SizedBox(height: AppSpacing.x4),
              Text(
                'Nenhuma cabine disponivel',
                style: AppTypography.h3.copyWith(
                  color: context.colors.textSecondary,
                ),
              ),
              const SizedBox(height: AppSpacing.x2),
              Text(
                'Nao ha cabines cadastradas para esta semana.',
                style: AppTypography.bodyMedium.copyWith(
                  color: context.colors.textMuted,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      );
    }

    final dateFmt = _fmtDate(selectedDay);
    final timeSlots = <int>[];
    for (int m = _kTimeStart; m < _kTimeEnd; m += _kStep) {
      timeSlots.add(m);
    }

    return SingleChildScrollView(
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header row: time column + one cell per cabine
            _GridHeader(cabines: cabines),
            // Body rows: one row per 30-min slot
            ...timeSlots.map((cellMinute) {
              return _GridRow(
                cellMinute: cellMinute,
                cabines: cabines,
                slots: slots,
                dateFmt: dateFmt,
                onTapLivre: onTapLivre,
              );
            }),
            const SizedBox(height: AppSpacing.x16), // FAB clearance
          ],
        ),
      ),
    );
  }
}

class _GridHeader extends StatelessWidget {
  final List<AgendaCabine> cabines;

  const _GridHeader({required this.cabines});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: context.colors.bgCard,
      child: Row(
        children: [
          // Time column spacer
          SizedBox(
            width: _kTimeColW,
            height: _kCellH,
          ),
          ...cabines.map((c) {
            return Container(
              width: _kCellW,
              height: _kCellH,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                border: Border(
                  left: BorderSide(color: context.colors.borderSubtle),
                  bottom: BorderSide(color: context.colors.borderSubtle),
                ),
              ),
              child: Text(
                'Cabine ${c.numero.toString().padLeft(2, '0')}',
                style: AppTypography.caption.copyWith(
                  fontWeight: FontWeight.w700,
                  color: context.colors.textPrimary,
                  fontSize: 11,
                ),
                textAlign: TextAlign.center,
              ),
            );
          }),
        ],
      ),
    );
  }
}

class _GridRow extends StatelessWidget {
  final int cellMinute;
  final List<AgendaCabine> cabines;
  final List<AgendaSlot> slots;
  final String dateFmt;
  final void Function(
          String cabineId, int cabineNumero, String data, String horaInicio)
      onTapLivre;

  const _GridRow({
    required this.cellMinute,
    required this.cabines,
    required this.slots,
    required this.dateFmt,
    required this.onTapLivre,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        // Time label
        Container(
          width: _kTimeColW,
          height: _kCellH,
          alignment: Alignment.centerRight,
          padding: const EdgeInsets.only(right: AppSpacing.x2),
          decoration: BoxDecoration(
            color: context.colors.bgCard,
            border: Border(
              bottom: BorderSide(
                  color: context.colors.borderSubtle.withValues(alpha: 0.5)),
            ),
          ),
          child: Text(
            _cellTimeLabel(cellMinute),
            style: AppTypography.caption.copyWith(
              color: context.colors.textMuted,
              fontSize: 11,
            ),
          ),
        ),
        // One cell per cabine
        ...cabines.map((cabine) {
          final matchingSlot = slots.firstWhere(
            (s) =>
                s.cabineId == cabine.id &&
                _slotCoversCell(s, dateFmt, cellMinute),
            orElse: () => const AgendaSlot(
              cabineId: '',
              data: '',
              horaInicio: '',
              horaFim: '',
              status: '__livre__',
              isMine: false,
            ),
          );

          final isLivre = matchingSlot.status == '__livre__';
          final horaLabel = _cellTimeLabel(cellMinute);

          return _GridCell(
            slot: isLivre ? null : matchingSlot,
            isLivre: isLivre,
            onTap: isLivre
                ? () => onTapLivre(
                      cabine.id,
                      cabine.numero,
                      dateFmt,
                      horaLabel,
                    )
                : null,
          );
        }),
      ],
    );
  }
}

class _GridCell extends StatelessWidget {
  final AgendaSlot? slot;
  final bool isLivre;
  final VoidCallback? onTap;

  const _GridCell({
    this.slot,
    required this.isLivre,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    Color bgColor;
    Color textColor;
    String label;
    bool tappable = false;

    if (isLivre) {
      bgColor = context.colors.bgMuted;
      textColor = context.colors.textMuted;
      label = '';
      tappable = true;
    } else {
      final s = slot!;
      switch (s.status) {
        case 'ocupado':
          bgColor = context.colors.borderSubtle;
          textColor = context.colors.textMuted;
          label = 'OCUPADO';
          break;
        case 'pendente':
          bgColor = AppColors.warningBg;
          textColor = AppColors.warning;
          label = 'PENDENTE';
          break;
        case 'confirmada':
          bgColor = AppColors.successBg;
          textColor = AppColors.success;
          label = 'CONFIRM.';
          break;
        default:
          bgColor = context.colors.bgMuted;
          textColor = context.colors.textMuted;
          label = '';
      }
    }

    return GestureDetector(
      onTap: tappable ? onTap : null,
      child: Container(
        width: _kCellW,
        height: _kCellH,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: bgColor,
          border: Border(
            left: BorderSide(
                color: context.colors.borderSubtle.withValues(alpha: 0.7)),
            bottom: BorderSide(
                color: context.colors.borderSubtle.withValues(alpha: 0.5)),
          ),
        ),
        child: label.isEmpty
            ? (tappable
                ? Icon(
                    PhosphorIcons.plus(),
                    size: 14,
                    color: context.colors.textMuted.withValues(alpha: 0.5),
                  )
                : null)
            : Text(
                label,
                style: TextStyle(
                  fontSize: 9,
                  fontWeight: FontWeight.w800,
                  color: textColor,
                  letterSpacing: 0.4,
                ),
                textAlign: TextAlign.center,
              ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Error View
// ─────────────────────────────────────────────────────────────────────────────

class _ErrorView extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;

  const _ErrorView({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.x8),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              PhosphorIcons.wifiSlash(),
              size: 48,
              color: context.colors.textMuted,
            ),
            const SizedBox(height: AppSpacing.x4),
            Text(
              message,
              style: AppTypography.bodyMedium.copyWith(
                color: context.colors.textSecondary,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppSpacing.x4),
            AppPrimaryButton(
              label: 'Tentar novamente',
              onPressed: onRetry,
              icon: Icons.refresh,
            ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Bottom Sheet — Nova Live (multi-step)
// ─────────────────────────────────────────────────────────────────────────────

class _NovaLiveBottomSheet extends ConsumerStatefulWidget {
  final String cabineId;
  final int cabineNumero;
  final String data; // "YYYY-MM-DD"
  final String horaInicio; // "HH:mm"
  final VoidCallback onSuccess;
  final VoidCallback onConflict;
  final ValueChanged<String> onError;

  const _NovaLiveBottomSheet({
    required this.cabineId,
    required this.cabineNumero,
    required this.data,
    required this.horaInicio,
    required this.onSuccess,
    required this.onConflict,
    required this.onError,
  });

  @override
  ConsumerState<_NovaLiveBottomSheet> createState() =>
      _NovaLiveBottomSheetState();
}

class _NovaLiveBottomSheetState extends ConsumerState<_NovaLiveBottomSheet> {
  int _step = 0;

  // Step 1
  String? _tipoLive;

  // Step 2
  String? _duracao;
  String? _horaFim;
  static const _duracoes = ['1h30', '2h', '2h30', '3h', '4h', '6h'];
  static const _duracoesMin = [90, 120, 150, 180, 240, 360];

  // Step 3
  final _obsController = TextEditingController();
  bool _submitting = false;

  @override
  void dispose() {
    _obsController.dispose();
    super.dispose();
  }

  void _selectDuracao(int index) {
    final dur = _duracoesMin[index];
    setState(() {
      _duracao = _duracoes[index];
      _horaFim = _addMinutes(widget.horaInicio, dur);
    });
  }

  Future<void> _submit() async {
    if (_submitting) return;
    setState(() => _submitting = true);
    try {
      await ref.read(clienteAgendaProvider.notifier).solicitarLive(
            cabineId: widget.cabineId,
            dataSolicitada: widget.data,
            horaInicio: widget.horaInicio,
            horaFim: _horaFim!,
            tipoLive: _tipoLive!,
            observacoes: _obsController.text.trim().isEmpty
                ? null
                : _obsController.text.trim(),
          );
      if (mounted) Navigator.of(context).pop();
      widget.onSuccess();
    } catch (e) {
      if (mounted) {
        final statusCode = _extractStatusCode(e);
        Navigator.of(context).pop();
        if (statusCode == 409) {
          widget.onConflict();
        } else {
          widget.onError(ApiService.extractErrorMessage(e));
        }
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  int? _extractStatusCode(Object e) {
    // ApiException or DioException carries statusCode
    try {
      final s = e.toString();
      final match = RegExp(r'statusCode[=: ]+(\d+)').firstMatch(s);
      if (match != null) return int.tryParse(match.group(1) ?? '');
    } catch (_) {}
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return Padding(
      padding: EdgeInsets.only(bottom: bottomInset),
      child: Container(
        constraints: BoxConstraints(
          maxHeight: MediaQuery.of(context).size.height * 0.85,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Handle
            Container(
              width: 40,
              height: 4,
              margin: const EdgeInsets.symmetric(vertical: AppSpacing.x3),
              decoration: BoxDecoration(
                color: context.colors.borderStrong,
                borderRadius: BorderRadius.circular(AppRadius.full),
              ),
            ),
            Flexible(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(
                  AppSpacing.x6,
                  0,
                  AppSpacing.x6,
                  AppSpacing.x6,
                ),
                child: AnimatedSwitcher(
                  duration: const Duration(milliseconds: 200),
                  child: _step == 0
                      ? _StepTipo(
                          key: const ValueKey(0),
                          cabineNumero: widget.cabineNumero,
                          data: widget.data,
                          horaInicio: widget.horaInicio,
                          tipoSelecionado: _tipoLive,
                          onTipoChanged: (t) =>
                              setState(() => _tipoLive = t),
                          onNext: () => setState(() => _step = 1),
                        )
                      : _step == 1
                          ? _StepDuracao(
                              key: const ValueKey(1),
                              horaInicio: widget.horaInicio,
                              duracaoSelecionada: _duracao,
                              horaFim: _horaFim,
                              onSelect: _selectDuracao,
                              onNext: () => setState(() => _step = 2),
                              onBack: () => setState(() => _step = 0),
                            )
                          : _StepConfirmacao(
                              key: const ValueKey(2),
                              cabineNumero: widget.cabineNumero,
                              data: widget.data,
                              horaInicio: widget.horaInicio,
                              horaFim: _horaFim ?? '',
                              tipoLive: _tipoLive ?? '',
                              duracao: _duracao ?? '',
                              obsController: _obsController,
                              submitting: _submitting,
                              onBack: () => setState(() => _step = 1),
                              onSubmit: _submit,
                            ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 1 — Tipo de live
// ─────────────────────────────────────────────────────────────────────────────

class _StepTipo extends StatelessWidget {
  final int cabineNumero;
  final String data;
  final String horaInicio;
  final String? tipoSelecionado;
  final ValueChanged<String> onTipoChanged;
  final VoidCallback onNext;

  static const _tipos = [
    'Campanha',
    'Produto especifico',
    'Live recorrente',
    'Live extra',
    'Reagendamento',
  ];

  const _StepTipo({
    super.key,
    required this.cabineNumero,
    required this.data,
    required this.horaInicio,
    required this.tipoSelecionado,
    required this.onTipoChanged,
    required this.onNext,
  });

  String _formatDataDisplay(String iso) {
    try {
      final d = DateTime.parse(iso);
      return _dateLabelFull(d);
    } catch (_) {
      return iso;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Tipo de live',
          style: AppTypography.h3.copyWith(color: context.colors.textPrimary),
        ),
        const SizedBox(height: AppSpacing.x1),
        Text(
          'Cabine ${cabineNumero.toString().padLeft(2, '0')} · ${_formatDataDisplay(data)} as $horaInicio',
          style: AppTypography.caption
              .copyWith(color: context.colors.textSecondary),
        ),
        const SizedBox(height: AppSpacing.x5),
        ..._tipos.map((tipo) {
          final isSelected = tipoSelecionado == tipo;
          return GestureDetector(
            onTap: () => onTipoChanged(tipo),
            child: Container(
              margin: const EdgeInsets.only(bottom: AppSpacing.x2),
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.x4,
                vertical: AppSpacing.x3,
              ),
              decoration: BoxDecoration(
                color: isSelected
                    ? context.colors.primarySoftBg
                    : context.colors.bgMuted,
                borderRadius: BorderRadius.circular(AppRadius.md),
                border: Border.all(
                  color: isSelected
                      ? AppColors.primary.withValues(alpha: 0.6)
                      : context.colors.borderSubtle,
                  width: isSelected ? 1.5 : 1,
                ),
              ),
              child: Row(
                children: [
                  Icon(
                    isSelected
                        ? PhosphorIcons.radioButton()
                        : PhosphorIcons.circle(),
                    size: 20,
                    color: isSelected
                        ? AppColors.primary
                        : context.colors.textMuted,
                  ),
                  const SizedBox(width: AppSpacing.x3),
                  Text(
                    tipo,
                    style: AppTypography.bodyMedium.copyWith(
                      fontWeight:
                          isSelected ? FontWeight.w700 : FontWeight.w400,
                      color: isSelected
                          ? AppColors.primary
                          : context.colors.textPrimary,
                    ),
                  ),
                ],
              ),
            ),
          );
        }),
        const SizedBox(height: AppSpacing.x6),
        AppPrimaryButton(
          label: 'Proximo',
          onPressed: tipoSelecionado != null ? onNext : null,
          fullWidth: true,
        ),
      ],
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 2 — Duracao
// ─────────────────────────────────────────────────────────────────────────────

class _StepDuracao extends StatelessWidget {
  final String horaInicio;
  final String? duracaoSelecionada;
  final String? horaFim;
  final ValueChanged<int> onSelect;
  final VoidCallback onNext;
  final VoidCallback onBack;

  static const _duracoes = ['1h30', '2h', '2h30', '3h', '4h', '6h'];

  const _StepDuracao({
    super.key,
    required this.horaInicio,
    required this.duracaoSelecionada,
    required this.horaFim,
    required this.onSelect,
    required this.onNext,
    required this.onBack,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            IconButton(
              onPressed: onBack,
              icon: Icon(PhosphorIcons.arrowLeft(), size: 20),
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(),
            ),
            const SizedBox(width: AppSpacing.x2),
            Text(
              'Duracao',
              style:
                  AppTypography.h3.copyWith(color: context.colors.textPrimary),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.x5),
        Wrap(
          spacing: AppSpacing.x2,
          runSpacing: AppSpacing.x2,
          children: List.generate(_duracoes.length, (i) {
            final isSelected = duracaoSelecionada == _duracoes[i];
            return GestureDetector(
              onTap: () => onSelect(i),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 120),
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.x5,
                  vertical: AppSpacing.x3,
                ),
                decoration: BoxDecoration(
                  color: isSelected ? AppColors.primary : context.colors.bgMuted,
                  borderRadius: BorderRadius.circular(AppRadius.md),
                  border: Border.all(
                    color: isSelected
                        ? AppColors.primary
                        : context.colors.borderSubtle,
                  ),
                ),
                child: Text(
                  _duracoes[i],
                  style: AppTypography.bodyMedium.copyWith(
                    fontWeight: FontWeight.w700,
                    color:
                        isSelected ? Colors.white : context.colors.textPrimary,
                  ),
                ),
              ),
            );
          }),
        ),
        if (horaFim != null) ...[
          const SizedBox(height: AppSpacing.x4),
          Container(
            padding: const EdgeInsets.all(AppSpacing.x4),
            decoration: BoxDecoration(
              color: AppColors.infoBg,
              borderRadius: BorderRadius.circular(AppRadius.md),
            ),
            child: Row(
              children: [
                Icon(PhosphorIcons.clock(), size: 18, color: AppColors.info),
                const SizedBox(width: AppSpacing.x2),
                Text(
                  'Termino previsto: $horaFim',
                  style: AppTypography.bodySmall.copyWith(
                    fontWeight: FontWeight.w700,
                    color: AppColors.info,
                  ),
                ),
              ],
            ),
          ),
        ],
        const SizedBox(height: AppSpacing.x6),
        AppPrimaryButton(
          label: 'Proximo',
          onPressed: duracaoSelecionada != null ? onNext : null,
          fullWidth: true,
        ),
      ],
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 3 — Confirmacao
// ─────────────────────────────────────────────────────────────────────────────

class _StepConfirmacao extends StatelessWidget {
  final int cabineNumero;
  final String data;
  final String horaInicio;
  final String horaFim;
  final String tipoLive;
  final String duracao;
  final TextEditingController obsController;
  final bool submitting;
  final VoidCallback onBack;
  final VoidCallback onSubmit;

  const _StepConfirmacao({
    super.key,
    required this.cabineNumero,
    required this.data,
    required this.horaInicio,
    required this.horaFim,
    required this.tipoLive,
    required this.duracao,
    required this.obsController,
    required this.submitting,
    required this.onBack,
    required this.onSubmit,
  });

  String _formatDataDisplay(String iso) {
    try {
      final d = DateTime.parse(iso);
      return _dateLabelFull(d);
    } catch (_) {
      return iso;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            IconButton(
              onPressed: onBack,
              icon: Icon(PhosphorIcons.arrowLeft(), size: 20),
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(),
            ),
            const SizedBox(width: AppSpacing.x2),
            Text(
              'Confirmar solicitacao',
              style:
                  AppTypography.h3.copyWith(color: context.colors.textPrimary),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.x4),
        Container(
          padding: const EdgeInsets.all(AppSpacing.x4),
          decoration: BoxDecoration(
            color: context.colors.bgMuted,
            borderRadius: BorderRadius.circular(AppRadius.md),
            border: Border.all(color: context.colors.borderSubtle),
          ),
          child: Column(
            children: [
              _SummaryRow(
                  label: 'Cabine',
                  value:
                      'Cabine ${cabineNumero.toString().padLeft(2, '0')}'),
              _SummaryRow(
                  label: 'Data', value: _formatDataDisplay(data)),
              _SummaryRow(
                  label: 'Horario', value: '$horaInicio – $horaFim'),
              _SummaryRow(label: 'Tipo', value: tipoLive),
              _SummaryRow(label: 'Duracao', value: duracao),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.x4),
        TextField(
          controller: obsController,
          maxLines: 3,
          decoration: InputDecoration(
            hintText: 'Observacoes (opcional)',
            hintStyle: AppTypography.bodySmall
                .copyWith(color: context.colors.textMuted),
            filled: true,
            fillColor: context.colors.bgInput,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(AppRadius.md),
              borderSide: BorderSide(color: context.colors.borderSubtle),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(AppRadius.md),
              borderSide: BorderSide(color: context.colors.borderSubtle),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(AppRadius.md),
              borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
            ),
          ),
        ),
        const SizedBox(height: AppSpacing.x6),
        AppPrimaryButton(
          label: 'Enviar solicitacao',
          onPressed: submitting ? null : onSubmit,
          isLoading: submitting,
          fullWidth: true,
        ),
      ],
    );
  }
}

class _SummaryRow extends StatelessWidget {
  final String label;
  final String value;

  const _SummaryRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.x2),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 90,
            child: Text(
              label,
              style: AppTypography.caption
                  .copyWith(color: context.colors.textMuted),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: AppTypography.bodySmall.copyWith(
                fontWeight: FontWeight.w700,
                color: context.colors.textPrimary,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
