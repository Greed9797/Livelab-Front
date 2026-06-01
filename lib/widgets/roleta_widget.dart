import 'package:flutter/material.dart';
import '../design_system/design_system.dart';

/// Animação de "roleta" ao trocar valores de faturamento
class RoletaWidget extends StatefulWidget {
  final double value;
  final String label;
  final double fontSize;
  final Color textColor;

  const RoletaWidget({
    super.key,
    required this.value,
    required this.label,
    this.fontSize = 32,
    this.textColor = Colors.white,
  });

  @override
  State<RoletaWidget> createState() => _RoletaWidgetState();
}

class _RoletaWidgetState extends State<RoletaWidget> {
  late double _displayValue;

  @override
  void initState() {
    super.initState();
    _displayValue = widget.value;
  }

  @override
  void didUpdateWidget(RoletaWidget old) {
    super.didUpdateWidget(old);
    if (old.value != widget.value) {
      setState(() => _displayValue = widget.value);
    }
  }

  String get _formatted =>
      'R\$ ${_displayValue.toStringAsFixed(2).replaceAll('.', ',').replaceAllMapped(
        RegExp(r'(\d)(?=(\d{3})+(?!\d))'),
        (m) => '${m[1]}.',
      )}';

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          widget.label,
          style: const TextStyle(
            fontSize: 11,
            color: AppColors.lilac,
            fontWeight: FontWeight.w500,
            letterSpacing: 0.8,
          ),
        ),
        const SizedBox(height: 4),
        AnimatedSwitcher(
          duration: const Duration(milliseconds: 280),
          transitionBuilder: (child, anim) => SlideTransition(
            position: Tween<Offset>(
              begin: const Offset(0, 0.3),
              end: Offset.zero,
            ).animate(CurvedAnimation(parent: anim, curve: Curves.easeOutCubic)),
            child: FadeTransition(opacity: anim, child: child),
          ),
          child: Text(
            _formatted,
            key: ValueKey(_displayValue),
            style: TextStyle(
              fontSize: widget.fontSize,
              fontWeight: FontWeight.w500,
              color: widget.textColor,
            ),
          ),
        ),
      ],
    );
  }
}
