# Deploy handoff — archived

This page retains the key facts from the July 3, 2026 deployment plan for
historical reference: frontend commit `9ab97b8` on `migration/react-vercel`,
paired with backend commit `d7a47f5` and migration 118. Its verification results
and publication and rollback instructions are obsolete. Do not use them to
deploy or roll back production.

The canonical current record is [the frontend production release from
October 26, 2026](../docs/production-release-2026-10-26.md). It records the
published frontend SHA, API state, workflow run, verification, and current
limits. Production deploys now run through
`../.github/workflows/frontend-deploy.yml`, which performs a remote Vercel
build after its quality gates.
