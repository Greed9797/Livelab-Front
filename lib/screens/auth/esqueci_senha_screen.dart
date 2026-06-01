// =============================================================
// F4: Esqueci minha senha — pública, sem RoleRouteGuard.
// Backend sempre retorna mensagem genérica (anti-enumeration).
// =============================================================

import 'package:flutter/material.dart';

import '../../services/api_service.dart';
import '_auth_visual.dart';

class EsqueciSenhaScreen extends StatefulWidget {
  const EsqueciSenhaScreen({super.key});

  @override
  State<EsqueciSenhaScreen> createState() => _EsqueciSenhaScreenState();
}

class _EsqueciSenhaScreenState extends State<EsqueciSenhaScreen> {
  final _emailCtrl = TextEditingController();
  bool _loading = false;
  bool _sent = false;
  String? _localError;

  @override
  void dispose() {
    _emailCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final email = _emailCtrl.text.trim();
    if (email.isEmpty || !email.contains('@') || !email.contains('.')) {
      setState(() => _localError = 'E-mail inválido.');
      return;
    }
    setState(() {
      _loading = true;
      _localError = null;
    });

    try {
      // Backend sempre retorna 200 com mensagem genérica — não diferenciamos
      // entre "email existe" e "não existe" pra evitar enumeration.
      await ApiService.post('/auth/esqueci-senha', data: {'email': email});
      if (!mounted) return;
      setState(() => _sent = true);
    } catch (e) {
      // Mesmo em erro genuíno (rede), mostramos a mesma mensagem positiva
      // pra preservar o anti-enumeration. Logamos pra debug.
      debugPrint('[esqueci-senha] erro: $e');
      if (!mounted) return;
      setState(() => _sent = true);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AuthScaffold(
      child: _sent ? _buildSentState(context) : _buildFormState(context),
    );
  }

  Widget _buildFormState(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const AuthHeader(
          eyebrow: 'RECUPERAR ACESSO',
          titlePrefix: 'Esqueceu a',
          titleAccent: 'senha?',
          subtitle:
              'Informe o e-mail da sua conta. Enviaremos um link seguro para você criar uma nova senha.',
        ),
        const SizedBox(height: 32),
        AuthField(
          label: 'E-mail',
          hint: 'voce@exemplo.com',
          controller: _emailCtrl,
          keyboardType: TextInputType.emailAddress,
          autofocus: true,
          onSubmitted: (_) => _submit(),
        ),
        if (_localError != null) ...[
          const SizedBox(height: 14),
          AuthErrorBanner(message: _localError!),
        ],
        const SizedBox(height: 20),
        AuthPrimaryButton(
          label: 'Enviar link',
          isLoading: _loading,
          onTap: _submit,
        ),
        const SizedBox(height: 12),
        const Center(child: AuthBackToLogin()),
      ],
    );
  }

  Widget _buildSentState(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const AuthHeader(
          eyebrow: 'CHECAGEM ENVIADA',
          titlePrefix: 'Verifique seu',
          titleAccent: 'e-mail',
        ),
        const SizedBox(height: 24),
        const AuthSuccessBanner(
          message:
              'Se este e-mail estiver cadastrado, você receberá o link em breve. O link expira em 1 hora.',
        ),
        const SizedBox(height: 24),
        const Center(child: AuthBackToLogin()),
      ],
    );
  }
}
