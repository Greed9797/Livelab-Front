// =============================================================
// F4: Aceitar convite — pública, define senha + auto-login.
// =============================================================

import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../providers/auth_provider.dart';
import '../../routes/app_routes.dart';
import '../../services/api_service.dart';
import '_auth_visual.dart';

class AceitarConviteScreen extends ConsumerStatefulWidget {
  final String? initialToken;
  const AceitarConviteScreen({super.key, this.initialToken});

  @override
  ConsumerState<AceitarConviteScreen> createState() =>
      _AceitarConviteScreenState();
}

class _AceitarConviteScreenState extends ConsumerState<AceitarConviteScreen> {
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
          'Link de convite inválido. Peça um novo ao administrador da sua unidade.';
    }
  }

  String? _extractTokenFromUrl() {
    if (!kIsWeb) return null;
    try {
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
      setState(() => _localError = 'Token ausente.');
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
      final resp = await ApiService.post('/auth/aceitar-convite', data: {
        'token': _token,
        'nova_senha': _senhaCtrl.text,
      });
      final data = Map<String, dynamic>.from(resp.data as Map);

      // Auto-login — persiste tokens + user no provider.
      await ref.read(authProvider.notifier).acceptInviteSession(data);

      if (!mounted) return;
      final user = ref.read(authProvider).user;
      final route = AppRoutes.routeForRole(
        user?.papel,
        onboardingCompleted: user?.onboardingCompleted ?? false,
      );
      Navigator.of(context).pushNamedAndRemoveUntil(route, (_) => false);
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
            eyebrow: 'BEM-VINDO AO LIVESHOP',
            titlePrefix: 'Defina sua',
            titleAccent: 'senha',
            subtitle:
                'Você foi convidado para acessar a plataforma. Crie uma senha forte para começar — você entra automaticamente após confirmar.',
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
            label: 'Confirmar senha',
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
            label: 'Criar senha e entrar',
            isLoading: _loading,
            onTap: _submit,
          ),
          const SizedBox(height: 12),
          const Center(child: AuthBackToLogin(label: 'Já tenho conta')),
        ],
      ),
    );
  }
}
