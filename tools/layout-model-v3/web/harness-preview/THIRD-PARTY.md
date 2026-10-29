# Third-party code inside the built bundles

The files `npc-h4a-core.js`, `npc-h4a-worker.js`, and `boundary.js` are
committed build artifacts (esbuild output). They inline code from the
following MIT-licensed packages. The source modules of this project remain
under the repository's MIT license.

| Component | Version | Where | License | Copyright |
|---|---|---|---|---|
| `@pixiv/three-vrm` | 3.5.5 | `npc-h4a-core.js` | MIT | pixiv Inc. |
| `astar-minimal` | — | `npc-h4a-core.js`, `npc-h4a-worker.js` | MIT | Robert Sirois |
| `ajv` | 8.x | `boundary.js` | MIT | Evgeny Poberezkin |
| `ajv-formats` | — | `boundary.js` | MIT | Evgeny Poberezkin |

`three` (three.js) is **not** inlined: the bundles keep it as an external
import (`import * as THREE from "three"`) resolved by the page's import map.
three.js is MIT, Copyright © 2010-2026 three.js authors.

Upstream links:

- https://github.com/pixiv/three-vrm
- https://github.com/rpsirois/astar-minimal
- https://github.com/ajv-validator/ajv
- https://github.com/ajv-validator/ajv-formats
- https://github.com/mrdoob/three.js

These bundles are prebuilt artifacts. Rebuilding them requires the upstream
scene modules (`npc-three`, `npc-scene`) which are not part of this
repository; treat the committed bundles as the reference preview build.
