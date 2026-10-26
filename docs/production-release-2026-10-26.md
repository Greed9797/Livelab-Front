# Frontend production release — October 26, 2026

This page records the frontend and related backend state verified in production
on October 26, 2026. Use it to distinguish the published release from a local
checkout.

## Published frontend

- Domain: [app.grupolivelab.com.br](https://app.grupolivelab.com.br)
- Vercel project: `liveshop-saas-frontend-react`
- Vercel scope verified for this release: `leonardoames-projects`
- Branch: `feat/multi-apresentadora-agenda`
- Commit: `3eae78bfa269dc610f7e2028031e139a1b980597`
- `version.json` value: `1793054319509`
- GitHub Actions: [run 40413624195](https://github.com/Greed9797/Livelab-Front/actions/runs/40413624195)
- Validation: typecheck passed, 1,034 tests across 142 test files passed, build
  passed, and the remote Vercel production deploy completed.

The workflow in [frontend-deploy.yml](../.github/workflows/frontend-deploy.yml)
runs on pushes to `feat/multi-apresentadora-agenda` or `migration/react-vercel`,
and supports `workflow_dispatch`. It runs typecheck, tests, and build before
deploying. It injects the production API URL and uses Vercel's remote build.
Do not publish a local `--prebuilt` build: Vercel's sensitive `VITE_API_URL`
value can be replaced by the literal `[SENSITIVE]` in a local bundle.

The primary checkout `codex/cliente-portal-marca` at `2cbf087` is not this
production release and can contain uncommitted work. A route or feature present
in that checkout is not evidence that production serves it. Compare against the
published commit when documenting deployed behavior.

## CRM and training behavior in this release

- Clientes/Carteira is at `/clientes`; the CRM is at `/clientes/crm`.
- Legacy `/master/crm` and `/leads` routes redirect to `/clientes/crm`.
- The CRM supports lead creation and editing, stage changes, contact and task
  logging, win/loss, and deletion. API requests use the authenticated session
  and tenant authorization. The CRM does not automatically synchronize leads
  with an external service.
- Authenticated users can access training content under `/conhecimento`.
  `franqueador_master` can manage training at
  `/conhecimento/treinamentos/gerenciar`. The report at
  `/conhecimento/treinamentos/relatorio` is available to
  `franqueador_master`, `franqueado`, and `gerente`, within the user's tenant
  scope.
- Deleting a training lesson or trail does not delete its remote video.

## Related backend state

- Repository: `Greed9797/Livelab-back`
- Production commit: `894e903b57610b8a38431b3a1e220ecbe4499089`
- Migration 186 is applied; the production API health check passed.
- API base URL: `https://liveshop-saas-api-production.up.railway.app/v1`

## Verification limits

The release checks did not include a live authenticated smoke test as both a
franchisee and a master user. The existing `cliente_parceiro` test session was
redirected to `/cliente`. Training player demos passed locally; the production
Panda account's own domain was not revalidated. The workflow run and version
timestamp confirm publication, but do not replace those role-specific checks.

## Confirming a later deploy

Read `https://app.grupolivelab.com.br/version.json` and compare its `v` value
with the value recorded for the release under review. Then open the app and
check the roles and flows changed by that deployment. The GitHub Actions run
should also show that typecheck, tests, build, and remote deployment passed.
