import 'package:flutter/material.dart';
import '../core/ll_theme.dart';
import '../widgets/ll_components.dart';
import '../../screens/lives/registrar_live_manual_dialog.dart';

class MinhasLivesScreen extends StatefulWidget {
  const MinhasLivesScreen({super.key});

  @override
  State<MinhasLivesScreen> createState() => _MinhasLivesScreenState();
}

class _MinhasLivesScreenState extends State<MinhasLivesScreen> {
  String tab = 'lives';
  String subTab = 'ao-vivo';

  final historico = const <_HistoryLive>[];

  final agenda = const <_AgendaLive>[];

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 20, 24, 0),
              child: Column(
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      const Expanded(
                          child: LLScreenHeader(
                              label: 'Cabines',
                              italic: 'Minhas',
                              bold: 'Lives',
                              subtitle:
                                  'Acompanhe transmissões ativas, histórico e solicite novas lives')),
                      Wrap(spacing: 16, crossAxisAlignment: WrapCrossAlignment.center, children: [
                        FilledButton.icon(
                          onPressed: () => showDialog<bool>(
                            context: context,
                            builder: (_) => const RegistrarLiveManualDialog(),
                          ),
                          icon: const Icon(Icons.video_call_outlined, size: 16),
                          label: const Text('Registrar Live'),
                          style: FilledButton.styleFrom(backgroundColor: LL.accent),
                        ),
                      ]),
                    ],
                  ),
                  const SizedBox(height: 16),
                  _MainTabs(
                      value: tab, onChanged: (v) => setState(() => tab = v)),
                ],
              ),
            ),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(24, 20, 24, 24),
                child: _buildBody(),
              ),
            ),
          ],
        ),
        if (tab != 'solicitar')
          Positioned(
              bottom: 24,
              right: 32,
              child: LLButton(
                  label: 'Nova Live',
                  icon: Icons.add_rounded,
                  onTap: () => setState(() => tab = 'solicitar'))),
      ],
    );
  }

  Widget _buildBody() {
    if (tab == 'agenda') return _AgendaList(items: agenda);
    if (tab == 'solicitar') return const SolicitarCalendar();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        LLSegmented(
          items: const [
            LLSegmentItem('ao-vivo', 'Ao Vivo', dot: LL.live),
            LLSegmentItem('historico', 'Histórico')
          ],
          value: subTab,
          onChanged: (v) => setState(() => subTab = v),
        ),
        const SizedBox(height: 20),
        if (subTab == 'ao-vivo')
          _EmptyLiveCard(
              onAgenda: () => setState(() => tab = 'agenda'),
              onSolicitar: () => setState(() => tab = 'solicitar'))
        else
          _HistoryList(items: historico),
      ],
    );
  }
}

class _MainTabs extends StatelessWidget {
  const _MainTabs({required this.value, required this.onChanged});
  final String value;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    final tabs = const [
      ('lives', 'Lives', Icons.tv_outlined),
      ('agenda', 'Agenda', Icons.calendar_month_outlined),
      ('solicitar', 'Solicitar', Icons.add_rounded),
    ];
    return Container(
      decoration: BoxDecoration(
          border: Border(bottom: BorderSide(color: context.llBorder))),
      child: Row(
        children: [
          for (final t in tabs)
            InkWell(
              onTap: () => onChanged(t.$1),
              child: Container(
                padding: const EdgeInsets.fromLTRB(20, 12, 20, 10),
                decoration: BoxDecoration(
                    border: Border(
                        bottom: BorderSide(
                            color:
                                value == t.$1 ? LL.accent : Colors.transparent,
                            width: 2))),
                child: Row(children: [
                  Icon(t.$3,
                      size: 15,
                      color: value == t.$1 ? LL.accent : context.llTextMuted),
                  const SizedBox(width: 7),
                  Text(t.$2,
                      style: TextStyle(
                          fontSize: 13,
                          fontWeight:
                              value == t.$1 ? FontWeight.w800 : FontWeight.w600,
                          color:
                              value == t.$1 ? LL.accent : context.llTextMuted)),
                ]),
              ),
            ),
        ],
      ),
    );
  }
}

class _EmptyLiveCard extends StatelessWidget {
  const _EmptyLiveCard({required this.onAgenda, required this.onSolicitar});
  final VoidCallback onAgenda;
  final VoidCallback onSolicitar;

  @override
  Widget build(BuildContext context) {
    return LLCard(
      padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 40),
      radius: 16,
      child: Column(
        children: [
          Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(18),
              gradient: LinearGradient(
                  colors: [context.llSurface3, context.llSurface2]),
              border: Border.all(color: context.llBorderMid),
            ),
            child: Icon(Icons.signal_cellular_alt_rounded,
                size: 28, color: context.llTextMuted),
          ),
          const SizedBox(height: 16),
          Text('Sem live ativa no momento',
              style: TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w800,
                  color: context.llTextPrimary,
                  letterSpacing: -0.3)),
          const SizedBox(height: 6),
          SizedBox(
            width: 420,
            child: Text(
                'Suas métricas em tempo real — viewers, GMV e pedidos — aparecerão aqui assim que uma transmissão for iniciada.',
                textAlign: TextAlign.center,
                style: LL.caption.copyWith(fontSize: 12.5)),
          ),
          const SizedBox(height: 18),
          Wrap(
              spacing: 10,
              runSpacing: 10,
              alignment: WrapAlignment.center,
              children: [
                LLButton(
                    label: 'Ver agenda',
                    icon: Icons.calendar_month_outlined,
                    variant: LLButtonVariant.ghost,
                    onTap: onAgenda,
                    small: true),
                LLButton(
                    label: 'Solicitar nova live',
                    icon: Icons.bolt_rounded,
                    onTap: onSolicitar,
                    small: true),
              ]),
        ],
      ),
    );
  }
}

class _HistoryList extends StatelessWidget {
  const _HistoryList({required this.items});
  final List<_HistoryLive> items;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: items
          .map((item) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: LLCard(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
                  radius: 12,
                  child: Row(
                    children: [
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(12),
                            color: LL.accent.llOpacity(0.16),
                            border:
                                Border.all(color: LL.accent.llOpacity(0.2))),
                        child: const Icon(Icons.tv_outlined,
                            size: 18, color: LL.accent),
                      ),
                      const SizedBox(width: 16),
                      SizedBox(
                        width: 185,
                        child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(item.name,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w800,
                                      color: context.llTextPrimary)),
                              const SizedBox(height: 2),
                              Text(
                                  '${item.date} · Cab. ${llPad2(item.cabin)} · ${item.duration}',
                                  overflow: TextOverflow.ellipsis,
                                  style: LL.caption.copyWith(fontSize: 11)),
                            ]),
                      ),
                      Expanded(
                          child: Align(
                              alignment: Alignment.centerRight,
                              child: LLSparkline(
                                  data: item.spark,
                                  color: LL.success,
                                  width: 120,
                                  height: 32))),
                      const SizedBox(width: 24),
                      _HistoryMetric(
                          label: 'GMV',
                          value: llMoney(item.gmv),
                          color: LL.success),
                      const SizedBox(width: 24),
                      _HistoryMetric(
                          label: item.peak,
                          value: item.viewers.toString(),
                          color: LL.textPrimary),
                      const SizedBox(width: 24),
                      _HistoryMetric(
                          label: 'Pedidos',
                          value: '${item.orders}',
                          color: LL.textPrimary),
                    ],
                  ),
                ),
              ))
          .toList(),
    );
  }
}

class _HistoryMetric extends StatelessWidget {
  const _HistoryMetric(
      {required this.label, required this.value, required this.color});
  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 84,
      child: Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
        Text(value,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w900,
                color: color,
                letterSpacing: -0.3)),
        Text(label.toUpperCase(),
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
                fontSize: 9,
                color: context.llTextMuted,
                fontWeight: FontWeight.w800,
                letterSpacing: 0.5)),
      ]),
    );
  }
}

class _AgendaList extends StatelessWidget {
  const _AgendaList({required this.items});
  final List<_AgendaLive> items;

  @override
  Widget build(BuildContext context) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text('Próximas transmissões',
          style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w800,
              color: context.llTextPrimary)),
      const SizedBox(height: 2),
      Text('${items.length} ${items.length == 1 ? 'live agendada' : 'lives agendadas'}',
          style: LL.caption.copyWith(fontSize: 11.5)),
      const SizedBox(height: 12),
      if (items.isEmpty)
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 24),
          child: Center(
            child: Text('Sem agendamentos no momento.',
                style: LL.caption.copyWith(fontSize: 12)),
          ),
        ),
      for (final item in items)
        Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: LLCard(
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
            radius: 12,
            leftBorderColor: item.status == 'pending' ? LL.warning : LL.success,
            child: Row(children: [
              SizedBox(
                width: 62,
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(item.time,
                          style: TextStyle(
                              fontSize: 22,
                              fontWeight: FontWeight.w900,
                              color: context.llTextPrimary,
                              letterSpacing: -0.8,
                              height: 1)),
                      const SizedBox(height: 3),
                      Text(item.duration.toUpperCase(),
                          style: LL.label.copyWith(fontSize: 10)),
                    ]),
              ),
              Container(width: 1, height: 36, color: context.llBorder),
              const SizedBox(width: 16),
              Expanded(
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                    Text(item.name,
                        style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w800,
                            color: context.llTextPrimary)),
                    const SizedBox(height: 2),
                    Text('Cabine ${llPad2(item.cabin)} · ${item.presenter}',
                        style: LL.caption.copyWith(fontSize: 11.5)),
                  ])),
              LLBadge(
                  label: item.status == 'pending' ? 'Pendente' : 'Confirmado',
                  color: item.status == 'pending' ? LL.warning : LL.success),
            ]),
          ),
        ),
    ]);
  }
}

class SolicitarCalendar extends StatefulWidget {
  const SolicitarCalendar({super.key});

  @override
  State<SolicitarCalendar> createState() => _SolicitarCalendarState();
}

class _SolicitarCalendarState extends State<SolicitarCalendar> {
  late DateTime _weekStart;
  int selectedDay = 0;
  String? selectedSlot;
  final Map<String, String> booked = {};

  static const _diasNomes = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

  late final List<String> times = [
    for (var h = 8; h <= 20; h++) ...[
      llPad2(h) + ':00',
      if (h < 20) llPad2(h) + ':30'
    ]
  ];

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _weekStart = DateTime(now.year, now.month, now.day - (now.weekday - 1));
    selectedDay = now.weekday - 1; // hoje
  }

  void _shiftWeek(int delta) {
    setState(() {
      _weekStart = _weekStart.add(Duration(days: 7 * delta));
      selectedDay = 0;
    });
  }

  @override
  Widget build(BuildContext context) {
    const colW = 100.0;
    const timeW = 56.0;
    const rowH = 38.0;
    final today = DateTime.now();
    final todayKey = DateTime(today.year, today.month, today.day);
    final days = List.generate(7, (i) {
      final d = _weekStart.add(Duration(days: i));
      return (_diasNomes[i], d.day, d, DateTime(d.year, d.month, d.day) == todayKey);
    });
    final weekEnd = _weekStart.add(const Duration(days: 6));
    final headerLabel =
        'Semana de ${llPad2(_weekStart.day)}/${llPad2(_weekStart.month)} a ${llPad2(weekEnd.day)}/${llPad2(weekEnd.month)}';

    return Column(children: [
      Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
        InkWell(
          onTap: () => _shiftWeek(-1),
          child: const _WeekButton2(label: 'Anterior', icon: Icons.chevron_left_rounded),
        ),
        Column(children: [
          Text('Solicitar nova live',
              style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                  color: context.llTextPrimary)),
          const SizedBox(height: 2),
          Text('Clique em um horário disponível · $headerLabel',
              style: TextStyle(
                  fontSize: 11.5,
                  color: context.llTextMuted,
                  fontWeight: FontWeight.w500)),
        ]),
        InkWell(
          onTap: () => _shiftWeek(1),
          child: const _WeekButton2(
              label: 'Próxima',
              icon: Icons.chevron_right_rounded,
              trailing: true),
        ),
      ]),
      const SizedBox(height: 14),
      Wrap(
          spacing: 8,
          runSpacing: 8,
          alignment: WrapAlignment.center,
          children: [
            for (var i = 0; i < days.length; i++)
              InkWell(
                onTap: () => setState(() => selectedDay = i),
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  width: 58,
                  padding: const EdgeInsets.symmetric(vertical: 7),
                  decoration: BoxDecoration(
                      color: days[i].$4
                          ? LL.accent
                          : selectedDay == i
                              ? context.llSurface3
                              : Colors.transparent,
                      borderRadius: BorderRadius.circular(12)),
                  child: Column(children: [
                    Text(days[i].$1.toUpperCase(),
                        style: TextStyle(
                            fontSize: 9,
                            fontWeight: FontWeight.w900,
                            color: days[i].$4 ? Colors.white : context.llTextMuted,
                            letterSpacing: 0.6)),
                    Text('${days[i].$2}',
                        style: TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.w900,
                            color: days[i].$4
                                ? Colors.white
                                : selectedDay == i
                                    ? context.llTextPrimary
                                    : context.llTextSecond,
                            height: 1.05)),
                  ]),
                ),
              ),
          ]),
      const SizedBox(height: 18),
      Container(
        height: 480,
        decoration: BoxDecoration(
            border: Border.all(color: context.llBorder),
            borderRadius: BorderRadius.circular(12)),
        clipBehavior: Clip.hardEdge,
        child: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: SizedBox(
            width: timeW + colW * 10,
            child: Column(children: [
              Container(
                height: 36,
                color: LL.surface,
                child: Row(children: [
                  SizedBox(width: timeW),
                  for (var c = 1; c <= 10; c++)
                    SizedBox(
                        width: colW,
                        child: Center(
                            child: Text('CAB ${llPad2(c)}',
                                style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w800,
                                    color: context.llTextSecond)))),
                ]),
              ),
              Expanded(
                child: SingleChildScrollView(
                  child: Column(children: [
                    for (final time in times)
                      Row(children: [
                        Container(
                          width: timeW,
                          height: rowH,
                          alignment: Alignment.topRight,
                          padding: const EdgeInsets.only(top: 4, right: 8),
                          decoration: BoxDecoration(
                              border: Border(
                                  right: BorderSide(color: context.llBorder))),
                          child: Text(time.endsWith(':00') ? time : '',
                              style: TextStyle(
                                  fontSize: 10,
                                  color: context.llTextSecond,
                                  fontWeight: FontWeight.w700)),
                        ),
                        for (var cabin = 1; cabin <= 10; cabin++)
                          _RequestCell(
                            width: colW,
                            height: rowH,
                            bookedLabel: booked['$time-$cabin'],
                            onTap: () => _showRequestDialog(time, cabin),
                          ),
                      ]),
                  ]),
                ),
              ),
            ]),
          ),
        ),
      ),
    ]);
  }

  void _showRequestDialog(String time, int cabin) {
    final name = TextEditingController();
    final presenter = TextEditingController();
    final duration = TextEditingController(text: '1h');
    showDialog<void>(
      context: context,
      barrierColor: Colors.black.llOpacity(0.72),
      builder: (context) => Dialog(
        backgroundColor: context.llSurface2,
        shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: BorderSide(color: context.llBorderMid)),
        child: SizedBox(
          width: 400,
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(children: [
                    Expanded(
                        child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                          Text('Solicitar live',
                              style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w800,
                                  color: context.llTextPrimary)),
                          const SizedBox(height: 2),
                          Text(
                              'Quinta, 29/04 · $time · Cabine ${llPad2(cabin)}',
                              style: LL.caption.copyWith(fontSize: 11.5)),
                        ])),
                    IconButton(
                        onPressed: () => Navigator.pop(context),
                        icon: Icon(Icons.close_rounded,
                            size: 18, color: context.llTextMuted)),
                  ]),
                  const SizedBox(height: 14),
                  _DialogField(
                      controller: name,
                      label: 'Nome da transmissão',
                      hint: 'Ex: Loja Fashion · Verão 2026'),
                  _DialogField(
                      controller: presenter,
                      label: 'Apresentador(a)',
                      hint: 'Nome do apresentador'),
                  _DialogField(
                      controller: duration, label: 'Duração', hint: '1h'),
                  const SizedBox(height: 8),
                  Row(mainAxisAlignment: MainAxisAlignment.end, children: [
                    TextButton(
                        onPressed: () => Navigator.pop(context),
                        child: Text('Cancelar',
                            style: TextStyle(
                                color: context.llTextSecond,
                                fontWeight: FontWeight.w700))),
                    const SizedBox(width: 8),
                    LLButton(
                        label: 'Solicitar',
                        icon: Icons.bolt_rounded,
                        small: true,
                        onTap: () {
                          setState(() => booked['$time-$cabin'] =
                              name.text.isEmpty ? 'Nova live' : name.text);
                          Navigator.pop(context);
                        }),
                  ]),
                ]),
          ),
        ),
      ),
    );
  }
}

class _DialogField extends StatelessWidget {
  const _DialogField(
      {required this.controller, required this.label, required this.hint});
  final TextEditingController controller;
  final String label;
  final String hint;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(label,
            style: TextStyle(
                fontSize: 11,
                color: context.llTextMuted,
                fontWeight: FontWeight.w700)),
        const SizedBox(height: 5),
        TextField(
            controller: controller,
            decoration: InputDecoration(hintText: hint)),
      ]),
    );
  }
}

class _RequestCell extends StatelessWidget {
  const _RequestCell(
      {required this.width,
      required this.height,
      required this.bookedLabel,
      required this.onTap});
  final double width;
  final double height;
  final String? bookedLabel;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: bookedLabel == null ? onTap : null,
      child: Container(
        width: width,
        height: height,
        padding: const EdgeInsets.all(2),
        decoration: BoxDecoration(
            border: Border(
                left: BorderSide(color: context.llBorder),
                bottom: BorderSide(color: context.llBorder))),
        child: bookedLabel == null
            ? const SizedBox.shrink()
            : Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                decoration: BoxDecoration(
                    color: LL.warnSoft,
                    borderRadius: BorderRadius.circular(5),
                    border: Border.all(color: LL.warning.llOpacity(0.35))),
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('PENDENTE',
                          style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w900,
                              color: LL.warning)),
                      Text(bookedLabel!,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                              fontSize: 9, color: LL.warning.llOpacity(0.8))),
                    ]),
              ),
      ),
    );
  }
}

class _WeekButton2 extends StatelessWidget {
  const _WeekButton2(
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

class _HistoryLive {
  const _HistoryLive(this.date, this.name, this.cabin, this.duration, this.gmv,
      this.viewers, this.orders, this.peak, this.spark);
  final String date;
  final String name;
  final int cabin;
  final String duration;
  final int gmv;
  final int viewers;
  final int orders;
  final String peak;
  final List<double> spark;
}

class _AgendaLive {
  const _AgendaLive(this.time, this.name, this.cabin, this.presenter,
      this.duration, this.status);
  final String time;
  final String name;
  final int cabin;
  final String presenter;
  final String duration;
  final String status;
}
