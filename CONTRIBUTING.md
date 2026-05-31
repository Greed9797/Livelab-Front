# Contributing — LiveShop SaaS Frontend

## Branch model

- `master` — produção. Push direto bloqueado.
- `feat-ui-ux-architecture-v2` — branch ativa de UI redesign (em paralelo)
- `feat/<descricao>` — feature
- `fix/<descricao>` — bugfix
- `sec/<descricao>` — security fix
- `chore/<descricao>` — refactor, docs, deps

## Commits — Conventional Commits

Mesmo padrão do backend. Exemplos:
- `feat(financeiro): pills Mês/Trimestre/12 meses funcionais`
- `fix(analytics): cap deltas extremos em ±999%`
- `chore(deps): bump dio de 5.6 para 6.0`

## PR workflow

1. Branch a partir de `master` (ou `feat-ui-ux-architecture-v2` durante UI v2)
2. Commits Conventional Commits
3. Push + `gh pr create`
4. CI roda automaticamente (`frontend-ci.yml`):
   - `flutter pub get`
   - `flutter analyze --no-fatal-warnings --no-fatal-infos`
   - `flutter build web --release`
5. PR precisa: 1 review + CI verde
6. Merge via "Squash and merge"

## Antes de abrir PR

```bash
flutter analyze              # 0 errors esperado (warnings/infos OK)
flutter test                 # smoke tests devem passar
flutter build web --release  # confirma build prod
```

Para mudanças de UI: rodar manualmente em `flutter run -d chrome` com 3 roles
(franqueador_master, franqueado, cliente_parceiro) antes de pedir review.

## Regras de código

- **Nova screen** em `lib/screens/<modulo>/`, `ConsumerStatefulWidget`
- **Rota**: registrar em `lib/routes/app_routes.dart` com `RoleRouteGuard`
- **State**: Riverpod (Notifier/AsyncNotifier/FamilyAsyncNotifier/StreamProvider)
- **HTTP**: usar `ApiService.get/post/patch/delete` — nunca chamar Dio direto
- **Erros**: `ApiService.extractErrorMessage(e)` em SnackBar
- **Loading**: shimmer skeleton em listas, `CircularProgressIndicator` em full-screen
- **Datas**: transportar como String ISO entre back/front, formatar pt_BR no display
- **Money**: `(json['field'] as num? ?? 0).toDouble()` em `fromJson`
- **Theme**: usar tokens de `lib/theme/` ou `lib/livelab/theme/` — nunca hardcode

## Design system

- Cores: `AppColors.primary` (#E8673C); livelab via `LlTokens`
- Tipografia: `AppTypography` Inter + Instrument Serif
- Spacing: base 4px (`x1=4 ... x8=32`)
- Breakpoints: tablet=800, desktop=1100

## Nunca commitar

- Arquivos `.env`, `firebase-debug.log`
- Screenshots com PII (`flutter_*.png`)
- `build/` (gitignored)
- Tokens/keys em código

## A11y

- `WidgetsBinding.instance.ensureSemantics()` ativo em `main.dart` (semantics on por default)
- Sempre adicionar `semanticsLabel` em widgets sem texto visual (ícones de ação)
- Touch targets ≥ 44x44 em mobile

## Performance

- Bundle prod target: `main.dart.js` ≤ 15MB; canvaskit ~31MB (constraint Flutter)
- Imagens: usar formato WebP quando possível
- Listas grandes: `ListView.builder` com `itemCount`
- Polling: max 1 por screen, cancelar em `ref.onDispose`

## Hotfix workflow

1. `git checkout -b fix/<descricao>`
2. Fix + commit
3. `flutter analyze` + `flutter build web --release` local
4. Push + PR + reviewer aprova rápido
5. Merge → manualmente: `firebase deploy --only hosting --project livelab-3601f`
6. Smoke test em `https://livelab-3601f.web.app`
