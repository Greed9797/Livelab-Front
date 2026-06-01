import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/user.dart';
import '../services/api_service.dart';
import '../services/sentry_service.dart';

const _sensitiveAuthWindow = Duration(minutes: 5);

class AuthState {
  final User? user;
  final bool isLoading;
  final String? error;
  final DateTime? lastSensitiveAuthAt;

  const AuthState({
    this.user,
    this.isLoading = false,
    this.error,
    this.lastSensitiveAuthAt,
  });

  bool get isAuthenticated => user != null;

  bool get hasRecentSensitiveAuth {
    final lastAuth = lastSensitiveAuthAt;
    if (lastAuth == null) return false;
    return DateTime.now().difference(lastAuth) <= _sensitiveAuthWindow;
  }
}

class AuthNotifier extends Notifier<AuthState> {
  @override
  AuthState build() => const AuthState();

  Future<void> _persistSession(
    Map<String, dynamic> data, {
    DateTime? lastSensitiveAuthAt,
  }) async {
    await ApiService.saveTokens(
      data['access_token'] as String,
      data['refresh_token'] as String,
    );

    final userJson = Map<String, dynamic>.from(data['user'] as Map);
    await ApiService.saveUser(userJson);

    final user = User.fromJson(userJson);
    state = AuthState(
      user: user,
      lastSensitiveAuthAt: lastSensitiveAuthAt,
    );

    // Sentry user tagging — no-op se SENTRY_DSN ausente.
    await SentryService.setUser(
      id: user.id,
      email: user.email,
      papel: user.papel,
      tenantId: user.tenantId,
    );
  }

  Future<void> restoreSession() async {
    try {
      final token = await ApiService.getAccessToken();
      final userJson = await ApiService.getSavedUser();

      if (token == null || userJson == null) {
        if (token != null || userJson != null) {
          await ApiService.clearTokens();
        }
        state = const AuthState();
        return;
      }

      // Usa o token armazenado diretamente. Se expirado,
      // o interceptor de 401 fará refresh automaticamente na primeira chamada.
      // Isso evita destruir a sessão quando o backend está temporariamente offline.
      state = AuthState(user: User.fromJson(userJson));
    } catch (_) {
      await ApiService.clearTokens();
      state = const AuthState();
    }
  }

  Future<bool> login(String email, String senha) async {
    state = const AuthState(isLoading: true);
    try {
      final resp = await ApiService.post('/auth/login', data: {
        'email': email,
        'senha': senha,
      });
      await _persistSession(
        resp.data as Map<String, dynamic>,
        lastSensitiveAuthAt: DateTime.now(),
      );
      return true;
    } catch (e) {
      state = AuthState(error: ApiService.extractErrorMessage(e));
      return false;
    }
  }

  Future<bool> reauthenticate(String senhaAtual) async {
    final currentUser = state.user;
    if (currentUser == null) {
      state = const AuthState(error: 'Sessão inválida. Faça login novamente.');
      return false;
    }

    try {
      final resp = await ApiService.post('/auth/login', data: {
        'email': currentUser.email,
        'senha': senhaAtual,
      });

      final data = resp.data as Map<String, dynamic>;
      final userJson = Map<String, dynamic>.from(data['user'] as Map);
      final reauthUser = User.fromJson(userJson);

      if (reauthUser.id != currentUser.id ||
          reauthUser.tenantId != currentUser.tenantId) {
        throw const ApiException(
          'Falha ao confirmar a identidade da sessão atual.',
        );
      }

      await _persistSession(data, lastSensitiveAuthAt: DateTime.now());
      return true;
    } catch (e) {
      state = AuthState(
        user: currentUser,
        error: ApiService.extractErrorMessage(e),
        lastSensitiveAuthAt: state.lastSensitiveAuthAt,
      );
      return false;
    }
  }

  /// F4: Auto-login após aceitar convite. Recebe o payload já validado
  /// pelo endpoint /auth/aceitar-convite (tokens + user).
  Future<void> acceptInviteSession(Map<String, dynamic> data) async {
    await _persistSession(data, lastSensitiveAuthAt: DateTime.now());
  }

  Future<void> completeOnboarding() async {
    final user = state.user;
    if (user == null) return;
    final updated = user.copyWith(onboardingCompleted: true);
    await ApiService.saveUser(updated.toJson());
    state = AuthState(user: updated, lastSensitiveAuthAt: state.lastSensitiveAuthAt);
  }

  Future<void> logout() async {
    // Revogar sessão no servidor ANTES de limpar tokens locais.
    // Garante que o refresh_token seja invalidado mesmo se a limpeza local falhar.
    try {
      await ApiService.post('/auth/logout');
    } catch (_) {
      // Ignora falhas de rede — limpa tokens localmente de qualquer forma.
    }
    await ApiService.clearTokens();
    await SentryService.clearUser();
    state = const AuthState();
  }

  Future<void> expireSession([
    String message = 'Sessão expirada. Faça login novamente.',
  ]) async {
    await ApiService.clearTokens();
    await SentryService.clearUser();
    state = AuthState(error: message);
  }
}

final authProvider =
    NotifierProvider<AuthNotifier, AuthState>(AuthNotifier.new);
