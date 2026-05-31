import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../design_system/design_system.dart';

/// Widget padronizado para exibição de valores monetários.
/// - Formata em pt_BR (ponto nos milhares, vírgula nos centavos).
/// - Símbolo R$ menor (65%) e com menos peso do que o valor.
/// - Valor com `letterSpacing: -0.5` para parecer mais premium.
class MoneyText extends StatelessWidget {
  final double value;
  final double fontSize;
  final Color? color;
  final FontWeight fontWeight;
  final TextAlign? textAlign;

  const MoneyText({
    super.key,
    required this.value,
    this.fontSize = 24,
    this.color,
    this.fontWeight = FontWeight.w700,
    this.textAlign,
  });

  static final _formatter = NumberFormat.currency(
    locale: 'pt_BR',
    symbol: '',
    decimalDigits: 2,
  );

  @override
  Widget build(BuildContext context) {
    final baseColor = color ?? context.colors.textPrimary;
    // Formata sem o símbolo (ex: "27.035,25")
    final formattedNumber = _formatter.format(value).trim();

    return RichText(
      textAlign: textAlign ?? TextAlign.start,
      text: TextSpan(
        children: [
          TextSpan(
            text: 'R\$ ',
            style: TextStyle(
              fontFamily: 'Outfit',
              fontSize: fontSize * 0.65,
              fontWeight: FontWeight.w500,
              color: baseColor.withValues(alpha: 0.6),
              letterSpacing: -0.2,
            ),
          ),
          TextSpan(
            text: formattedNumber,
            style: TextStyle(
              fontFamily: 'Outfit',
              fontSize: fontSize,
              fontWeight: fontWeight,
              color: baseColor,
              letterSpacing: -0.5,
              height: 1.1,
            ),
          ),
        ],
      ),
    );
  }
}
