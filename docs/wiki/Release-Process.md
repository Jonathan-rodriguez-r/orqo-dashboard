# Release Process

## Branching

- Local validation branch: `Dev`
- Production target branch: `main`

## Required Checks

1. Type safety
- `node ./node_modules/typescript/bin/tsc --noEmit`

2. Build validation
- `npm run build`

3. Documentation
- Update `CHANGELOG.md`
- Update relevant wiki pages under `docs/wiki`

4. PR quality
- Conventional commits
- Scope and rollback notes
- Explicit deployment impact

## Deploy Notes

- `main` deploys automatically to Vercel.
- Dashboard production domain: `dashboard.orqo.io`.

