import 'package:flutter/services.dart';

// ═══════════════════════════════════════════════════════════
// CPF / CNPJ — validation + input formatters
// ═══════════════════════════════════════════════════════════

/// FormField validator that accepts CPF (11 digits) or CNPJ (14 digits).
/// Returns null when the field is empty (field is optional).
String? validateCpfOrCnpj(String? raw) {
  if (raw == null) return null;
  final digits = raw.replaceAll(RegExp(r'\D'), '');
  if (digits.isEmpty) return null;
  if (digits.length == 11) return _validateCpf(digits);
  if (digits.length == 14) return _validateCnpj(digits);
  return 'CPF deve ter 11 dígitos ou CNPJ 14 dígitos';
}

String? _validateCpf(String digits) {
  // Reject sequences like 111.111.111-11
  if (RegExp(r'^(\d)\1{10}$').hasMatch(digits)) return 'CPF inválido';

  final nums = digits.split('').map(int.parse).toList();

  // First check digit
  var sum = 0;
  for (var i = 0; i < 9; i++) sum += nums[i] * (10 - i);
  var rem = sum % 11;
  final d1 = rem < 2 ? 0 : 11 - rem;
  if (nums[9] != d1) return 'CPF inválido';

  // Second check digit
  sum = 0;
  for (var i = 0; i < 10; i++) sum += nums[i] * (11 - i);
  rem = sum % 11;
  final d2 = rem < 2 ? 0 : 11 - rem;
  if (nums[10] != d2) return 'CPF inválido';

  return null;
}

String? _validateCnpj(String digits) {
  // Reject sequences like 00.000.000/0000-00
  if (RegExp(r'^(\d)\1{13}$').hasMatch(digits)) return 'CNPJ inválido';

  final nums = digits.split('').map(int.parse).toList();

  // First check digit — weights [5,4,3,2,9,8,7,6,5,4,3,2] over first 12 digits
  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  var sum = 0;
  for (var i = 0; i < 12; i++) sum += nums[i] * w1[i];
  var rem = sum % 11;
  final d1 = rem < 2 ? 0 : 11 - rem;
  if (nums[12] != d1) return 'CNPJ inválido';

  // Second check digit — weights [6,5,4,3,2,9,8,7,6,5,4,3,2] over first 13 digits
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  sum = 0;
  for (var i = 0; i < 13; i++) sum += nums[i] * w2[i];
  rem = sum % 11;
  final d2 = rem < 2 ? 0 : 11 - rem;
  if (nums[13] != d2) return 'CNPJ inválido';

  return null;
}

/// Input formatter for CPF fields.
/// Allows digits, dots and hyphens; limits input to 14 chars (masked CPF length).
final TextInputFormatter cpfInputFormatter = _LengthLimitedFormatter(
  allow: RegExp(r'[\d.\-]'),
  maxLength: 14,
);

/// Input formatter for CNPJ fields.
/// Allows digits, dots, hyphens and slashes; limits input to 18 chars (masked CNPJ length).
final TextInputFormatter cnpjInputFormatter = _LengthLimitedFormatter(
  allow: RegExp(r'[\d.\-\/]'),
  maxLength: 18,
);

class _LengthLimitedFormatter extends TextInputFormatter {
  final RegExp allow;
  final int maxLength;

  _LengthLimitedFormatter({required this.allow, required this.maxLength});

  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    // Filter characters
    final filtered = newValue.text.split('').where((c) => allow.hasMatch(c)).join();
    // Truncate to maxLength
    final truncated =
        filtered.length > maxLength ? filtered.substring(0, maxLength) : filtered;
    // Preserve selection range (don't collapse unconditionally)
    final selStart = newValue.selection.start.clamp(0, truncated.length);
    final selEnd = newValue.selection.end.clamp(0, truncated.length);
    return TextEditingValue(
      text: truncated,
      selection: TextSelection(baseOffset: selStart, extentOffset: selEnd),
    );
  }
}
