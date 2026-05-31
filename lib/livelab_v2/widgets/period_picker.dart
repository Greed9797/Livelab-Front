import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';

import '../core/ll_theme.dart';

const _months = [
  ('01', 'Jan'),
  ('02', 'Fev'),
  ('03', 'Mar'),
  ('04', 'Abr'),
  ('05', 'Mai'),
  ('06', 'Jun'),
  ('07', 'Jul'),
  ('08', 'Ago'),
  ('09', 'Set'),
  ('10', 'Out'),
  ('11', 'Nov'),
  ('12', 'Dez'),
];

/// Modal year + month grid. Returns YYYY-MM string ou null.
Future<String?> showPeriodPicker(BuildContext context, String current) {
  return showDialog<String>(
    context: context,
    builder: (_) => _PeriodDialog(current: current),
  );
}

String periodLabel(String period) {
  try {
    return DateFormat('MMMM y', 'pt_BR').format(DateTime.parse('$period-01'));
  } catch (_) {
    return period;
  }
}

class _PeriodDialog extends StatefulWidget {
  const _PeriodDialog({required this.current});
  final String current;

  @override
  State<_PeriodDialog> createState() => _PeriodDialogState();
}

class _PeriodDialogState extends State<_PeriodDialog> {
  late int _year;
  late String _month;

  @override
  void initState() {
    super.initState();
    final parts = widget.current.split('-');
    _year = int.tryParse(parts.firstOrNull ?? '') ?? DateTime.now().year;
    _month = parts.length > 1 ? parts[1] : '${DateTime.now().month.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final currentYear = DateTime.now().year;
    return Dialog(
      backgroundColor: context.llSurface2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      insetPadding: const EdgeInsets.all(24),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 360, maxHeight: 380),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Text('Selecione o período',
                      style: GoogleFonts.inter(
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                          color: context.llTextPrimary)),
                  const Spacer(),
                  IconButton(
                    icon: const Icon(Icons.close, size: 18),
                    color: context.llTextMuted,
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  IconButton(
                    icon: const Icon(Icons.chevron_left_rounded),
                    color: context.llTextSecond,
                    onPressed: () => setState(() => _year--),
                  ),
                  SizedBox(
                    width: 80,
                    child: Text('$_year',
                        textAlign: TextAlign.center,
                        style: GoogleFonts.inter(
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                            color: context.llTextPrimary)),
                  ),
                  IconButton(
                    icon: const Icon(Icons.chevron_right_rounded),
                    color: context.llTextSecond,
                    onPressed: _year >= currentYear + 1
                        ? null
                        : () => setState(() => _year++),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Expanded(
                child: GridView.count(
                  crossAxisCount: 4,
                  mainAxisSpacing: 8,
                  crossAxisSpacing: 8,
                  childAspectRatio: 1.6,
                  children: [
                    for (final m in _months)
                      _MonthCell(
                        label: m.$2,
                        active: _month == m.$1,
                        onTap: () {
                          setState(() => _month = m.$1);
                          final period =
                              '$_year-${m.$1.padLeft(2, '0')}';
                          Navigator.pop(context, period);
                        },
                      ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MonthCell extends StatelessWidget {
  const _MonthCell({required this.label, required this.active, required this.onTap});
  final String label;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        decoration: BoxDecoration(
          color: active ? LL.accent : context.llSurface3,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
              color: active ? LL.accent : context.llBorder),
        ),
        alignment: Alignment.center,
        child: Text(label,
            style: GoogleFonts.inter(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: active ? Colors.white : context.llTextPrimary)),
      ),
    );
  }
}

/// Status options para filtros master.
const masterStatusOptions = [
  ('todos', 'Todos'),
  ('ativo', 'Ativos'),
  ('inadimplente', 'Inadimplentes'),
];

String statusLabel(String key) =>
    masterStatusOptions.firstWhere((e) => e.$1 == key, orElse: () => ('todos', 'Todos')).$2;

Future<String?> showStatusPicker(BuildContext context, String current) {
  return showMenu<String>(
    context: context,
    position: _menuPosition(context),
    color: Theme.of(context).brightness == Brightness.dark
        ? const Color(0xFF1E1E22)
        : Colors.white,
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
    items: [
      for (final (k, label) in masterStatusOptions)
        PopupMenuItem<String>(
          value: k,
          child: Row(
            children: [
              Icon(
                k == current ? Icons.radio_button_checked : Icons.radio_button_off,
                size: 16,
                color: k == current ? LL.accent : context.llTextMuted,
              ),
              const SizedBox(width: 8),
              Text(label,
                  style: GoogleFonts.inter(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: context.llTextPrimary)),
            ],
          ),
        ),
    ],
  );
}

RelativeRect _menuPosition(BuildContext context) {
  final overlay = Overlay.of(context).context.findRenderObject() as RenderBox;
  final box = context.findRenderObject() as RenderBox;
  final pos = box.localToGlobal(box.size.bottomLeft(Offset.zero), ancestor: overlay);
  return RelativeRect.fromLTRB(
    pos.dx,
    pos.dy + 4,
    overlay.size.width - pos.dx - box.size.width,
    overlay.size.height - pos.dy,
  );
}
