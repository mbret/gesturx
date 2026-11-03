# gesturx

Gesture recognizers for the browser, built on rxjs. The library is in `src/core/`. `src/demo/` is the demo site, which Vercel deploys from `main`.

## Checks

Run these before you push:

- `npm run check`: Biome.
- `npx tsc`: the type check, test files included.
- `npm test`: Vitest with happy-dom.
- `npm run check:readme`: the type check of the examples in `README.md`.
- `npm run build:lib`: the published build. It needs Node 24 or later. `.nvmrc` sets Node 26.

## Documentation

`README.md` is the only documentation.

- If a change alters what users see, update `README.md` in the same PR. That includes an export, an option, a default, an event, an event field and a known limitation.
- When a fix closes an issue in "Known limitations", remove its line.
- Write each `ts` example in `README.md` as a complete file, with its own imports from `gesturx`. `npm run check:readme` compiles each example on its own.

## Releases

semantic-release publishes from `main`. The commit type sets the release:

- `fix:` publishes a patch.
- `feat:` publishes a minor version.
- A `BREAKING CHANGE:` footer publishes a major version.
- `docs:`, `test:`, `build:`, `ci:`, `refactor:` and `chore:` publish nothing.
