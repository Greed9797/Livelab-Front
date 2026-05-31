import 'package:flutter/foundation.dart' show kReleaseMode, debugPrint;
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers/auth_provider.dart';

class _E2ECredential {
  final String email;
  final String password;

  const _E2ECredential(this.email, this.password);
}

const Map<String, _E2ECredential> _credentialsByRole = {
  'franqueador_master': _E2ECredential(
    String.fromEnvironment('E2E_EMAIL_MASTER', defaultValue: ''),
    String.fromEnvironment('E2E_PASSWORD_MASTER', defaultValue: ''),
  ),
  'franqueado': _E2ECredential(
    String.fromEnvironment('E2E_EMAIL_FRANQUEADO', defaultValue: ''),
    String.fromEnvironment('E2E_PASSWORD_FRANQUEADO', defaultValue: ''),
  ),
  'cliente_parceiro': _E2ECredential(
    String.fromEnvironment('E2E_EMAIL_CLIENTE', defaultValue: ''),
    String.fromEnvironment('E2E_PASSWORD_CLIENTE', defaultValue: ''),
  ),
};

String _normalizeRole(String role) {
  switch (role) {
    case 'master':
      return 'franqueador_master';
    case 'cliente':
      return 'cliente_parceiro';
    default:
      return role;
  }
}

Future<void> bootstrapE2EAuth(
  ProviderContainer container, {
  required String role,
}) async {
  // Defesa em profundidade: nunca executar em build release, mesmo se
  // o caller esquecer o guard kReleaseMode.
  assert(!kReleaseMode, 'E2E bootstrap não pode rodar em release build');
  if (kReleaseMode) return;

  final normalizedRole = _normalizeRole(role);
  final credential = _credentialsByRole[normalizedRole];

  if (credential == null) {
    debugPrint('[E2E] Role not configured');
    return;
  }

  if (credential.email.isEmpty || credential.password.isEmpty) {
    debugPrint('[E2E] Credentials not provided');
    return;
  }

  final ok = await container
      .read(authProvider.notifier)
      .login(credential.email, credential.password);

  if (!ok) {
    debugPrint('[E2E] Auto login failed');
  } else {
    debugPrint('[E2E] Auto login active');
  }
}
