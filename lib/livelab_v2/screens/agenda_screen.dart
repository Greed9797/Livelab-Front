import 'package:flutter/material.dart';
import '../../routes/app_routes.dart';
import '../core/ll_theme.dart';
import '../widgets/ll_components.dart';

class AgendaScreen extends StatefulWidget {
  const AgendaScreen({super.key});

  @override
  State<AgendaScreen> createState() => _AgendaScreenState();
}

class _AgendaScreenState extends State<AgendaScreen> {
  int selectedDay = 2;

  final days = const [
    _Day('Seg', 27, 8, false),
    _Day('Ter', 28, 12, false),
    _Day('Qui', 29, 14, true),
    _Day('Sex', 30, 9, false),
    _Day('Sáb', 1, 16, false),
    _Day('Dom', 2, 6, false),
    _Day('Dom', 3, 4, false),
  ];

  late final List<String> times = [
    for (var h = 8; h <= 20; h++) ...[
      llPad2(h) + ':00',
      if (h < 20) llPad2(h) + ':30'
    ]
  ];

  final bookings = const <String, _Booking>{};

  Set<String> get occupied {
    final result = <String>{};
    bookings.forEach((key, booking) {
      final split = key.split('-');
      final timeIndex = times.indexOf(split[0]);
      final cabin = split[1];
      for (var k = 1; k < booking.span; k++) {
        if (timeIndex + k < times.length)
          result.add('${times[timeIndex + k]}-$cabin');
      }
    });
    return result;
  }

  @override
  Widget build(BuildContext context) {
    const colW = 100.0;
    const timeW = 56.0;
    const rowH = 40.0;
    final occ = occupied;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 20, 24, 0),
          child: Column(
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Expanded(
                      child: LLScreenHeader(
                          label: 'Agenda', italic: 'Minha', bold: 'Agenda')),
                  Wrap(spacing: 12, runSpacing: 8, children: const [
                    _StatusLegend(color: LL.live, label: 'Ao vivo', count: 5),
                    _StatusLegend(
                        color: LL.warning, label: 'Pendente', count: 2),
                    _StatusLegend(
                        color: LL.accent, label: 'Agendada', count: 7),
                  ]),
                ],
              ),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const _WeekButton(
                      icon: Icons.chevron_left_rounded, label: 'Anterior'),
                  Text('Semana de 27/04 a 03/05',
                      style: TextStyle(
                          fontSize: 13,
                          color: context.llTextSecond,
                          fontWeight: FontWeight.w800)),
                  const _WeekButton(
                      icon: Icons.chevron_right_rounded,
                      label: 'Próxima',
                      trailing: true),
                ],
              ),
              const SizedBox(height: 12),
              Wrap(
                alignment: WrapAlignment.center,
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (var i = 0; i < days.length; i++)
                    _DayPill(
                        day: days[i],
                        selected: selectedDay == i,
                        onTap: () => setState(() => selectedDay = i)),
                ],
              ),
              const SizedBox(height: 18),
            ],
          ),
        ),
        Expanded(
          child: Scrollbar(
            thumbVisibility: true,
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
              scrollDirection: Axis.horizontal,
              child: SizedBox(
                width: timeW + colW * 10 + 4,
                child: Stack(
                  children: [
                    Column(
                      children: [
                        _CabinHeader(timeW: timeW, colW: colW),
                        Expanded(
                          child: SingleChildScrollView(
                            child: Column(
                              children: [
                                for (var ti = 0; ti < times.length; ti++) ...[
                                  if (_periodLabel(times[ti]) != null && ti > 0)
                                    _PeriodRow(
                                        label: _periodLabel(times[ti])!,
                                        timeW: timeW),
                                  Row(
                                    children: [
                                      Container(
                                        width: timeW,
                                        height: rowH,
                                        padding: const EdgeInsets.only(
                                            top: 5, right: 8),
                                        alignment: Alignment.topRight,
                                        decoration: BoxDecoration(
                                            border: Border(
                                                right: BorderSide(
                                                    color: context.llBorder))),
                                        child: Text(
                                            times[ti].endsWith(':00')
                                                ? times[ti]
                                                : '',
                                            style: TextStyle(
                                                fontSize: 10,
                                                color: context.llTextSecond,
                                                fontWeight: FontWeight.w700)),
                                      ),
                                      for (var ci = 1; ci <= 10; ci++)
                                        _AgendaCell(
                                          width: colW,
                                          height: rowH,
                                          time: times[ti],
                                          cabin: ci,
                                          booking: bookings['${times[ti]}-$ci'],
                                          occupied:
                                              occ.contains('${times[ti]}-$ci'),
                                          isHour: times[ti].endsWith(':00'),
                                        ),
                                    ],
                                  ),
                                ],
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                    Positioned(
                      top:
                          36 + ((10 - 8) * 2 + 1) * rowH + (1 / 30) * rowH + 22,
                      left: timeW,
                      right: 0,
                      child: IgnorePointer(
                        child: Row(
                          children: [
                            Container(
                                width: 10,
                                height: 10,
                                decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    color: LL.live,
                                    boxShadow: [
                                      BoxShadow(
                                          color: LL.live.llOpacity(0.6),
                                          blurRadius: 10)
                                    ])),
                            Expanded(
                                child: Container(height: 2, color: LL.live)),
                            Container(
                              margin: const EdgeInsets.only(right: 8),
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                  color: LL.surface,
                                  borderRadius: BorderRadius.circular(4),
                                  border: Border.all(
                                      color: LL.live.llOpacity(0.35))),
                              child: const Text('AGORA · 10:31',
                                  style: TextStyle(
                                      fontSize: 9,
                                      fontWeight: FontWeight.w900,
                                      color: LL.live,
                                      letterSpacing: 0.4)),
                            ),
                          ],
                        ),
                      ),
                    ),
                    Positioned(
                      bottom: 24,
                      right: 32,
                      child: LLButton(
                          label: 'Nova Live',
                          icon: Icons.add_rounded,
                          onTap: () => Navigator.of(context)
                              .pushNamed(AppRoutes.solicitacoes)),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }

  String? _periodLabel(String t) {
    if (t == '12:00') return 'Tarde';
    if (t == '18:00') return 'Noite';
    return null;
  }
}

class _StatusLegend extends StatelessWidget {
  const _StatusLegend(
      {required this.color, required this.label, required this.count});
  final Color color;
  final String label;
  final int count;

  @override
  Widget build(BuildContext context) {
    return Row(mainAxisSize: MainAxisSize.min, children: [
      Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(
              color: color,
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(color: color.llOpacity(0.45), blurRadius: 8)
              ])),
      const SizedBox(width: 6),
      Text(label,
          style: TextStyle(
              fontSize: 11,
              color: context.llTextSecond,
              fontWeight: FontWeight.w700)),
      const SizedBox(width: 4),
      Text('$count',
          style: TextStyle(fontSize: 11, color: context.llTextMuted)),
    ]);
  }
}

class _WeekButton extends StatelessWidget {
  const _WeekButton(
      {required this.icon, required this.label, this.trailing = false});
  final IconData icon;
  final String label;
  final bool trailing;

  @override
  Widget build(BuildContext context) {
    return Row(mainAxisSize: MainAxisSize.min, children: [
      if (!trailing) Icon(icon, size: 15, color: LL.accent),
      Text(label,
          style: const TextStyle(
              fontSize: 13, color: LL.accent, fontWeight: FontWeight.w700)),
      if (trailing) Icon(icon, size: 15, color: LL.accent),
    ]);
  }
}

class _DayPill extends StatelessWidget {
  const _DayPill(
      {required this.day, required this.selected, required this.onTap});
  final _Day day;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final bg = day.today
        ? LL.accent
        : selected
            ? context.llSurface3
            : Colors.transparent;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        width: 58,
        padding: const EdgeInsets.symmetric(vertical: 7),
        decoration: BoxDecoration(
            color: bg,
            borderRadius: BorderRadius.circular(12),
            boxShadow: day.today
                ? [BoxShadow(color: LL.accent.llOpacity(0.32), blurRadius: 18)]
                : null),
        child: Column(children: [
          Text(day.abbr.toUpperCase(),
              style: TextStyle(
                  fontSize: 9,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 0.6,
                  color: day.today ? Colors.white : context.llTextMuted)),
          Text('${day.num}',
              style: TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w900,
                  color: day.today
                      ? Colors.white
                      : selected
                          ? context.llTextPrimary
                          : context.llTextSecond,
                  height: 1.05)),
          const SizedBox(height: 4),
          Row(mainAxisAlignment: MainAxisAlignment.center, children: [
            Container(
                width: 4,
                height: 4,
                decoration: BoxDecoration(
                    color: day.today ? Colors.white : LL.accent,
                    shape: BoxShape.circle)),
            const SizedBox(width: 3),
            Text('${day.count}',
                style: TextStyle(
                    fontSize: 9,
                    fontWeight: FontWeight.w700,
                    color: day.today ? Colors.white70 : context.llTextMuted)),
          ]),
        ]),
      ),
    );
  }
}

class _CabinHeader extends StatelessWidget {
  const _CabinHeader({required this.timeW, required this.colW});
  final double timeW;
  final double colW;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 36,
      decoration: BoxDecoration(
          color: context.llBg,
          border: Border(bottom: BorderSide(color: context.llBorderMid))),
      child: Row(children: [
        SizedBox(width: timeW),
        for (var i = 1; i <= 10; i++)
          SizedBox(
            width: colW,
            child: Center(
                child: Text.rich(TextSpan(children: [
              TextSpan(
                  text: 'CAB ',
                  style: LL.caption
                      .copyWith(fontSize: 9, fontWeight: FontWeight.w600)),
              TextSpan(
                  text: llPad2(i),
                  style: TextStyle(
                      fontSize: 11,
                      color: context.llTextSecond,
                      fontWeight: FontWeight.w900)),
            ]))),
          ),
      ]),
    );
  }
}

class _PeriodRow extends StatelessWidget {
  const _PeriodRow({required this.label, required this.timeW});
  final String label;
  final double timeW;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 22,
      child: Row(children: [
        SizedBox(width: timeW),
        Text(label.toUpperCase(), style: LL.label.copyWith(fontSize: 9)),
        const SizedBox(width: 8),
        Expanded(child: Divider(color: context.llBorder)),
      ]),
    );
  }
}

class _AgendaCell extends StatelessWidget {
  const _AgendaCell(
      {required this.width,
      required this.height,
      required this.time,
      required this.cabin,
      this.booking,
      required this.occupied,
      required this.isHour});
  final double width;
  final double height;
  final String time;
  final int cabin;
  final _Booking? booking;
  final bool occupied;
  final bool isHour;

  @override
  Widget build(BuildContext context) {
    final b = booking;
    return Container(
      width: width,
      height: height,
      padding: const EdgeInsets.all(2),
      decoration: BoxDecoration(
        border: Border(
          left: BorderSide(color: context.llBorder),
          bottom: BorderSide(
              color: context.llBorder,
              style: isHour ? BorderStyle.solid : BorderStyle.solid),
        ),
      ),
      child: b == null || occupied
          ? const SizedBox.shrink()
          : SizedBox(
              height: height * b.span - 4,
              child: _BookingBlock(booking: b),
            ),
    );
  }
}

class _BookingBlock extends StatelessWidget {
  const _BookingBlock({required this.booking});
  final _Booking booking;

  @override
  Widget build(BuildContext context) {
    final Color color = switch (booking.status) {
      'live' => LL.live,
      'pending' => LL.warning,
      'busy' => LL.info,
      _ => LL.accent,
    };
    final filled = booking.status == 'live' || booking.status == 'upcoming';
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 5),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(6),
        color: filled ? color : color.llOpacity(0.12),
        border: Border.all(
            color: filled ? Colors.transparent : color.llOpacity(0.45)),
        boxShadow: filled
            ? [
                BoxShadow(
                    color: color.llOpacity(0.28),
                    blurRadius: 14,
                    offset: const Offset(0, 4))
              ]
            : null,
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        if (booking.status == 'live')
          Row(children: [
            Container(
                width: 5,
                height: 5,
                decoration: const BoxDecoration(
                    color: Colors.white, shape: BoxShape.circle)),
            const SizedBox(width: 4),
            const Text('AO VIVO',
                style: TextStyle(
                    fontSize: 8,
                    fontWeight: FontWeight.w900,
                    color: Colors.white,
                    letterSpacing: 0.8)),
          ]),
        if (booking.status == 'pending')
          Text('PENDENTE',
              style: TextStyle(
                  fontSize: 8,
                  fontWeight: FontWeight.w900,
                  color: color,
                  letterSpacing: 0.8)),
        Text(booking.label,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w800,
                color: filled ? Colors.white : color,
                height: 1.2)),
        Text(booking.who,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
                fontSize: 10,
                color: filled ? Colors.white70 : color.llOpacity(0.78))),
      ]),
    );
  }
}

class _Day {
  const _Day(this.abbr, this.num, this.count, this.today);
  final String abbr;
  final int num;
  final int count;
  final bool today;
}

class _Booking {
  const _Booking(this.label, this.who, this.status, this.span);
  final String label;
  final String who;
  final String status;
  final int span;
}
