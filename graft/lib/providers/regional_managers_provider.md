# lib/providers/regional_managers_provider.dart

- RegionalManagersNotifier · class · L8-L46 — class RegionalManagersNotifier extends AsyncNotifier<List<RegionalManager>>
- build · method · L10-L16 — Future<List<RegionalManager>> build() async
- _fetch · method · L18-L23 — Future<List<RegionalManager>> _fetch() async
- refresh · method · L25-L28 — Future<void> refresh() async
- setTenants · method · L31-L37 — Future<void> setTenants(String userId, List<String> tenantIds) async
- revokeTenant · method · L40-L45 — Future<void> revokeTenant(String userId, String tenantId) async
- regionalManagersProvider · constant · L48-L51 — final regionalManagersProvider =
