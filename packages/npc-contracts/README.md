# @npc/contracts

NPC runtime v2 protocol v1: JSON Schemas plus strict TypeScript parsers.

- `schemas/` — JSON Schema 2020-12 source of truth.
- `src/types.ts` — post-parse TypeScript shapes (import type from browser code).
- `src/parse.ts` — Ajv-backed parsers with semantic checks and defaults (Node only).
- `examples/` — valid and invalid fixtures used by the test suite.
- `spec.md` — field semantics, defaults, error codes.

```ts
import { parseEvent, parseCommand, parseScene } from '@npc/contracts';

const event = parseEvent(JSON.parse(body));      // throws ContractError with code/path
const command = parseCommand(input);
const scene = parseScene(manifest, { bodyProfiles: ['body-companion'] });
```

Browser bundles should use `import type { Scene, EventEnvelope } from '@npc/contracts'` so the
Node-only Ajv loader is erased. Types alone are not runtime validation.

Tests: `npm test`; typecheck: `npx tsc --noEmit`.
