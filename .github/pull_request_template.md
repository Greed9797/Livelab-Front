## Summary

<!-- 1-3 bullets do que muda e porquê -->

## Changes

- `lib/screens/...`
- `lib/providers/...`

## Tipo

- [ ] feat (nova funcionalidade)
- [ ] fix (bugfix)
- [ ] sec (security)
- [ ] docs
- [ ] chore (refactor / deps / infra)
- [ ] test
- [ ] perf
- [ ] design (mudança visual)

## Test plan

- [ ] `flutter analyze` — 0 errors
- [ ] `flutter test` — smoke tests passam
- [ ] `flutter build web --release` — build OK
- [ ] Manual em `flutter run -d chrome` com 3 roles:
  - [ ] franqueador_master
  - [ ] franqueado
  - [ ] cliente_parceiro
- [ ] Mobile responsive (viewport 390x844) — sem overflow

## Screenshots

<!-- Antes / depois para mudanças visuais -->

## Checklist

- [ ] Conventional Commits
- [ ] Sem hardcoded de cores (usar `AppColors` ou `LlTokens`)
- [ ] Sem hardcoded de strings de mock ("Loja Teste", "Demo")
- [ ] Sem `onPressed: () {}` vazio (handlers funcionam ou botão removido)
- [ ] Empty states com CTA claro
- [ ] Loading skeletons em listas async
- [ ] A11y: `semanticsLabel` em widgets sem texto visual
- [ ] Touch targets ≥ 44x44 em mobile
- [ ] Tokens via barrel imports (`design_system/design_system.dart` ou `livelab/theme/`)

## Rollback plan

Firebase Hosting: Deploys → "Rollback to previous"
