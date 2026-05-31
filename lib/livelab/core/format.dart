import 'package:intl/intl.dart';

class LlFormat {
  static final _brl = NumberFormat.currency(
    locale: 'pt_BR',
    symbol: 'R\$',
    decimalDigits: 2,
  );
  static final _brlCompact = NumberFormat.compactCurrency(
    locale: 'pt_BR',
    symbol: 'R\$',
    decimalDigits: 1,
  );
  static final _intBr = NumberFormat.decimalPattern('pt_BR');

  static String money(num v) => _brl.format(v);
  static String moneyCompact(num v) {
    if (v >= 1000) return _brlCompact.format(v);
    return _brl.format(v);
  }

  static String integer(num v) => _intBr.format(v);

  static String compactInt(num v) {
    if (v >= 1000) return '${(v / 1000).toStringAsFixed(1)}k';
    return v.toStringAsFixed(0);
  }
}
