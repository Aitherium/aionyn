// Vitest setup: React 18 act() environment for every jsdom test. AGPL-3.0-only.
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
