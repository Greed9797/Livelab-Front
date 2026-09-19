# lib/providers/auth_provider.dart

- _sensitiveAuthWindow · constant · L6-L6 — const _sensitiveAuthWindow = Duration(minutes: 5);
- AuthState · class · L8-L28 — class AuthState
- AuthNotifier · class · L30-L172 — class AuthNotifier extends Notifier<AuthState>
- build · method · L32-L32 — AuthState build() => const AuthState();
- _persistSession · method · L34-L59 — Future<void> _persistSession(
- restoreSession · method · L61-L82 — Future<void> restoreSession() async
- login · method · L84-L100 — Future<bool> login(String email, String senha) async
- reauthenticate · method · L102-L136 — Future<bool> reauthenticate(String senhaAtual) async
- acceptInviteSession · method · L140-L142 — Future<void> acceptInviteSession(Map<String, dynamic> data) async
- completeOnboarding · method · L144-L150 — Future<void> completeOnboarding() async
- logout · method · L152-L163 — Future<void> logout() async
- expireSession · method · L165-L171 — Future<void> expireSession([
- authProvider · constant · L174-L175 — final authProvider =
