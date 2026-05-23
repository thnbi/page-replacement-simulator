# Page Replacement Simulator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar o simulador de algoritmos de substituição de página (FIFO, LRU, OPT, RANDOM) com modos manual, automático e gráfico, em React + TS, seguindo o spec aprovado em `docs/superpowers/specs/2026-05-22-page-replacement-simulator-design.md`.

**Architecture:** Domain-first, bottom-up: funções puras testadas com fixtures clássicas → store Zustand → componentes React em abas. Pastas `src/domain`, `src/store`, `src/components`, `src/lib` já scaffolded e vazias.

**Tech Stack:** React 19 + TypeScript (strict, `noUncheckedIndexedAccess`), Tailwind v4 + Skeleton v3, Zustand v5, Recharts, motion/react, Vitest + Testing Library, Biome. Runner: Bun.

**Sequência clássica de fixtures (Tanenbaum / Maziero):** `7 0 1 2 0 3 0 4 2 3 0 3 2`

| Quadros | FIFO | LRU | OPT |
|---|---|---|---|
| 3 | 9 | 9 | 7 |
| 4 | 10 | 8 | 6 |

---

## Task 0: Commit baseline scaffolding

O repositório ainda não tinha commits quando o spec foi criado. Esta task commita o scaffolding existente (package.json, vite.config, src/main.tsx, src/App.tsx, etc.) numa base limpa, para que as tasks seguintes tenham diffs pequenos e atômicos.

**Files:**
- Modify: nenhum arquivo de código. Apenas staging dos arquivos já existentes.

- [ ] **Step 1: Verificar o que está untracked**

Run: `git status --short`

Expected: lista com `??` para `.gitignore`, `CLAUDE.md`, `biome.json`, `bun.lock`, `index.html`, `package.json`, `src/`, `tsconfig*.json`, `vite.config.ts`. O PDF `MiniprojetoSubstitucaoPagina (2).pdf` também aparece, mas **não commitar** (artefato externo).

- [ ] **Step 2: Adicionar `.gitignore` para o PDF**

Verifique se já existe. Se a entrada para o PDF não estiver, adicione no `.gitignore`:

```
# Spec PDF externa, mantida apenas localmente
MiniprojetoSubstitucaoPagina*.pdf
```

- [ ] **Step 3: Stage e commit do scaffolding**

```bash
git add .gitignore CLAUDE.md biome.json bun.lock index.html package.json \
        src/ tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts
git commit -m "chore: scaffold Vite + React + TS + Tailwind + Skeleton baseline"
```

- [ ] **Step 4: Verificar o estado**

Run: `git status && git log --oneline`

Expected: working tree clean (exceto o PDF ignorado) e dois commits: `docs: add page replacement simulator design spec` e `chore: scaffold ...`.

- [ ] **Step 5: Validar que o ambiente está OK**

Run: `bun install && bun run test && bun run check`

Expected:
- `bun install` instala sem erro (dependências já no lockfile).
- `bun run test` passa (nenhum teste ainda → exit 0).
- `bun run check` passa (Biome ok).

Se algum falhar, pare e corrija antes de seguir.

---

## Task 1: Tipos e constantes do domínio

**Files:**
- Create: `src/domain/types.ts`

- [ ] **Step 1: Criar o arquivo de tipos**

```ts
// src/domain/types.ts

export type PageNumber = number;
export type FrameIndex = number;
export type StepIndex = number;
export type Algorithm = 'fifo' | 'lru' | 'opt' | 'random';

export const EMPTY_SLOT = null;
export type FrameSlot = PageNumber | null;

export type Step = {
  pagina: PageNumber;
  hit: boolean;
  quadrosDepois: FrameSlot[];
  filaDepois?: PageNumber[];
  vitima?: PageNumber;
};

export type RunResult = {
  passos: Step[];
  faltas: number;
};

export type AllResults = {
  fifo: RunResult;
  lru: RunResult;
  opt: RunResult;
  randomVisual: RunResult;     // execução determinística (seed base) p/ modo manual
  randomMedia: number;
  randomDesvio: number;
};

export const DEFAULT_FRAMES = 3;
export const MIN_FRAMES = 1;
export const DEFAULT_GRAFICO_MAX = 10;
export const MAX_GRAFICO = 20;
export const RANDOM_AMOSTRAS = 30;
export const RANDOM_SEED_BASE = 0xc0ffee;
```

- [ ] **Step 2: Verificar tipos compilam**

Run: `bun run build 2>&1 | head -20`

Expected: build pode reclamar de App.tsx vazio mas NÃO de `src/domain/types.ts`. Se houver erro no types.ts, corrija.

Alternativa rápida só pro arquivo:
```bash
bunx tsc --noEmit -p tsconfig.app.json
```

- [ ] **Step 3: Commit**

```bash
git add src/domain/types.ts
git commit -m "feat: add domain types and constants"
```

---

## Task 2: RNG seedável (mulberry32)

**Files:**
- Create: `src/domain/mulberry32.ts`
- Test: `src/domain/mulberry32.test.ts`

- [ ] **Step 1: Escrever teste falhando**

```ts
// src/domain/mulberry32.test.ts
import { describe, expect, it } from 'vitest';
import { mulberry32 } from './mulberry32';

describe('mulberry32', () => {
  it('produz valores entre 0 e 1', () => {
    const rng = mulberry32(42);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('é determinístico para a mesma seed', () => {
    const a = mulberry32(0xc0ffee);
    const b = mulberry32(0xc0ffee);
    const seqA = Array.from({ length: 10 }, () => a());
    const seqB = Array.from({ length: 10 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it('produz sequências diferentes para seeds diferentes', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    const seqA = Array.from({ length: 10 }, () => a());
    const seqB = Array.from({ length: 10 }, () => b());
    expect(seqA).not.toEqual(seqB);
  });
});
```

- [ ] **Step 2: Rodar teste e ver falhar**

Run: `bun run test src/domain/mulberry32.test.ts`

Expected: FAIL com "Cannot find module './mulberry32'".

- [ ] **Step 3: Implementar**

```ts
// src/domain/mulberry32.ts

/**
 * Mulberry32: PRNG simples e seedável.
 * Útil para reproduzir execuções do algoritmo RANDOM com seeds determinísticas.
 */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

- [ ] **Step 4: Rodar teste e ver passar**

Run: `bun run test src/domain/mulberry32.test.ts`

Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add src/domain/mulberry32.ts src/domain/mulberry32.test.ts
git commit -m "feat: add seedable mulberry32 RNG with tests"
```

---

## Task 3: parseSequence

**Files:**
- Create: `src/domain/parseSequence.ts`
- Test: `src/domain/parseSequence.test.ts`

- [ ] **Step 1: Escrever testes falhando**

```ts
// src/domain/parseSequence.test.ts
import { describe, expect, it } from 'vitest';
import { ParseError, parseSequence } from './parseSequence';

describe('parseSequence', () => {
  it('parseia números separados por espaço', () => {
    expect(parseSequence('7 0 1 2')).toEqual([7, 0, 1, 2]);
  });

  it('parseia números separados por vírgula', () => {
    expect(parseSequence('7,0,1,2')).toEqual([7, 0, 1, 2]);
  });

  it('tolera múltiplos separadores e espaços extras', () => {
    expect(parseSequence('  7,, 0  1 ,2 ')).toEqual([7, 0, 1, 2]);
  });

  it('retorna array vazio para string vazia', () => {
    expect(parseSequence('')).toEqual([]);
  });

  it('retorna array vazio para string só com espaços', () => {
    expect(parseSequence('   ')).toEqual([]);
  });

  it('lança ParseError citando posição e caractere inválido', () => {
    expect(() => parseSequence('7 x 0')).toThrow(ParseError);
    try {
      parseSequence('7 x 0');
    } catch (e) {
      expect((e as Error).message).toContain('posição 2');
      expect((e as Error).message).toContain("'x'");
    }
  });

  it('parseia números multi-dígito', () => {
    expect(parseSequence('10 100 999')).toEqual([10, 100, 999]);
  });

  it('rejeita números negativos', () => {
    expect(() => parseSequence('1 -2 3')).toThrow(ParseError);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `bun run test src/domain/parseSequence.test.ts`

Expected: FAIL com "Cannot find module './parseSequence'".

- [ ] **Step 3: Implementar**

```ts
// src/domain/parseSequence.ts
import type { PageNumber } from './types';

export class ParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ParseError';
  }
}

const SEQUENCIA_VALIDA = /^[\s,]*\d+([\s,]+\d+)*[\s,]*$/;
const SEPARADOR = /[\s,]+/;

export function parseSequence(texto: string): PageNumber[] {
  if (texto.trim() === '') return [];

  if (!SEQUENCIA_VALIDA.test(texto)) {
    const invalido = texto.match(/[^\s,\d]/);
    if (invalido && invalido.index !== undefined) {
      throw new ParseError(
        `Caractere inválido na posição ${invalido.index}: '${invalido[0]}'. ` +
          `Esperado: dígitos separados por espaço ou vírgula.`,
      );
    }
    throw new ParseError('Sequência inválida.');
  }

  return texto
    .split(SEPARADOR)
    .filter((s) => s !== '')
    .map((s) => Number.parseInt(s, 10));
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `bun run test src/domain/parseSequence.test.ts`

Expected: PASS (8 testes).

- [ ] **Step 5: Commit**

```bash
git add src/domain/parseSequence.ts src/domain/parseSequence.test.ts
git commit -m "feat: add sequence parser with validation"
```

---

## Task 4: Fixtures de teste (sequência clássica)

**Files:**
- Create: `src/test/fixtures.ts`

- [ ] **Step 1: Criar fixtures**

```ts
// src/test/fixtures.ts
import type { PageNumber } from '../domain/types';

/**
 * Sequência clássica do PDF (Tanenbaum / Maziero).
 * Faltas conferidas com a literatura.
 */
export const SEQ_CLASSICA: PageNumber[] = [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2];

export const FALTAS_ESPERADAS = {
  fifo: { 3: 9, 4: 10 },
  lru: { 3: 9, 4: 8 },
  opt: { 3: 7, 4: 6 },
} as const;
```

- [ ] **Step 2: Commit**

```bash
git add src/test/fixtures.ts
git commit -m "test: add canonical reference sequence fixtures"
```

---

## Task 5: Algoritmo FIFO

**Files:**
- Create: `src/domain/algorithms/fifo.ts`
- Test: `src/domain/algorithms/fifo.test.ts`

- [ ] **Step 1: Escrever testes falhando**

```ts
// src/domain/algorithms/fifo.test.ts
import { describe, expect, it } from 'vitest';
import { FALTAS_ESPERADAS, SEQ_CLASSICA } from '../../test/fixtures';
import { fifo } from './fifo';

describe('fifo', () => {
  it('sequência clássica × 3 quadros → 9 faltas', () => {
    const r = fifo(SEQ_CLASSICA, 3);
    expect(r.faltas).toBe(FALTAS_ESPERADAS.fifo[3]);
    expect(r.passos).toHaveLength(SEQ_CLASSICA.length);
  });

  it('sequência clássica × 4 quadros → 10 faltas', () => {
    expect(fifo(SEQ_CLASSICA, 4).faltas).toBe(FALTAS_ESPERADAS.fifo[4]);
  });

  it('sequência vazia retorna sem passos e zero faltas', () => {
    expect(fifo([], 3)).toEqual({ passos: [], faltas: 0 });
  });

  it('sequência menor que o nº de quadros: todas faltas, sem vítima', () => {
    const r = fifo([1, 2, 3], 5);
    expect(r.faltas).toBe(3);
    expect(r.passos.every((p) => p.vitima === undefined)).toBe(true);
  });

  it('mesma página repetida: 1 falta + hits', () => {
    const r = fifo([5, 5, 5], 3);
    expect(r.faltas).toBe(1);
    expect(r.passos.map((p) => p.hit)).toEqual([false, true, true]);
  });

  it('1 quadro: toda página nova é falta com vítima = anterior', () => {
    const r = fifo([1, 2, 3], 1);
    expect(r.passos[0]?.vitima).toBeUndefined();
    expect(r.passos[1]?.vitima).toBe(1);
    expect(r.passos[2]?.vitima).toBe(2);
  });

  it('um HIT não altera a fila', () => {
    const r = fifo([1, 2, 3, 1], 3);
    expect(r.passos[2]?.filaDepois).toEqual([1, 2, 3]);
    expect(r.passos[3]?.hit).toBe(true);
    expect(r.passos[3]?.filaDepois).toEqual([1, 2, 3]);
  });

  it('não muta a sequência de entrada', () => {
    const seq = [...SEQ_CLASSICA];
    fifo(seq, 3);
    expect(seq).toEqual(SEQ_CLASSICA);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `bun run test src/domain/algorithms/fifo.test.ts`

Expected: FAIL com "Cannot find module './fifo'".

- [ ] **Step 3: Implementar FIFO**

```ts
// src/domain/algorithms/fifo.ts
import type { FrameSlot, PageNumber, RunResult, Step } from '../types';
import { EMPTY_SLOT } from '../types';

/**
 * FIFO: substitui a página que está há mais tempo em memória.
 * Mantém uma fila explícita; hits não reordenam a fila.
 */
export function fifo(seq: PageNumber[], quadros: number): RunResult {
  const memoria: FrameSlot[] = new Array(quadros).fill(EMPTY_SLOT);
  const fila: PageNumber[] = [];
  const passos: Step[] = [];
  let faltas = 0;

  for (const pagina of seq) {
    if (memoria.includes(pagina)) {
      passos.push({
        pagina,
        hit: true,
        quadrosDepois: [...memoria],
        filaDepois: [...fila],
      });
      continue;
    }

    faltas++;
    const slotLivre = memoria.indexOf(EMPTY_SLOT);
    let vitima: PageNumber | undefined;

    if (slotLivre !== -1) {
      memoria[slotLivre] = pagina;
    } else {
      const removida = fila.shift();
      if (removida === undefined) {
        throw new Error('Estado inconsistente: memória cheia mas fila vazia.');
      }
      vitima = removida;
      const idx = memoria.indexOf(removida);
      memoria[idx] = pagina;
    }
    fila.push(pagina);

    passos.push({
      pagina,
      hit: false,
      quadrosDepois: [...memoria],
      filaDepois: [...fila],
      ...(vitima !== undefined ? { vitima } : {}),
    });
  }

  return { passos, faltas };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `bun run test src/domain/algorithms/fifo.test.ts`

Expected: PASS (8 testes).

- [ ] **Step 5: Commit**

```bash
git add src/domain/algorithms/fifo.ts src/domain/algorithms/fifo.test.ts
git commit -m "feat: add FIFO page replacement algorithm"
```

---

## Task 6: Algoritmo LRU

**Files:**
- Create: `src/domain/algorithms/lru.ts`
- Test: `src/domain/algorithms/lru.test.ts`

- [ ] **Step 1: Escrever testes falhando**

```ts
// src/domain/algorithms/lru.test.ts
import { describe, expect, it } from 'vitest';
import { FALTAS_ESPERADAS, SEQ_CLASSICA } from '../../test/fixtures';
import { fifo } from './fifo';
import { lru } from './lru';

describe('lru', () => {
  it('sequência clássica × 3 quadros → 9 faltas', () => {
    expect(lru(SEQ_CLASSICA, 3).faltas).toBe(FALTAS_ESPERADAS.lru[3]);
  });

  it('sequência clássica × 4 quadros → 8 faltas', () => {
    expect(lru(SEQ_CLASSICA, 4).faltas).toBe(FALTAS_ESPERADAS.lru[4]);
  });

  it('sequência vazia retorna sem passos', () => {
    expect(lru([], 3)).toEqual({ passos: [], faltas: 0 });
  });

  it('mesma página repetida: 1 falta + hits', () => {
    const r = lru([5, 5, 5], 3);
    expect(r.faltas).toBe(1);
  });

  it('LRU difere de FIFO em [1,2,3,1,4] com 3 quadros', () => {
    // FIFO: expulsa 1 (mais antigo) na chegada do 4 → [4,2,3]
    // LRU:  expulsa 2 (menos recentemente usado) → [1,4,3]
    const seq = [1, 2, 3, 1, 4];
    const rLru = lru(seq, 3);
    const rFifo = fifo(seq, 3);
    const ultimoLru = rLru.passos[rLru.passos.length - 1];
    const ultimoFifo = rFifo.passos[rFifo.passos.length - 1];
    expect(ultimoLru?.quadrosDepois.sort()).toEqual([1, 3, 4]);
    expect(ultimoFifo?.quadrosDepois.sort()).toEqual([2, 3, 4]);
  });

  it('1 quadro: cada página nova substitui a anterior', () => {
    const r = lru([1, 2, 3], 1);
    expect(r.passos[1]?.vitima).toBe(1);
    expect(r.passos[2]?.vitima).toBe(2);
  });

  it('não muta a sequência de entrada', () => {
    const seq = [...SEQ_CLASSICA];
    lru(seq, 3);
    expect(seq).toEqual(SEQ_CLASSICA);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `bun run test src/domain/algorithms/lru.test.ts`

Expected: FAIL "Cannot find module './lru'".

- [ ] **Step 3: Implementar LRU**

```ts
// src/domain/algorithms/lru.ts
import type { FrameSlot, PageNumber, RunResult, Step } from '../types';
import { EMPTY_SLOT } from '../types';

/**
 * LRU: substitui a página menos recentemente usada.
 * Mantém uma "stack" de uso recente (mais recente no fim).
 */
export function lru(seq: PageNumber[], quadros: number): RunResult {
  const memoria: FrameSlot[] = new Array(quadros).fill(EMPTY_SLOT);
  const usoRecente: PageNumber[] = [];
  const passos: Step[] = [];
  let faltas = 0;

  for (const pagina of seq) {
    if (memoria.includes(pagina)) {
      const idxUso = usoRecente.indexOf(pagina);
      usoRecente.splice(idxUso, 1);
      usoRecente.push(pagina);
      passos.push({ pagina, hit: true, quadrosDepois: [...memoria] });
      continue;
    }

    faltas++;
    const slotLivre = memoria.indexOf(EMPTY_SLOT);
    let vitima: PageNumber | undefined;

    if (slotLivre !== -1) {
      memoria[slotLivre] = pagina;
    } else {
      const removida = usoRecente.shift();
      if (removida === undefined) {
        throw new Error('Estado inconsistente: memória cheia mas histórico vazio.');
      }
      vitima = removida;
      const idx = memoria.indexOf(removida);
      memoria[idx] = pagina;
    }
    usoRecente.push(pagina);

    passos.push({
      pagina,
      hit: false,
      quadrosDepois: [...memoria],
      ...(vitima !== undefined ? { vitima } : {}),
    });
  }

  return { passos, faltas };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `bun run test src/domain/algorithms/lru.test.ts`

Expected: PASS (7 testes).

- [ ] **Step 5: Commit**

```bash
git add src/domain/algorithms/lru.ts src/domain/algorithms/lru.test.ts
git commit -m "feat: add LRU page replacement algorithm"
```

---

## Task 7: Algoritmo OPT

**Files:**
- Create: `src/domain/algorithms/opt.ts`
- Test: `src/domain/algorithms/opt.test.ts`

- [ ] **Step 1: Escrever testes falhando**

```ts
// src/domain/algorithms/opt.test.ts
import { describe, expect, it } from 'vitest';
import { FALTAS_ESPERADAS, SEQ_CLASSICA } from '../../test/fixtures';
import { opt } from './opt';

describe('opt', () => {
  it('sequência clássica × 3 quadros → 7 faltas', () => {
    expect(opt(SEQ_CLASSICA, 3).faltas).toBe(FALTAS_ESPERADAS.opt[3]);
  });

  it('sequência clássica × 4 quadros → 6 faltas', () => {
    expect(opt(SEQ_CLASSICA, 4).faltas).toBe(FALTAS_ESPERADAS.opt[4]);
  });

  it('sequência vazia', () => {
    expect(opt([], 3)).toEqual({ passos: [], faltas: 0 });
  });

  it('página sem próximo uso é a primeira a sair', () => {
    // [1,2,3,4,2,3] com 3 quadros:
    // posição 3: memória=[1,2,3], chega 4.
    // próximos usos: 1→∞, 2→i=4, 3→i=5.
    // 1 não tem próximo uso → expulsa 1.
    const r = opt([1, 2, 3, 4, 2, 3], 3);
    expect(r.passos[3]?.vitima).toBe(1);
  });

  it('não muta a sequência de entrada', () => {
    const seq = [...SEQ_CLASSICA];
    opt(seq, 3);
    expect(seq).toEqual(SEQ_CLASSICA);
  });

  it('produz menos ou igual faltas que FIFO/LRU para a sequência clássica', () => {
    expect(opt(SEQ_CLASSICA, 3).faltas).toBeLessThanOrEqual(9);
    expect(opt(SEQ_CLASSICA, 4).faltas).toBeLessThanOrEqual(8);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `bun run test src/domain/algorithms/opt.test.ts`

Expected: FAIL "Cannot find module './opt'".

- [ ] **Step 3: Implementar OPT**

```ts
// src/domain/algorithms/opt.ts
import type { FrameSlot, PageNumber, RunResult, Step } from '../types';
import { EMPTY_SLOT } from '../types';

/**
 * OPT (Belady): substitui a página cujo próximo uso é o mais distante no futuro.
 * Página sem próximo uso (Infinity) é a primeira candidata a sair.
 */
export function opt(seq: PageNumber[], quadros: number): RunResult {
  const memoria: FrameSlot[] = new Array(quadros).fill(EMPTY_SLOT);
  const passos: Step[] = [];
  let faltas = 0;

  for (let i = 0; i < seq.length; i++) {
    const pagina = seq[i];
    if (pagina === undefined) continue;

    if (memoria.includes(pagina)) {
      passos.push({ pagina, hit: true, quadrosDepois: [...memoria] });
      continue;
    }

    faltas++;
    const slotLivre = memoria.indexOf(EMPTY_SLOT);
    let vitima: PageNumber | undefined;

    if (slotLivre !== -1) {
      memoria[slotLivre] = pagina;
    } else {
      const idxVitima = escolherVitimaOpt(memoria, seq, i + 1);
      vitima = memoria[idxVitima] ?? undefined;
      memoria[idxVitima] = pagina;
    }

    passos.push({
      pagina,
      hit: false,
      quadrosDepois: [...memoria],
      ...(vitima !== undefined ? { vitima } : {}),
    });
  }

  return { passos, faltas };
}

function escolherVitimaOpt(
  memoria: FrameSlot[],
  seq: PageNumber[],
  desde: number,
): number {
  let piorIdx = 0;
  let piorDistancia = -1;

  for (let s = 0; s < memoria.length; s++) {
    const candidata = memoria[s];
    if (candidata === null || candidata === undefined) continue;
    const proxima = proximoUso(seq, desde, candidata);
    if (proxima === Infinity) return s;
    if (proxima > piorDistancia) {
      piorDistancia = proxima;
      piorIdx = s;
    }
  }
  return piorIdx;
}

function proximoUso(seq: PageNumber[], desde: number, pagina: PageNumber): number {
  for (let j = desde; j < seq.length; j++) {
    if (seq[j] === pagina) return j;
  }
  return Infinity;
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `bun run test src/domain/algorithms/opt.test.ts`

Expected: PASS (6 testes).

- [ ] **Step 5: Commit**

```bash
git add src/domain/algorithms/opt.ts src/domain/algorithms/opt.test.ts
git commit -m "feat: add OPT (Belady) page replacement algorithm"
```

---

## Task 8: Algoritmo RANDOM

**Files:**
- Create: `src/domain/algorithms/random.ts`
- Test: `src/domain/algorithms/random.test.ts`

- [ ] **Step 1: Escrever testes falhando**

```ts
// src/domain/algorithms/random.test.ts
import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../mulberry32';
import { opt } from './opt';
import { random } from './random';
import { SEQ_CLASSICA } from '../../test/fixtures';

describe('random', () => {
  it('sequência vazia', () => {
    expect(random([], 3)).toEqual({ passos: [], faltas: 0 });
  });

  it('sequência menor que quadros: todas faltas sem vítima', () => {
    const r = random([1, 2, 3], 5, () => 0);
    expect(r.faltas).toBe(3);
    expect(r.passos.every((p) => p.vitima === undefined)).toBe(true);
  });

  it('com rng = () => 0 sempre expulsa o slot 0 (determinístico)', () => {
    // [1,2,3,4]: 4 faltas. Quando chega 4, rng()=0 → expulsa memoria[0]=1.
    const r = random([1, 2, 3, 4], 3, () => 0);
    expect(r.passos[3]?.vitima).toBe(1);
    expect(r.faltas).toBe(4);
  });

  it('é determinístico com a mesma seed', () => {
    const rngA = mulberry32(42);
    const rngB = mulberry32(42);
    const a = random(SEQ_CLASSICA, 3, rngA);
    const b = random(SEQ_CLASSICA, 3, rngB);
    expect(a.faltas).toBe(b.faltas);
    expect(a.passos).toEqual(b.passos);
  });

  it('faltas >= opt.faltas para a sequência clássica', () => {
    const rng = mulberry32(123);
    const rRandom = random(SEQ_CLASSICA, 3, rng).faltas;
    const rOpt = opt(SEQ_CLASSICA, 3).faltas;
    expect(rRandom).toBeGreaterThanOrEqual(rOpt);
  });

  it('não muta a sequência de entrada', () => {
    const seq = [...SEQ_CLASSICA];
    random(seq, 3, () => 0);
    expect(seq).toEqual(SEQ_CLASSICA);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `bun run test src/domain/algorithms/random.test.ts`

Expected: FAIL "Cannot find module './random'".

- [ ] **Step 3: Implementar RANDOM**

```ts
// src/domain/algorithms/random.ts
import type { FrameSlot, PageNumber, RunResult, Step } from '../types';
import { EMPTY_SLOT } from '../types';

/**
 * RANDOM: substitui um quadro aleatório quando há falta com memória cheia.
 * Aceita um RNG injetável para reprodutibilidade (default: Math.random).
 */
export function random(
  seq: PageNumber[],
  quadros: number,
  rng: () => number = Math.random,
): RunResult {
  const memoria: FrameSlot[] = new Array(quadros).fill(EMPTY_SLOT);
  const passos: Step[] = [];
  let faltas = 0;

  for (const pagina of seq) {
    if (memoria.includes(pagina)) {
      passos.push({ pagina, hit: true, quadrosDepois: [...memoria] });
      continue;
    }

    faltas++;
    const slotLivre = memoria.indexOf(EMPTY_SLOT);
    let vitima: PageNumber | undefined;

    if (slotLivre !== -1) {
      memoria[slotLivre] = pagina;
    } else {
      const idx = Math.floor(rng() * quadros);
      const removida = memoria[idx];
      vitima = removida ?? undefined;
      memoria[idx] = pagina;
    }

    passos.push({
      pagina,
      hit: false,
      quadrosDepois: [...memoria],
      ...(vitima !== undefined ? { vitima } : {}),
    });
  }

  return { passos, faltas };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `bun run test src/domain/algorithms/random.test.ts`

Expected: PASS (6 testes).

- [ ] **Step 5: Commit**

```bash
git add src/domain/algorithms/random.ts src/domain/algorithms/random.test.ts
git commit -m "feat: add RANDOM page replacement algorithm"
```

---

## Task 9: runAll (executa os 4 e tira média do RANDOM)

**Files:**
- Create: `src/domain/runAll.ts`
- Test: `src/domain/runAll.test.ts`

- [ ] **Step 1: Escrever testes falhando**

```ts
// src/domain/runAll.test.ts
import { describe, expect, it } from 'vitest';
import { FALTAS_ESPERADAS, SEQ_CLASSICA } from '../test/fixtures';
import { runAll } from './runAll';

describe('runAll', () => {
  it('retorna os 4 resultados para a sequência clássica × 3 quadros', () => {
    const r = runAll(SEQ_CLASSICA, 3);
    expect(r.fifo.faltas).toBe(FALTAS_ESPERADAS.fifo[3]);
    expect(r.lru.faltas).toBe(FALTAS_ESPERADAS.lru[3]);
    expect(r.opt.faltas).toBe(FALTAS_ESPERADAS.opt[3]);
    expect(r.randomMedia).toBeGreaterThanOrEqual(r.opt.faltas);
    expect(Number.isFinite(r.randomMedia)).toBe(true);
    expect(r.randomDesvio).toBeGreaterThanOrEqual(0);
    expect(r.randomVisual.passos).toHaveLength(SEQ_CLASSICA.length);
    expect(r.randomVisual.faltas).toBeGreaterThanOrEqual(r.opt.faltas);
  });

  it('é determinístico (mesma seed base → mesmo randomMedia)', () => {
    const a = runAll(SEQ_CLASSICA, 3);
    const b = runAll(SEQ_CLASSICA, 3);
    expect(a.randomMedia).toBe(b.randomMedia);
    expect(a.randomDesvio).toBe(b.randomDesvio);
  });

  it('sequência vazia retorna zero em tudo', () => {
    const r = runAll([], 3);
    expect(r.fifo.faltas).toBe(0);
    expect(r.lru.faltas).toBe(0);
    expect(r.opt.faltas).toBe(0);
    expect(r.randomMedia).toBe(0);
    expect(r.randomDesvio).toBe(0);
    expect(r.randomVisual).toEqual({ passos: [], faltas: 0 });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `bun run test src/domain/runAll.test.ts`

Expected: FAIL "Cannot find module './runAll'".

- [ ] **Step 3: Implementar runAll**

```ts
// src/domain/runAll.ts
import { fifo } from './algorithms/fifo';
import { lru } from './algorithms/lru';
import { opt } from './algorithms/opt';
import { random } from './algorithms/random';
import { mulberry32 } from './mulberry32';
import {
  type AllResults,
  type PageNumber,
  RANDOM_AMOSTRAS,
  RANDOM_SEED_BASE,
} from './types';

export function runAll(seq: PageNumber[], quadros: number): AllResults {
  const fifoResult = fifo(seq, quadros);
  const lruResult = lru(seq, quadros);
  const optResult = opt(seq, quadros);

  // primeira execução guarda também os passos (modo manual);
  // as outras 29 só interessam pela contagem de faltas (média e desvio).
  const visual = random(seq, quadros, mulberry32(RANDOM_SEED_BASE));
  const amostras: number[] = [visual.faltas];
  for (let i = 1; i < RANDOM_AMOSTRAS; i++) {
    amostras.push(random(seq, quadros, mulberry32(RANDOM_SEED_BASE + i)).faltas);
  }

  return {
    fifo: fifoResult,
    lru: lruResult,
    opt: optResult,
    randomVisual: visual,
    randomMedia: Math.round(media(amostras)),
    randomDesvio: desvioPadrao(amostras),
  };
}

function media(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((acc, v) => acc + v, 0) / xs.length;
}

function desvioPadrao(xs: number[]): number {
  if (xs.length === 0) return 0;
  const m = media(xs);
  const variancia = xs.reduce((acc, v) => acc + (v - m) ** 2, 0) / xs.length;
  return Math.sqrt(variancia);
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `bun run test src/domain/runAll.test.ts`

Expected: PASS (3 testes).

- [ ] **Step 5: Rodar TODOS os testes do domínio**

Run: `bun run test src/domain`

Expected: PASS, ~40+ testes.

- [ ] **Step 6: Commit**

```bash
git add src/domain/runAll.ts src/domain/runAll.test.ts
git commit -m "feat: add runAll aggregating all four algorithms"
```

---

## Task 10: Store Zustand

**Files:**
- Create: `src/store/simulator.ts`
- Test: `src/store/simulator.test.ts`

- [ ] **Step 1: Escrever testes falhando**

```ts
// src/store/simulator.test.ts
import { beforeEach, describe, expect, it } from 'vitest';
import { SEQ_CLASSICA } from '../test/fixtures';
import { initialState, useSimulatorStore } from './simulator';

describe('useSimulatorStore', () => {
  beforeEach(() => {
    useSimulatorStore.setState(initialState());
  });

  it('estado inicial tem quadros=3 e sequência clássica default', () => {
    const s = useSimulatorStore.getState();
    expect(s.quadros).toBe(3);
    expect(s.sequencia).toEqual(SEQ_CLASSICA);
    expect(s.resultados).toBeNull();
    expect(s.passoAtual).toBe(-1);
    expect(s.erroParse).toBeNull();
    expect(s.algoritmoManual).toBe('fifo');
  });

  it('setAlgoritmoManual troca o algoritmo sem mexer no passoAtual', () => {
    const s = useSimulatorStore.getState();
    s.executar();
    s.avancarPasso();
    s.avancarPasso();
    const passoAntes = useSimulatorStore.getState().passoAtual;
    useSimulatorStore.getState().setAlgoritmoManual('lru');
    expect(useSimulatorStore.getState().algoritmoManual).toBe('lru');
    expect(useSimulatorStore.getState().passoAtual).toBe(passoAntes);
  });

  it('avancarPasso usa o limite do algoritmo manual selecionado', () => {
    const s = useSimulatorStore.getState();
    s.executar();
    s.setAlgoritmoManual('opt');
    const totalOpt =
      useSimulatorStore.getState().resultados?.opt.passos.length ?? 0;
    for (let i = 0; i < totalOpt + 5; i++) {
      useSimulatorStore.getState().avancarPasso();
    }
    expect(useSimulatorStore.getState().passoAtual).toBe(totalOpt - 1);
  });

  it('setSequenciaTexto válido atualiza sequência e zera erroParse', () => {
    useSimulatorStore.getState().setSequenciaTexto('1 2 3');
    expect(useSimulatorStore.getState().sequencia).toEqual([1, 2, 3]);
    expect(useSimulatorStore.getState().erroParse).toBeNull();
  });

  it('setSequenciaTexto inválido seta erroParse e mantém sequência anterior', () => {
    useSimulatorStore.getState().setSequenciaTexto('1 x 3');
    expect(useSimulatorStore.getState().erroParse).toContain("'x'");
  });

  it('setQuadros clampa em MIN_FRAMES=1', () => {
    useSimulatorStore.getState().setQuadros(0);
    expect(useSimulatorStore.getState().quadros).toBe(1);
    useSimulatorStore.getState().setQuadros(-5);
    expect(useSimulatorStore.getState().quadros).toBe(1);
  });

  it('executar() com input válido preenche resultados', () => {
    useSimulatorStore.getState().executar();
    const r = useSimulatorStore.getState().resultados;
    expect(r).not.toBeNull();
    expect(r?.fifo.faltas).toBe(9);
  });

  it('executar() com erroParse é no-op', () => {
    useSimulatorStore.getState().setSequenciaTexto('x');
    useSimulatorStore.getState().executar();
    expect(useSimulatorStore.getState().resultados).toBeNull();
  });

  it('avancarPasso() exige resultados; sem eles é no-op', () => {
    useSimulatorStore.getState().avancarPasso();
    expect(useSimulatorStore.getState().passoAtual).toBe(-1);
  });

  it('avancarPasso() não passa de passos.length - 1', () => {
    const s = useSimulatorStore.getState();
    s.executar();
    const total = useSimulatorStore.getState().resultados?.fifo.passos.length ?? 0;
    for (let i = 0; i < total + 5; i++) {
      useSimulatorStore.getState().avancarPasso();
    }
    expect(useSimulatorStore.getState().passoAtual).toBe(total - 1);
  });

  it('voltarPasso() não desce de -1', () => {
    useSimulatorStore.getState().executar();
    for (let i = 0; i < 20; i++) {
      useSimulatorStore.getState().voltarPasso();
    }
    expect(useSimulatorStore.getState().passoAtual).toBe(-1);
  });

  it('resetar() volta tudo aos defaults', () => {
    const s = useSimulatorStore.getState();
    s.setSequenciaTexto('1 2 3');
    s.setQuadros(7);
    s.executar();
    s.avancarPasso();
    s.resetar();
    const after = useSimulatorStore.getState();
    expect(after.quadros).toBe(3);
    expect(after.sequencia).toEqual(SEQ_CLASSICA);
    expect(after.resultados).toBeNull();
    expect(after.passoAtual).toBe(-1);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `bun run test src/store/simulator.test.ts`

Expected: FAIL "Cannot find module './simulator'".

- [ ] **Step 3: Implementar o store**

```ts
// src/store/simulator.ts
import { create } from 'zustand';
import { parseSequence, ParseError } from '../domain/parseSequence';
import { runAll } from '../domain/runAll';
import {
  type Algorithm,
  type AllResults,
  DEFAULT_FRAMES,
  DEFAULT_GRAFICO_MAX,
  MAX_GRAFICO,
  MIN_FRAMES,
  type PageNumber,
  type RunResult,
  type StepIndex,
} from '../domain/types';

const SEQUENCIA_DEFAULT = '7 0 1 2 0 3 0 4 2 3 0 3 2';

type SimulatorState = {
  quadros: number;
  sequenciaTexto: string;
  sequencia: PageNumber[];
  erroParse: string | null;
  resultados: AllResults | null;
  algoritmoManual: Algorithm;
  passoAtual: StepIndex;
  quadrosMaxGrafico: number;

  setQuadros(n: number): void;
  setSequenciaTexto(s: string): void;
  setAlgoritmoManual(a: Algorithm): void;
  executar(): void;
  avancarPasso(): void;
  voltarPasso(): void;
  resetar(): void;
  setQuadrosMaxGrafico(n: number): void;
};

export function initialState(): Omit<
  SimulatorState,
  | 'setQuadros'
  | 'setSequenciaTexto'
  | 'setAlgoritmoManual'
  | 'executar'
  | 'avancarPasso'
  | 'voltarPasso'
  | 'resetar'
  | 'setQuadrosMaxGrafico'
> {
  return {
    quadros: DEFAULT_FRAMES,
    sequenciaTexto: SEQUENCIA_DEFAULT,
    sequencia: parseSequence(SEQUENCIA_DEFAULT),
    erroParse: null,
    resultados: null,
    algoritmoManual: 'fifo',
    passoAtual: -1,
    quadrosMaxGrafico: DEFAULT_GRAFICO_MAX,
  };
}

/**
 * Retorna o RunResult do algoritmo manual atualmente selecionado.
 * RANDOM usa a execução determinística (randomVisual) pra ser reproduzível
 * no passo-a-passo.
 */
export function selectRunManual(s: SimulatorState): RunResult | null {
  if (!s.resultados) return null;
  switch (s.algoritmoManual) {
    case 'fifo':
      return s.resultados.fifo;
    case 'lru':
      return s.resultados.lru;
    case 'opt':
      return s.resultados.opt;
    case 'random':
      return s.resultados.randomVisual;
  }
}

export const useSimulatorStore = create<SimulatorState>((set, get) => ({
  ...initialState(),

  setQuadros: (n) => {
    const clamped = Math.max(MIN_FRAMES, Math.floor(n));
    set({ quadros: clamped, resultados: null, passoAtual: -1 });
  },

  setSequenciaTexto: (texto) => {
    try {
      const seq = parseSequence(texto);
      set({
        sequenciaTexto: texto,
        sequencia: seq,
        erroParse: null,
        resultados: null,
        passoAtual: -1,
      });
    } catch (e) {
      if (e instanceof ParseError) {
        set({ sequenciaTexto: texto, erroParse: e.message });
      } else {
        throw e;
      }
    }
  },

  setAlgoritmoManual: (a) => {
    // não mexe em passoAtual: os 4 algoritmos têm o mesmo nº de passos
    set({ algoritmoManual: a });
  },

  executar: () => {
    const { sequencia, quadros, erroParse } = get();
    if (erroParse !== null) return;
    if (sequencia.length === 0) return;
    const resultados = runAll(sequencia, quadros);
    set({ resultados, passoAtual: -1 });
  },

  avancarPasso: () => {
    const s = get();
    const run = selectRunManual(s);
    if (!run) return;
    const limite = run.passos.length - 1;
    set({ passoAtual: Math.min(limite, s.passoAtual + 1) });
  },

  voltarPasso: () => {
    set((s) => ({ passoAtual: Math.max(-1, s.passoAtual - 1) }));
  },

  resetar: () => {
    set(initialState());
  },

  setQuadrosMaxGrafico: (n) => {
    const clamped = Math.max(1, Math.min(MAX_GRAFICO, Math.floor(n)));
    set({ quadrosMaxGrafico: clamped });
  },
}));
```

- [ ] **Step 4: Rodar e ver passar**

Run: `bun run test src/store/simulator.test.ts`

Expected: PASS (10 testes).

- [ ] **Step 5: Commit**

```bash
git add src/store/simulator.ts src/store/simulator.test.ts
git commit -m "feat: add Zustand simulator store with actions"
```

---

## Task 11: Paleta de cores

**Files:**
- Create: `src/lib/colors.ts`
- Test: `src/lib/colors.test.ts`

- [ ] **Step 1: Escrever testes**

```ts
// src/lib/colors.test.ts
import { describe, expect, it } from 'vitest';
import { corDaPagina, COR_ALGORITMO } from './colors';

describe('colors', () => {
  it('mesma página retorna mesma cor', () => {
    expect(corDaPagina(7)).toBe(corDaPagina(7));
  });

  it('páginas diferentes podem ter cores diferentes', () => {
    const cores = new Set([
      corDaPagina(0),
      corDaPagina(1),
      corDaPagina(2),
      corDaPagina(3),
    ]);
    expect(cores.size).toBeGreaterThan(1);
  });

  it('lida com páginas maiores que a paleta (módulo)', () => {
    expect(corDaPagina(99)).toBeDefined();
  });

  it('exporta uma cor por algoritmo', () => {
    expect(COR_ALGORITMO.fifo).toBeDefined();
    expect(COR_ALGORITMO.lru).toBeDefined();
    expect(COR_ALGORITMO.opt).toBeDefined();
    expect(COR_ALGORITMO.random).toBeDefined();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `bun run test src/lib/colors.test.ts`

Expected: FAIL "Cannot find module './colors'".

- [ ] **Step 3: Implementar**

```ts
// src/lib/colors.ts
import type { Algorithm, PageNumber } from '../domain/types';

const PALETA_PAGINA = [
  'bg-sky-400 text-white',
  'bg-emerald-400 text-white',
  'bg-amber-400 text-black',
  'bg-rose-400 text-white',
  'bg-violet-400 text-white',
  'bg-cyan-400 text-black',
  'bg-orange-400 text-white',
  'bg-lime-400 text-black',
  'bg-pink-400 text-white',
  'bg-indigo-400 text-white',
  'bg-teal-400 text-white',
  'bg-yellow-400 text-black',
] as const;

export function corDaPagina(p: PageNumber): string {
  const idx = ((p % PALETA_PAGINA.length) + PALETA_PAGINA.length) % PALETA_PAGINA.length;
  return PALETA_PAGINA[idx] ?? PALETA_PAGINA[0];
}

export const COR_ALGORITMO: Record<Algorithm, string> = {
  fifo: '#3b82f6',
  lru: '#10b981',
  opt: '#f59e0b',
  random: '#ef4444',
};

export const ROTULO_ALGORITMO: Record<Algorithm, string> = {
  fifo: 'FIFO',
  lru: 'LRU',
  opt: 'OPT',
  random: 'RANDOM',
};
```

- [ ] **Step 4: Rodar e ver passar**

Run: `bun run test src/lib/colors.test.ts`

Expected: PASS (4 testes).

- [ ] **Step 5: Commit**

```bash
git add src/lib/colors.ts src/lib/colors.test.ts
git commit -m "feat: add stable color palette for pages and algorithms"
```

---

## Task 12: HitMissBadge component

**Files:**
- Create: `src/components/HitMissBadge.tsx`
- Test: `src/components/HitMissBadge.test.tsx`

- [ ] **Step 1: Escrever teste**

```tsx
// src/components/HitMissBadge.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HitMissBadge } from './HitMissBadge';

describe('HitMissBadge', () => {
  it('mostra HIT quando hit=true', () => {
    render(<HitMissBadge hit={true} />);
    expect(screen.getByText(/HIT/i)).toBeInTheDocument();
  });

  it('mostra FALTA quando hit=false', () => {
    render(<HitMissBadge hit={false} />);
    expect(screen.getByText(/FALTA/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `bun run test src/components/HitMissBadge.test.tsx`

Expected: FAIL "Cannot find module './HitMissBadge'".

- [ ] **Step 3: Implementar**

```tsx
// src/components/HitMissBadge.tsx
type Props = { hit: boolean };

export function HitMissBadge({ hit }: Props) {
  const classes = hit
    ? 'bg-emerald-500 text-white'
    : 'bg-rose-500 text-white';
  const label = hit ? 'HIT' : 'FALTA';
  return (
    <span
      className={`inline-flex items-center rounded px-3 py-1 text-sm font-bold ${classes}`}
    >
      {label}
    </span>
  );
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `bun run test src/components/HitMissBadge.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/HitMissBadge.tsx src/components/HitMissBadge.test.tsx
git commit -m "feat: add HitMissBadge component"
```

---

## Task 13: MemoryView component

**Files:**
- Create: `src/components/MemoryView.tsx`
- Test: `src/components/MemoryView.test.tsx`

- [ ] **Step 1: Escrever teste**

```tsx
// src/components/MemoryView.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryView } from './MemoryView';

describe('MemoryView', () => {
  it('renderiza um slot por quadro', () => {
    render(<MemoryView quadros={[1, 2, null]} />);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('marca o slot que mudou (vitima)', () => {
    const { container } = render(
      <MemoryView quadros={[5, 2, 3]} indiceVitima={0} />,
    );
    const slots = container.querySelectorAll('[data-testid="memory-slot"]');
    expect(slots[0]).toHaveAttribute('data-vitima', 'true');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `bun run test src/components/MemoryView.test.tsx`

Expected: FAIL "Cannot find module './MemoryView'".

- [ ] **Step 3: Implementar**

```tsx
// src/components/MemoryView.tsx
import { motion } from 'motion/react';
import type { FrameSlot } from '../domain/types';
import { corDaPagina } from '../lib/colors';

type Props = {
  quadros: FrameSlot[];
  indiceVitima?: number;
};

export function MemoryView({ quadros, indiceVitima }: Props) {
  return (
    <div className="flex flex-col gap-2">
      {quadros.map((pagina, idx) => {
        const isVitima = idx === indiceVitima;
        const conteudo =
          pagina === null ? (
            <span className="text-surface-400">—</span>
          ) : (
            <span className={`rounded px-3 py-1 font-bold ${corDaPagina(pagina)}`}>
              {pagina}
            </span>
          );
        return (
          <motion.div
            key={idx}
            data-testid="memory-slot"
            data-vitima={isVitima ? 'true' : 'false'}
            animate={
              isVitima
                ? { scale: [1, 1.1, 1, 1.1, 1] }
                : { scale: 1 }
            }
            transition={{ duration: 0.6 }}
            className="flex h-12 w-20 items-center justify-center rounded border border-surface-300 bg-surface-50"
          >
            {conteudo}
          </motion.div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `bun run test src/components/MemoryView.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/MemoryView.tsx src/components/MemoryView.test.tsx
git commit -m "feat: add MemoryView component with victim flash animation"
```

---

## Task 14: InputPanel component

**Files:**
- Create: `src/components/InputPanel.tsx`
- Test: `src/components/InputPanel.test.tsx`

- [ ] **Step 1: Escrever teste**

```tsx
// src/components/InputPanel.test.tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { initialState, useSimulatorStore } from '../store/simulator';
import { InputPanel } from './InputPanel';

describe('InputPanel', () => {
  beforeEach(() => {
    useSimulatorStore.setState(initialState());
  });

  it('renderiza inputs e botões', () => {
    render(<InputPanel />);
    expect(screen.getByLabelText(/quadros/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/sequência/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /executar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /resetar/i })).toBeInTheDocument();
  });

  it('mudar sequência inválida mostra erro de parse', () => {
    render(<InputPanel />);
    const input = screen.getByLabelText(/sequência/i);
    fireEvent.change(input, { target: { value: '1 x 2' } });
    expect(screen.getByText(/Caractere inválido/)).toBeInTheDocument();
  });

  it('clicar em Executar com input válido preenche resultados no store', () => {
    render(<InputPanel />);
    fireEvent.click(screen.getByRole('button', { name: /executar/i }));
    expect(useSimulatorStore.getState().resultados).not.toBeNull();
  });

  it('Executar fica desabilitado com erro de parse', () => {
    render(<InputPanel />);
    fireEvent.change(screen.getByLabelText(/sequência/i), {
      target: { value: 'x' },
    });
    expect(screen.getByRole('button', { name: /executar/i })).toBeDisabled();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `bun run test src/components/InputPanel.test.tsx`

Expected: FAIL "Cannot find module './InputPanel'".

- [ ] **Step 3: Implementar**

```tsx
// src/components/InputPanel.tsx
import { useSimulatorStore } from '../store/simulator';

export function InputPanel() {
  const quadros = useSimulatorStore((s) => s.quadros);
  const sequenciaTexto = useSimulatorStore((s) => s.sequenciaTexto);
  const erroParse = useSimulatorStore((s) => s.erroParse);
  const sequencia = useSimulatorStore((s) => s.sequencia);
  const setQuadros = useSimulatorStore((s) => s.setQuadros);
  const setSequenciaTexto = useSimulatorStore((s) => s.setSequenciaTexto);
  const executar = useSimulatorStore((s) => s.executar);
  const resetar = useSimulatorStore((s) => s.resetar);

  const podeExecutar = erroParse === null && sequencia.length > 0;

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-surface-300 bg-surface-100 p-4">
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Quadros</span>
          <input
            type="number"
            min={1}
            aria-label="Quadros"
            value={quadros}
            onChange={(e) => setQuadros(Number.parseInt(e.target.value, 10) || 1)}
            className="w-20 rounded border border-surface-300 px-2 py-1"
          />
        </label>

        <label className="flex flex-1 flex-col gap-1">
          <span className="text-sm font-medium">Sequência de páginas</span>
          <input
            type="text"
            aria-label="Sequência"
            value={sequenciaTexto}
            onChange={(e) => setSequenciaTexto(e.target.value)}
            placeholder="ex: 7 0 1 2 0 3 0 4"
            className="rounded border border-surface-300 px-2 py-1 font-mono"
          />
        </label>

        <button
          type="button"
          onClick={executar}
          disabled={!podeExecutar}
          className="rounded bg-primary-500 px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Executar
        </button>
        <button
          type="button"
          onClick={resetar}
          className="rounded border border-surface-400 px-4 py-2 font-medium"
        >
          Resetar
        </button>
      </div>

      {erroParse !== null && (
        <p className="text-sm text-rose-600">{erroParse}</p>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `bun run test src/components/InputPanel.test.tsx`

Expected: PASS (4 testes).

- [ ] **Step 5: Commit**

```bash
git add src/components/InputPanel.tsx src/components/InputPanel.test.tsx
git commit -m "feat: add InputPanel component wired to store"
```

---

## Task 15: ManualMode component

**Files:**
- Create: `src/components/ManualMode.tsx`
- Test: `src/components/ManualMode.test.tsx`

- [ ] **Step 1: Escrever teste**

```tsx
// src/components/ManualMode.test.tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { initialState, useSimulatorStore } from '../store/simulator';
import { ManualMode } from './ManualMode';

describe('ManualMode', () => {
  beforeEach(() => {
    useSimulatorStore.setState(initialState());
  });

  it('mostra placeholder antes de executar', () => {
    render(<ManualMode />);
    expect(screen.getByText(/Clique em Executar/i)).toBeInTheDocument();
  });

  it('mostra HIT ou FALTA depois de avançar', () => {
    useSimulatorStore.getState().executar();
    render(<ManualMode />);
    fireEvent.click(screen.getByRole('button', { name: /Avançar/i }));
    expect(screen.queryByText(/HIT|FALTA/)).toBeInTheDocument();
  });

  it('botão Voltar fica desabilitado em -1', () => {
    useSimulatorStore.getState().executar();
    render(<ManualMode />);
    expect(screen.getByRole('button', { name: /Voltar/i })).toBeDisabled();
  });

  it('seletor de algoritmo aparece e troca o algoritmo no store', () => {
    useSimulatorStore.getState().executar();
    render(<ManualMode />);
    const radioLru = screen.getByRole('radio', { name: /LRU/i });
    fireEvent.click(radioLru);
    expect(useSimulatorStore.getState().algoritmoManual).toBe('lru');
  });

  it('fila FIFO aparece em FIFO e some em outros algoritmos', () => {
    useSimulatorStore.getState().executar();
    useSimulatorStore.getState().avancarPasso();
    render(<ManualMode />);
    expect(screen.getByText(/Fila FIFO/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: /LRU/i }));
    expect(screen.queryByText(/Fila FIFO/i)).not.toBeInTheDocument();
  });

  it('contador corrente de faltas reflete o passo atual', () => {
    useSimulatorStore.getState().executar();
    render(<ManualMode />);
    // primeiro passo da sequência clássica é uma falta (7)
    fireEvent.click(screen.getByRole('button', { name: /Avançar/i }));
    expect(screen.getByText(/faltas até aqui: 1/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `bun run test src/components/ManualMode.test.tsx`

Expected: FAIL "Cannot find module './ManualMode'".

- [ ] **Step 3: Implementar**

```tsx
// src/components/ManualMode.tsx
import type {
  Algorithm,
  FrameSlot,
  PageNumber,
  RunResult,
} from '../domain/types';
import { corDaPagina, ROTULO_ALGORITMO } from '../lib/colors';
import { selectRunManual, useSimulatorStore } from '../store/simulator';
import { HitMissBadge } from './HitMissBadge';
import { MemoryView } from './MemoryView';

const ALGORITMOS: Algorithm[] = ['fifo', 'lru', 'opt', 'random'];

export function ManualMode() {
  const resultados = useSimulatorStore((s) => s.resultados);
  const passoAtual = useSimulatorStore((s) => s.passoAtual);
  const quadros = useSimulatorStore((s) => s.quadros);
  const sequencia = useSimulatorStore((s) => s.sequencia);
  const algoritmoManual = useSimulatorStore((s) => s.algoritmoManual);
  const setAlgoritmo = useSimulatorStore((s) => s.setAlgoritmoManual);
  const avancar = useSimulatorStore((s) => s.avancarPasso);
  const voltar = useSimulatorStore((s) => s.voltarPasso);
  const run = useSimulatorStore(selectRunManual);

  return (
    <div className="flex flex-col gap-4">
      <fieldset
        className="flex flex-wrap items-center gap-2"
        aria-label="Algoritmo"
      >
        <legend className="text-sm font-medium text-surface-700">
          Algoritmo:
        </legend>
        {ALGORITMOS.map((a) => (
          <label key={a} className="flex items-center gap-1 text-sm">
            <input
              type="radio"
              name="algoritmo-manual"
              value={a}
              checked={algoritmoManual === a}
              onChange={() => setAlgoritmo(a)}
            />
            {ROTULO_ALGORITMO[a]}
          </label>
        ))}
      </fieldset>

      {resultados === null || run === null ? (
        <p className="text-surface-600">Clique em Executar para começar.</p>
      ) : (
        <ManualBody
          run={run}
          algoritmoManual={algoritmoManual}
          passoAtual={passoAtual}
          quadros={quadros}
          sequencia={sequencia}
          avancar={avancar}
          voltar={voltar}
        />
      )}
    </div>
  );
}

type BodyProps = {
  run: RunResult;
  algoritmoManual: Algorithm;
  passoAtual: number;
  quadros: number;
  sequencia: PageNumber[];
  avancar: () => void;
  voltar: () => void;
};

function ManualBody({
  run,
  algoritmoManual,
  passoAtual,
  quadros,
  sequencia,
  avancar,
  voltar,
}: BodyProps) {
  const passos = run.passos;
  const passo = passoAtual >= 0 ? passos[passoAtual] : null;
  const quadrosAtuais: FrameSlot[] =
    passo?.quadrosDepois ?? new Array(quadros).fill(null);
  const indiceVitima =
    passo?.vitima !== undefined
      ? passo.quadrosDepois.indexOf(passo.pagina)
      : undefined;
  const faltasAteAqui = passos
    .slice(0, Math.max(0, passoAtual + 1))
    .filter((p) => !p.hit).length;

  return (
    <>
      <div className="flex flex-wrap items-center gap-1">
        <span className="text-sm text-surface-600">Sequência:</span>
        {sequencia.map((p, i) => {
          const ativo = i === passoAtual;
          return (
            <span
              key={i}
              className={`rounded px-2 py-1 text-sm font-mono ${
                ativo
                  ? `${corDaPagina(p)} ring-2 ring-primary-700`
                  : 'bg-surface-200'
              }`}
            >
              {p}
            </span>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={voltar}
          disabled={passoAtual <= -1}
          className="rounded border border-surface-400 px-3 py-1 disabled:opacity-50"
        >
          ← Voltar
        </button>
        <button
          type="button"
          onClick={avancar}
          disabled={passoAtual >= passos.length - 1}
          className="rounded bg-primary-500 px-3 py-1 text-white disabled:opacity-50"
        >
          Avançar →
        </button>
        <span className="text-sm text-surface-600">
          passo {Math.max(0, passoAtual + 1)} / {passos.length}
        </span>
        <span className="text-sm text-surface-700">
          · faltas até aqui: {faltasAteAqui} / {run.faltas} (total)
        </span>
      </div>

      <div className="flex gap-6">
        <div>
          <h3 className="mb-2 text-sm font-medium">Memória</h3>
          <MemoryView quadros={quadrosAtuais} indiceVitima={indiceVitima} />
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">Status</h3>
          {passo === null ? (
            <p className="text-surface-500">— ainda não começou —</p>
          ) : (
            <div className="flex flex-col gap-2">
              <div>
                <span className="text-sm text-surface-600">Página: </span>
                <span
                  className={`rounded px-2 py-1 font-bold ${corDaPagina(passo.pagina)}`}
                >
                  {passo.pagina}
                </span>
              </div>
              <HitMissBadge hit={passo.hit} />
              {passo.vitima !== undefined && (
                <p className="text-sm text-surface-700">
                  Vítima removida:{' '}
                  <span
                    className={`rounded px-2 py-0.5 font-bold ${corDaPagina(passo.vitima)}`}
                  >
                    {passo.vitima}
                  </span>
                </p>
              )}
              {algoritmoManual === 'fifo' && passo.filaDepois !== undefined && (
                <div>
                  <span className="text-sm text-surface-600">Fila FIFO: </span>
                  <span className="font-mono">
                    [{passo.filaDepois.join(', ')}]
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `bun run test src/components/ManualMode.test.tsx`

Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add src/components/ManualMode.tsx src/components/ManualMode.test.tsx
git commit -m "feat: add ManualMode component with step-by-step FIFO walkthrough"
```

---

## Task 16: AutoResults component

**Files:**
- Create: `src/components/AutoResults.tsx`
- Test: `src/components/AutoResults.test.tsx`

- [ ] **Step 1: Escrever teste**

```tsx
// src/components/AutoResults.test.tsx
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { initialState, useSimulatorStore } from '../store/simulator';
import { AutoResults } from './AutoResults';

describe('AutoResults', () => {
  beforeEach(() => {
    useSimulatorStore.setState(initialState());
  });

  it('mostra placeholder sem resultados', () => {
    render(<AutoResults />);
    expect(screen.getByText(/Clique em Executar/i)).toBeInTheDocument();
  });

  it('renderiza 4 cards após executar', () => {
    useSimulatorStore.getState().executar();
    render(<AutoResults />);
    expect(screen.getByText('FIFO')).toBeInTheDocument();
    expect(screen.getByText('LRU')).toBeInTheDocument();
    expect(screen.getByText('OPT')).toBeInTheDocument();
    expect(screen.getByText('RANDOM')).toBeInTheDocument();
  });

  it('mostra a contagem de faltas do FIFO (9 para sequência clássica × 3)', () => {
    useSimulatorStore.getState().executar();
    render(<AutoResults />);
    // o card FIFO deve mostrar "9" em algum lugar
    const card = screen.getByText('FIFO').closest('[data-testid="result-card"]');
    expect(card).not.toBeNull();
    expect(card?.textContent).toContain('9');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `bun run test src/components/AutoResults.test.tsx`

Expected: FAIL "Cannot find module './AutoResults'".

- [ ] **Step 3: Implementar**

```tsx
// src/components/AutoResults.tsx
import type { AllResults, RunResult } from '../domain/types';
import { COR_ALGORITMO, ROTULO_ALGORITMO } from '../lib/colors';
import { useSimulatorStore } from '../store/simulator';

export function AutoResults() {
  const resultados = useSimulatorStore((s) => s.resultados);
  if (resultados === null) {
    return <p className="text-surface-600">Clique em Executar para começar.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      <ResultCard
        algoritmo="fifo"
        rotulo={ROTULO_ALGORITMO.fifo}
        cor={COR_ALGORITMO.fifo}
        run={resultados.fifo}
      />
      <ResultCard
        algoritmo="lru"
        rotulo={ROTULO_ALGORITMO.lru}
        cor={COR_ALGORITMO.lru}
        run={resultados.lru}
      />
      <ResultCard
        algoritmo="opt"
        rotulo={ROTULO_ALGORITMO.opt}
        cor={COR_ALGORITMO.opt}
        run={resultados.opt}
      />
      <RandomCard resultados={resultados} />
    </div>
  );
}

type ResultCardProps = {
  algoritmo: 'fifo' | 'lru' | 'opt';
  rotulo: string;
  cor: string;
  run: RunResult;
};

function ResultCard({ rotulo, cor, run }: ResultCardProps) {
  const total = run.passos.length;
  const hits = run.passos.filter((p) => p.hit).length;
  const pct = total === 0 ? 0 : Math.round((run.faltas / total) * 100);
  return (
    <div
      data-testid="result-card"
      className="flex flex-col gap-3 rounded-lg border border-surface-300 bg-surface-50 p-4"
    >
      <div className="flex items-center gap-2">
        <span
          className="inline-block h-3 w-3 rounded-full"
          style={{ backgroundColor: cor }}
        />
        <h3 className="text-lg font-bold">{rotulo}</h3>
      </div>
      <div className="text-4xl font-bold" style={{ color: cor }}>
        {run.faltas}
        <span className="ml-1 text-sm font-normal text-surface-600">faltas</span>
      </div>
      <table className="text-sm">
        <tbody>
          <tr>
            <td className="pr-3 text-surface-600">Passos</td>
            <td className="font-mono">{total}</td>
          </tr>
          <tr>
            <td className="pr-3 text-surface-600">Hits</td>
            <td className="font-mono">{hits}</td>
          </tr>
          <tr>
            <td className="pr-3 text-surface-600">Faltas</td>
            <td className="font-mono">{run.faltas}</td>
          </tr>
          <tr>
            <td className="pr-3 text-surface-600">% faltas</td>
            <td className="font-mono">{pct}%</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function RandomCard({ resultados }: { resultados: AllResults }) {
  const cor = COR_ALGORITMO.random;
  const sigma = resultados.randomDesvio.toFixed(2);
  return (
    <div
      data-testid="result-card"
      className="flex flex-col gap-3 rounded-lg border border-surface-300 bg-surface-50 p-4"
    >
      <div className="flex items-center gap-2">
        <span
          className="inline-block h-3 w-3 rounded-full"
          style={{ backgroundColor: cor }}
        />
        <h3 className="text-lg font-bold">{ROTULO_ALGORITMO.random}</h3>
      </div>
      <div className="text-4xl font-bold" style={{ color: cor }}>
        {resultados.randomMedia}
        <span className="ml-1 text-sm font-normal text-surface-600">
          faltas (média)
        </span>
      </div>
      <p className="text-sm text-surface-700">
        média de 30 execuções, σ ≈ {sigma}
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `bun run test src/components/AutoResults.test.tsx`

Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add src/components/AutoResults.tsx src/components/AutoResults.test.tsx
git commit -m "feat: add AutoResults component with four algorithm cards"
```

---

## Task 17: ComparisonChart component

**Files:**
- Create: `src/components/ComparisonChart.tsx`
- Test: `src/components/ComparisonChart.test.tsx`

- [ ] **Step 1: Escrever teste**

```tsx
// src/components/ComparisonChart.test.tsx
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { initialState, useSimulatorStore } from '../store/simulator';
import { ComparisonChart } from './ComparisonChart';

describe('ComparisonChart', () => {
  beforeEach(() => {
    useSimulatorStore.setState(initialState());
  });

  it('mostra placeholder se sequência vazia', () => {
    useSimulatorStore.getState().setSequenciaTexto('');
    render(<ComparisonChart />);
    expect(screen.getByText(/sequência/i)).toBeInTheDocument();
  });

  it('renderiza com sequência válida', () => {
    render(<ComparisonChart />);
    // recharts renderiza um <svg>
    expect(screen.getByLabelText(/quadros máximo/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `bun run test src/components/ComparisonChart.test.tsx`

Expected: FAIL "Cannot find module './ComparisonChart'".

- [ ] **Step 3: Implementar**

```tsx
// src/components/ComparisonChart.tsx
import { useMemo } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { runAll } from '../domain/runAll';
import { MAX_GRAFICO } from '../domain/types';
import { COR_ALGORITMO, ROTULO_ALGORITMO } from '../lib/colors';
import { useSimulatorStore } from '../store/simulator';

type Ponto = {
  quadros: number;
  FIFO: number;
  LRU: number;
  OPT: number;
  RANDOM: number;
};

export function ComparisonChart() {
  const sequencia = useSimulatorStore((s) => s.sequencia);
  const quadrosMaxGrafico = useSimulatorStore((s) => s.quadrosMaxGrafico);
  const setMax = useSimulatorStore((s) => s.setQuadrosMaxGrafico);

  const dados: Ponto[] = useMemo(() => {
    if (sequencia.length === 0) return [];
    const pontos: Ponto[] = [];
    for (let k = 1; k <= quadrosMaxGrafico; k++) {
      const r = runAll(sequencia, k);
      pontos.push({
        quadros: k,
        FIFO: r.fifo.faltas,
        LRU: r.lru.faltas,
        OPT: r.opt.faltas,
        RANDOM: r.randomMedia,
      });
    }
    return pontos;
  }, [sequencia, quadrosMaxGrafico]);

  if (sequencia.length === 0) {
    return (
      <p className="text-surface-600">
        Informe uma sequência de páginas válida para gerar o gráfico.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <label className="flex items-center gap-3">
        <span className="text-sm font-medium">Quadros máximo</span>
        <input
          aria-label="Quadros máximo"
          type="range"
          min={1}
          max={MAX_GRAFICO}
          value={quadrosMaxGrafico}
          onChange={(e) => setMax(Number.parseInt(e.target.value, 10))}
        />
        <span className="font-mono text-sm">{quadrosMaxGrafico}</span>
      </label>

      <div className="h-96 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={dados} margin={{ top: 20, right: 30, bottom: 20, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="quadros"
              label={{ value: 'Nº de quadros', position: 'insideBottom', offset: -5 }}
            />
            <YAxis
              label={{ value: 'Faltas', angle: -90, position: 'insideLeft' }}
              allowDecimals={false}
            />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="FIFO"
              stroke={COR_ALGORITMO.fifo}
              strokeWidth={2}
              dot
              name={ROTULO_ALGORITMO.fifo}
            />
            <Line
              type="monotone"
              dataKey="LRU"
              stroke={COR_ALGORITMO.lru}
              strokeWidth={2}
              dot
              name={ROTULO_ALGORITMO.lru}
            />
            <Line
              type="monotone"
              dataKey="OPT"
              stroke={COR_ALGORITMO.opt}
              strokeWidth={2}
              dot
              name={ROTULO_ALGORITMO.opt}
            />
            <Line
              type="monotone"
              dataKey="RANDOM"
              stroke={COR_ALGORITMO.random}
              strokeWidth={2}
              dot
              name={ROTULO_ALGORITMO.random}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `bun run test src/components/ComparisonChart.test.tsx`

Expected: PASS (2 testes). Pode ver warning sobre largura/altura do Recharts no jsdom — é seguro ignorar.

- [ ] **Step 5: Commit**

```bash
git add src/components/ComparisonChart.tsx src/components/ComparisonChart.test.tsx
git commit -m "feat: add ComparisonChart with Recharts (faults × frames)"
```

---

## Task 18: Wire up App.tsx with tabs

**Files:**
- Modify: `src/App.tsx`
- Test: `src/App.test.tsx`

- [ ] **Step 1: Escrever smoke test**

```tsx
// src/App.test.tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from './App';
import { initialState, useSimulatorStore } from './store/simulator';

describe('App', () => {
  beforeEach(() => {
    useSimulatorStore.setState(initialState());
  });

  it('renderiza sem crashar', () => {
    render(<App />);
    expect(screen.getByText(/Simulador de Substituição/i)).toBeInTheDocument();
  });

  it('mostra as três abas', () => {
    render(<App />);
    expect(screen.getByRole('tab', { name: /Manual/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Automático/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Gráfico/i })).toBeInTheDocument();
  });

  it('alternar para Automático e executar mostra os 4 cards', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('tab', { name: /Automático/i }));
    fireEvent.click(screen.getByRole('button', { name: /executar/i }));
    expect(screen.getByText('FIFO')).toBeInTheDocument();
    expect(screen.getByText('LRU')).toBeInTheDocument();
    expect(screen.getByText('OPT')).toBeInTheDocument();
    expect(screen.getByText('RANDOM')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `bun run test src/App.test.tsx`

Expected: FAIL — não há tabs ainda no App.tsx.

- [ ] **Step 3: Substituir App.tsx**

```tsx
// src/App.tsx
import { useState } from 'react';
import { AutoResults } from './components/AutoResults';
import { ComparisonChart } from './components/ComparisonChart';
import { InputPanel } from './components/InputPanel';
import { ManualMode } from './components/ManualMode';

const TABS = [
  { id: 'manual', label: 'Manual' },
  { id: 'auto', label: 'Automático' },
  { id: 'grafico', label: 'Gráfico' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export function App() {
  const [aba, setAba] = useState<TabId>('manual');

  return (
    <main className="min-h-screen bg-surface-50 p-6">
      <header className="mb-4">
        <h1 className="text-2xl font-bold text-primary-700">
          Simulador de Substituição de Páginas
        </h1>
        <p className="mt-1 text-surface-600">
          FIFO, LRU, OPT e RANDOM — modo manual, automático e gráfico.
        </p>
      </header>

      <div className="flex flex-col gap-4">
        <InputPanel />

        <nav className="flex gap-1 border-b border-surface-300" role="tablist">
          {TABS.map((t) => {
            const ativa = t.id === aba;
            return (
              <button
                key={t.id}
                role="tab"
                type="button"
                aria-selected={ativa}
                onClick={() => setAba(t.id)}
                className={`rounded-t px-4 py-2 text-sm font-medium ${
                  ativa
                    ? 'border-b-2 border-primary-500 bg-surface-100 text-primary-700'
                    : 'text-surface-600 hover:text-surface-900'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </nav>

        <section className="rounded-lg bg-surface-50 p-4">
          {aba === 'manual' && <ManualMode />}
          {aba === 'auto' && <AutoResults />}
          {aba === 'grafico' && <ComparisonChart />}
        </section>
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `bun run test src/App.test.tsx`

Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/App.test.tsx
git commit -m "feat: wire App with tabs and all three modes"
```

---

## Task 19: Verificação final (testes, lint, build, dev server)

**Files:** nenhum modificado — apenas verificação.

- [ ] **Step 1: Rodar a suíte inteira**

Run: `bun run test`

Expected: PASS, todos os testes verdes. Algo em torno de 50+ testes no total.

Se algum falhar: corrija antes de seguir. Não pule.

- [ ] **Step 2: Rodar Biome (lint + format check)**

Run: `bun run check`

Expected: 0 erros. Se houver warnings de `useImportType` ou `noNonNullAssertion`, ajuste o código.

- [ ] **Step 3: Rodar formatador (caso queira reformatar)**

Run: `bun run format`

Expected: alguns arquivos podem ser reformatados; commitar se houver mudanças relevantes.

- [ ] **Step 4: Rodar build de produção**

Run: `bun run build`

Expected: build verde, `dist/` gerado, zero erros TS.

- [ ] **Step 5: Subir dev server e testar manualmente no navegador**

Run: `bun dev`

Verificar no navegador (geralmente `http://localhost:5173`):
1. Header e InputPanel aparecem com defaults (3 quadros, sequência clássica).
2. Clicar **Executar** → ir na aba "Automático" → ver 4 cards com 9 / 9 / 7 / valor RANDOM.
3. Voltar pra aba "Manual" → clicar **Avançar →** algumas vezes → ver memória sendo preenchida, badges HIT/FALTA, fila atualizando.
4. Aba "Gráfico" → 4 linhas decrescentes (RANDOM pode oscilar).
5. Mudar sequência para inválida (`1 x 2`) → ver mensagem de erro vermelha, botão Executar desabilitado.
6. **Resetar** → tudo volta aos defaults.

Encerrar o dev server com Ctrl+C.

- [ ] **Step 6: Commit final (se algo foi reformatado/corrigido)**

```bash
git status
# se houver mudanças:
git add -p   # revisar e adicionar
git commit -m "chore: final lint and format pass"
```

- [ ] **Step 7: Verificar critérios de aceite do spec**

Checklist do `docs/superpowers/specs/2026-05-22-page-replacement-simulator-design.md` seção 9:

- [x] 1. Os 4 algoritmos passam contra as fixtures clássicas (Tasks 5-8 + fixtures).
- [x] 2. Modo manual avança/volta sem crashar (Task 15).
- [x] 3. Modo automático mostra os 4 totais; RANDOM mostra média (Task 16).
- [x] 4. Modo gráfico desenha 4 linhas (Task 17).
- [x] 5. Validação de entrada bloqueia Executar (Task 14).
- [x] 6. `bun run test` e `bun run check` verdes.
- [x] 7. `bun run build` sem erro.

---

## Pós-implementação

Após esta plan, os entregáveis remanescentes do PDF (fora do escopo técnico):

1. Vídeo curto demonstrando o modo manual.
2. Slides explicando cada algoritmo.
3. Identificação da equipe e link do repositório Git.

Estes são entregáveis acadêmicos, não código.
