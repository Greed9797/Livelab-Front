/// Reusable form validators for client-side validation.
///
/// All validators return `null` when value is valid, or a pt_BR error message
/// when invalid. Most validators treat empty as valid (use `required` to
/// enforce non-empty); compose them via [FormValidators.composite].
///
/// Example:
/// ```dart
/// TextFormField(
///   validator: FormValidators.composite([
///     FormValidators.required(),
///     FormValidators.email,
///   ]),
/// )
/// ```
library;

class FormValidators {
  FormValidators._();

  // ───────────────────────────── Generic ─────────────────────────────

  /// Returns a validator that requires non-empty (after trim).
  /// Use as `validator: FormValidators.required()` (note the parens).
  static String? Function(String?) required([String message = 'Obrigatório']) {
    return (value) {
      if (value == null || value.trim().isEmpty) return message;
      return null;
    };
  }

  /// Composes multiple validators. Stops at the first failure.
  static String? Function(String?) composite(
    List<String? Function(String?)> validators,
  ) {
    return (value) {
      for (final v in validators) {
        final result = v(value);
        if (result != null) return result;
      }
      return null;
    };
  }

  /// Returns a validator that enforces minimum length (after trim).
  /// Empty values pass — combine with [required] when needed.
  static String? Function(String?) minLength(int min, [String? message]) {
    return (value) {
      if (value == null || value.trim().isEmpty) return null;
      if (value.trim().length < min) {
        return message ?? 'Mínimo $min caracteres';
      }
      return null;
    };
  }

  // ───────────────────────────── Email ───────────────────────────────

  /// RFC 5322 simplified email validation. Empty passes.
  static String? email(String? value) {
    if (value == null) return null;
    final trimmed = value.trim();
    if (trimmed.isEmpty) return null;
    // Simplified RFC 5322: local@domain.tld, at least one dot in domain.
    final pattern = RegExp(
      r'^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$',
    );
    if (!pattern.hasMatch(trimmed)) return 'E-mail inválido';
    return null;
  }

  // ───────────────────────────── Documents ───────────────────────────

  /// Accepts CPF (11 digits) or CNPJ (14 digits). Empty passes.
  /// Format-only — does NOT validate check digits (use validateCpfOrCnpj
  /// from doc_validators.dart for full check-digit validation).
  static String? cpfOrCnpj(String? value) {
    if (value == null) return null;
    final digits = value.replaceAll(RegExp(r'\D'), '');
    if (digits.isEmpty) return null;
    if (digits.length == 11 || digits.length == 14) return null;
    return 'CPF deve ter 11 dígitos ou CNPJ 14 dígitos';
  }

  /// CNPJ format-only (14 digits). Empty passes.
  static String? cnpj(String? value) {
    if (value == null) return null;
    final digits = value.replaceAll(RegExp(r'\D'), '');
    if (digits.isEmpty) return null;
    if (digits.length != 14) return 'CNPJ deve ter 14 dígitos';
    return null;
  }

  /// CPF format-only (11 digits). Empty passes.
  static String? cpf(String? value) {
    if (value == null) return null;
    final digits = value.replaceAll(RegExp(r'\D'), '');
    if (digits.isEmpty) return null;
    if (digits.length != 11) return 'CPF deve ter 11 dígitos';
    return null;
  }

  // ───────────────────────────── Phone ───────────────────────────────

  /// Brazilian phone: 10 (fixo) or 11 (celular) digits. Empty passes.
  /// Accepts masked input — counts only digits.
  static String? telefoneBr(String? value) {
    if (value == null) return null;
    final digits = value.replaceAll(RegExp(r'\D'), '');
    if (digits.isEmpty) return null;
    if (digits.length == 10 || digits.length == 11) return null;
    return 'Telefone inválido (10 ou 11 dígitos)';
  }

  // ───────────────────────────── Numbers ─────────────────────────────

  /// Numeric (accepts comma decimal). Empty passes.
  static String? number(String? value) {
    if (value == null) return null;
    final trimmed = value.trim();
    if (trimmed.isEmpty) return null;
    final n = double.tryParse(trimmed.replaceAll(',', '.'));
    if (n == null) return 'Valor inválido';
    return null;
  }

  /// Strictly positive number (> 0). Empty passes.
  static String? positiveNumber(String? value) {
    if (value == null) return null;
    final trimmed = value.trim();
    if (trimmed.isEmpty) return null;
    final n = double.tryParse(trimmed.replaceAll(',', '.'));
    if (n == null) return 'Valor inválido';
    if (n <= 0) return 'Valor deve ser maior que zero';
    return null;
  }

  /// Non-negative number (>= 0). Empty passes.
  static String? nonNegativeNumber(String? value) {
    if (value == null) return null;
    final trimmed = value.trim();
    if (trimmed.isEmpty) return null;
    final n = double.tryParse(trimmed.replaceAll(',', '.'));
    if (n == null) return 'Valor inválido';
    if (n < 0) return 'Valor não pode ser negativo';
    return null;
  }

  /// Percentage 0-100 inclusive. Empty passes.
  static String? percentage(String? value) {
    if (value == null) return null;
    final trimmed = value.trim();
    if (trimmed.isEmpty) return null;
    final n = double.tryParse(trimmed.replaceAll(',', '.'));
    if (n == null) return 'Valor inválido';
    if (n < 0 || n > 100) return 'Percentual deve estar entre 0 e 100';
    return null;
  }

  // ───────────────────────────── Password ────────────────────────────

  /// Password: min 8 chars, must contain a letter and a digit.
  /// Empty passes — combine with [required] for mandatory password fields.
  static String? strongPassword(String? value) {
    if (value == null || value.isEmpty) return null;
    if (value.length < 8) return 'Senha precisa de no mínimo 8 caracteres';
    if (!RegExp(r'[A-Za-z]').hasMatch(value)) {
      return 'Senha precisa de pelo menos uma letra';
    }
    if (!RegExp(r'\d').hasMatch(value)) {
      return 'Senha precisa de pelo menos um número';
    }
    return null;
  }

  // ───────────────────────────── TikTok ──────────────────────────────

  /// TikTok @username: 2-24 chars, letras/números/underscore/ponto.
  /// Strip leading @ se houver. Empty passes — combine com [required] quando
  /// obrigatório (ex: criação de contrato). Sincronizado com regex do backend
  /// (migration 075: clientes_tiktok_username_format / contratos_tiktok_username_format).
  static String? tiktokUsername(String? value) {
    if (value == null) return null;
    final trimmed = value.trim().replaceAll(RegExp(r'^@'), '');
    if (trimmed.isEmpty) return null;
    if (!RegExp(r'^[a-zA-Z0-9_.]{2,24}$').hasMatch(trimmed)) {
      return 'Formato inválido (2-24 chars: letras/números/_/.)';
    }
    return null;
  }
}
