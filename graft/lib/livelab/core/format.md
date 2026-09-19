# lib/livelab/core/format.dart

- LlFormat · class · L3-L28 — class LlFormat
- _brl · constant · L4-L8 — static final _brl = NumberFormat.currency(
- _brlCompact · constant · L9-L13 — static final _brlCompact = NumberFormat.compactCurrency(
- _intBr · constant · L14-L14 — static final _intBr = NumberFormat.decimalPattern('pt_BR');
- money · method · L16-L16 — static String money(num v) => _brl.format(v);
- moneyCompact · method · L17-L20 — static String moneyCompact(num v)
- integer · method · L22-L22 — static String integer(num v) => _intBr.format(v);
- compactInt · method · L24-L27 — static String compactInt(num v)
