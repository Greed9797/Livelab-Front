// =============================================================
// F4: Redefinir senha — pública, lê ?token=... da URL.
// =============================================================

import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';

import '../../routes/app_routes.dart';
import '../../services/api_service.dart';
import '_auth_visual.dart';

class RedefinirSenhaScreen extends StatefulWidget {
  /// Token opcional via construtor. Caso ausente, tenta extrair da URL (web).
  final String? initialToken;
  const RedefinirSenhaScreen({super.key, this.initialToken});

  @override
  State<RedefinirSenhaScreen> createState() => _RedefinirSenhaScreenState();
}

class _RedefinirSenhaScreenState extends State<RedefinirSenhaScreen> {
  final _senhaCtrl = TextEditingController();
  final _confirmCtrl = TextEditingController();
  bool _loading = false;
  String? _localError;
  String? _token;

  @override
  void initState() {
    super.initState();
    _token = widget.initialToken ?? _extractTokenFromUrl();
    if (_token == null || _token!.isEmpty) {
      _localError =
          'Link inválido. Solicite um novo em "Esqueci minha senha".';
    }
  }

  String? _extractTokenFromUrl() {
    if (!kIsWeb) return null;
    try {
      // ignore: avoid_web_libraries_in_flutter
      final href = Uri.base.toString();
      return Uri.parse(href).queryParameters['token'];
    } catch (_) {
      return null;
    }
  }

  @override
  void dispose() {
    _senhaCtrl.dispose();
    _confirmCtrl.dispose();
    super.dispose();
  }

  String? _validate() {
    final s = _senhaCtrl.text;
    final c = _confirmCtrl.text;
    if (s.length < 8) return 'A senha deve ter no mínimo 8 caracteres.';
    if (!RegExp(r'[A-Za-z]').hasMatch(s) || !RegExp(r'\d').hasMatch(s)) {
      return 'A senha precisa ter letra e número.';
    }
    if (s != c) return 'As senhas não coincidem.';
    return null;
  }

  Future<void> _submit() async {
    if (_token == null || _token!.isEmpty) {
      setState(() => _localError = 'Token ausente — abra o link do e-mail.');
      return;
    }
    final err = _validate();
    if (err != null) {
      setState(() => _localError = err);
      return;
    }
    setState(() {
      _loading = true;
      _localError = null;
    });

    try {
      await ApiService.post('/auth/redefinir-senha', data: {
        'token': _token,
        'nova_senha': _senhaCtrl.text,
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Senha redefinida com sucesso. Faça login.'),
          backgroundColor: LL.success,
        ),
      );
      Navigator.of(context)
          .pushNamedAndRemoveUntil(AppRoutes.login, (_) => false);
    } catch (e) {
      if (!mounted) return;
      setState(() => _localError = ApiService.extractErrorMessage(e));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AuthScaffold(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const AuthHeader(
            eyebrow: 'NOVA SENHA',
            titlePrefix: 'Defina sua',
            titleAccent: 'nova senha',
            subtitle:
                'Use no mínimo 8 caracteres com letra e número. Ao confirmar, todas as sessões anteriores serão encerradas.',
          ),
          const SizedBox(height: 32),
          AuthField(
            label: 'Nova senha',
            hint: '••••••••',
            controller: _senhaCtrl,
            obscure: true,
            autofocus: true,
          ),
          const SizedBox(height: 16),
          AuthField(
            label: 'Confirmar nova senha',
            hint: '••••••••',
            controller: _confirmCtrl,
            obscure: true,
            onSubmitted: (_) => _submit(),
          ),
          if (_localError != null) ...[
            const SizedBox(height: 14),
            AuthErrorBanner(message: _localError!),
          ],
          const SizedBox(height: 20),
          AuthPrimaryButton(
            label: 'Redefinir senha',
            isLoading: _loading,
            onTap: _submit,
          ),
          const SizedBox(height: 12),
          const Center(child: AuthBackToLogin()),
        ],
      ),
    );
  }
}
