# Page Replacement — Simulador de Algoritmos de Substituição de Página

Simulador web interativo e didático que executa e visualiza os quatro algoritmos clássicos de substituição de páginas sobre uma sequência de referências. Projeto da disciplina de Sistemas Operacionais (IFSC, Tecnologia em ADS).

Algoritmos suportados:

- **FIFO** (First-In First-Out)
- **LRU** (Least Recently Used)
- **OPT** (Ótimo / Belády)
- **RANDOM**

Modos:

- **Manual (FIFO)** — passo a passo, com fila e indicação de hit/falta após cada referência. Usado em sala de aula para explicar visualmente o FIFO.
- **Automático** — executa os 4 algoritmos para a sequência de entrada e exibe o total de faltas de página de cada um.
- **Gráfico** — gera um gráfico comparativo (estilo Maziero, 2018) do número de faltas por algoritmo / por número de quadros.

A especificação canônica está em `MiniprojetoSubstitucaoPagina (2).pdf` na raiz. Em qualquer divergência, o PDF vence.

> Observação: o PDF pede entrega em um único `index.html` com HTML/CSS/JS. Por decisão do time, este projeto usa **React + TypeScript** mantendo as funções de algoritmo isoladas e nomeadas exatamente como o PDF (`fifo`, `lru`, `opt`, `random`) para preservar o critério de "funções JavaScript separadas".

---

## Stack

| Camada | Ferramenta | Notas |
|---|---|---|
| Package manager / runner | **Bun** | `bun install`, `bun dev`, `bun test`, `bun run build` |
| Build / dev server | **Vite** | Executado via `bun` |
| Linguagem | **TypeScript** | `strict: true`, `noUncheckedIndexedAccess: true` |
| UI | **React 19** | Function components, sem class components |
| Styling | **TailwindCSS v4** | Configuração via `@theme` em CSS, sem `tailwind.config.js` |
| Design system | **Skeleton v3** (`@skeletonlabs/skeleton`) | Tema preset `hamlindigo` (light) |
| Estado global | **Zustand** | Um único store: `useSimulatorStore` |
| Animações | **Framer Motion** (`motion/react`) | Piscar quadro substituído, transições da fila FIFO |
| Gráficos | **Recharts** | Gráfico comparativo de faltas por algoritmo |
| Testes | **Vitest** + **@testing-library/react** | `bun run test` |
| Lint / Format | **Biome** | `biome check`, `biome format` |

### Comandos canônicos

```sh
bun install              # instala deps
bun dev                  # dev server (Vite)
bun run build            # build de produção
bun run test             # vitest
bun run check            # biome check (lint + format check)
bun run format           # biome format --write
```

---

## Estrutura de pastas

```
src/
├── main.tsx                 # entrypoint
├── App.tsx                  # layout principal
├── app.css                  # tailwind + skeleton + tema hamlindigo
│
├── domain/                  # lógica pura, ZERO React/Zustand/DOM
│   ├── types.ts             # PageNumber, FrameSlot, Step, RunResult, Algorithm
│   ├── algorithms/
│   │   ├── fifo.ts          # function fifo(seq, quadros)
│   │   ├── lru.ts           # function lru(seq, quadros)
│   │   ├── opt.ts           # function opt(seq, quadros)
│   │   └── random.ts        # function random(seq, quadros)
│   ├── parseSequence.ts     # "7 0 1 2 0 3 0 4" → number[]
│   └── runAll.ts            # roda os 4 e devolve totais de faltas
│
├── store/
│   └── simulator.ts         # estado: quadros, sequência, modo, passo atual
│
├── components/
│   ├── InputPanel.tsx       # nº de quadros + sequência + botões
│   ├── MemoryView.tsx       # estado atual dos quadros
│   ├── ManualMode.tsx       # passo a passo do FIFO
│   ├── AutoResults.tsx      # totais dos 4 algoritmos
│   ├── ComparisonChart.tsx  # gráfico estilo Maziero
│   └── HitMissBadge.tsx     # indicador hit/falta
│
└── lib/
    └── colors.ts            # mapa página → cor (tokens Skeleton)
```

**Regra de ouro:** `domain/` não importa nada de React, Zustand, ou DOM. Tudo testável isoladamente.

---

## Code style

- Functions: 4–20 lines. Split if longer.
- Files: under 500 lines. Split by responsibility.
- One thing per function, one responsibility per module (SRP).
- Names: specific and unique. Avoid `data`, `handler`, `Manager`. Prefer names that return <5 grep hits in the codebase.
- Types: explicit. No `any`, no `Dict`, no untyped functions.
- No code duplication. Extract shared logic into a function/module.
- Early returns over nested ifs. Max 2 levels of indentation.
- Exception messages must include the offending value and expected shape.

### Naming específico do projeto

- Componentes React: `PascalCase.tsx`
- Hooks: `useCamelCase.ts`
- Funções de algoritmo: **nomes exatos do PDF** — `fifo`, `lru`, `opt`, `random` (sem prefixo). Assinatura: `(seq: PageNumber[], quadros: number) => RunResult`.
- Outras funções de domínio: nomes técnicos em pt-BR são aceitáveis (`parseSequencia`, `contarFaltas`) — projeto é didático em pt-BR.
- Tipos / Interfaces: `PascalCase` em inglês curto (`PageNumber`, `FrameSlot`, `Step`, `RunResult`).
- Constantes: `SCREAMING_SNAKE_CASE` (`DEFAULT_FRAMES`, `EMPTY_SLOT`).

### TypeScript

- Sem `any`. Quando inevitável, `unknown` + narrowing.
- Páginas e índices têm tipos distintos (aliases nomeados): `PageNumber`, `FrameIndex`, `StepIndex`.
- Tipos exportados de `src/domain/types.ts`. Sem prefixos `I` ou `T`.

### React

- `export function Nome()` — sem `default export` (exceto `App.tsx` se necessário).
- Props inline ou `type Props = { ... }` no topo do arquivo.
- Evitar `useEffect` para lógica derivada — usar selectors do store.
- Sem prop drilling: ao chegar em 3+ níveis, mover para o store.

### Domain (lógica pura)

- Sem imports de React, Zustand ou DOM.
- Funções puras: mesma entrada → mesma saída. (Exceção: `random` recebe um RNG injetável via parâmetro — *nunca* chamar `Math.random()` direto dentro do algoritmo.)
- Imutabilidade: nunca mutar parâmetros; retornar novos objetos.
- Toda função de algoritmo tem teste unitário com fixtures conhecidas (ver tabela em "Fixtures" abaixo).

### Store (Zustand)

- Um único store: `useSimulatorStore`.
- Ações explícitas: `setQuadros`, `setSequencia`, `executarAutomatico`, `iniciarManual`, `avancarPasso`, `resetar`.
- Selectors granulares no componente: `useSimulatorStore(s => s.passoAtual)`. Nunca desestruturar o store inteiro.

### Styling

- Classes Tailwind direto no JSX.
- Preferir tokens Skeleton (`bg-surface-100`, `text-primary-500`) a cores cruas.
- Cores por página definidas uma única vez em `lib/colors.ts` (mapa estável: mesma página → mesma cor entre algoritmos, para facilitar comparação visual).

---

## Comments

- Keep your own comments. Don't strip them on refactor — they carry intent and provenance.
- Write WHY, not WHAT. Skip `// increment counter` above `i++`.
- Docstrings on public functions: intent + one usage example.
- Reference issue numbers / commit SHAs when a line exists because of a specific bug or upstream constraint.

---

## Tests

- Tests run with a single command: `bun run test`.
- Every new function gets a test. Bug fixes get a regression test.
- Mock external I/O (RNG, DOM) with named fake classes, not inline stubs.
- Tests must be F.I.R.S.T: fast, independent, repeatable, self-validating, timely.
- Algoritmos determinísticos (FIFO/LRU/OPT) devem ter testes com as sequências clássicas (ver "Fixtures").
- `random` recebe RNG injetável; testar com RNG fixo para reprodutibilidade.

### Fixtures canônicas

Sequência de referência clássica do PDF: `7 0 1 2 0 3 0 4 2 3 0 3 2`

| Quadros | FIFO faltas | LRU faltas | OPT faltas |
|---|---|---|---|
| 3 | 9 | 9 | 7 |
| 4 | 10 | 8 | 6 |

(Valores conferidos com Tanenbaum / Maziero 2018. RANDOM varia por execução — testar apenas que o número de faltas é ≥ que o OPT.)

---

## Dependencies

- Inject dependencies through constructor/parameter, not global/import.
- Wrap third-party libs behind a thin interface owned by this project.
- Não adicionar nova dependência sem necessidade clara. Justificar no commit.

---

## Structure

- Follow the framework's convention (Vite/React).
- Prefer small focused modules over god files.
- Predictable paths: `domain/`, `components/`, `store/`, `lib/`.

---

## Formatting

- Use the language default formatter: `biome format`. Don't discuss style beyond that.
- Não brigar com o Biome. Se ele formatar de um jeito, é o jeito.

---

## Logging

- Structured JSON when logging for debugging / observability.
- Plain text only for user-facing CLI output.
- No browser, logs de debug vão para `console.debug` com objetos estruturados (`console.debug({ event: 'fault', algoritmo: 'fifo', pagina, fila })`), não strings concatenadas.

---

## Commits

- **Atômicos** — uma mudança lógica por commit.
- **Inglês** — mensagem em inglês, mesmo com termos pt-BR no código.
- **Conventional Commits sem parênteses** — `feat: add FIFO algorithm`, NÃO `feat(fifo): add algorithm`.
- Prefixos válidos: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `style`, `perf`, `build`, `ci`.
- **Sem trailer `Co-Authored-By`.**

Exemplos válidos:

```
feat: add FIFO algorithm to domain
feat: add LRU with last-use tracking
fix: handle empty sequence in OPT
test: add Tanenbaum fixtures for all algorithms
refactor: extract sequence parsing to domain/parseSequence
docs: document manual mode FSM in README
```

---

## Boas práticas específicas do simulador

1. **Páginas vs. quadros têm tipos distintos** — aliases nomeados. Nunca passar um `FrameIndex` onde um `PageNumber` é esperado.
2. **Constantes nomeadas, não mágicas**:
   ```ts
   export const DEFAULT_FRAMES = 3;
   export const MIN_FRAMES = 1;
   export const EMPTY_SLOT = null;  // valor sentinela para quadro vazio
   ```
3. **Cada algoritmo retorna `RunResult`, não apenas o total de faltas.** Estrutura:
   ```ts
   type Step = {
     pagina: PageNumber;
     hit: boolean;
     quadrosDepois: (PageNumber | null)[];
     filaDepois?: PageNumber[];   // só FIFO
     vitima?: PageNumber;          // página removida nessa referência, se houve
   };
   type RunResult = { passos: Step[]; faltas: number };
   ```
   A UI consome `passos[]` para animar o modo manual.
4. **`random` recebe RNG injetável.** Assinatura: `random(seq, quadros, rng?: () => number)`. Default `Math.random`. Testes passam RNG determinístico.
5. **Modo manual só existe para FIFO** (decisão do PDF). LRU/OPT/RANDOM só aparecem no modo automático e no gráfico.
6. **Validação de entrada**: número de quadros ≥ 1 (PDF). Sequência: lista de inteiros não-negativos separados por espaços ou vírgulas. Sequência vazia → 0 faltas, 0 passos.
7. **Cores por página estáveis**: a mesma página tem a mesma cor em todos os painéis, para o aluno conseguir comparar visualmente FIFO vs LRU vs OPT no modo gráfico.
8. **Sem persistência.** Estado vive em memória; `resetar` volta ao estado inicial.
9. **Animação de "piscar"** no quadro substituído (vitima): `motion/react` com duração curta (~600ms), 2 ciclos.

---

## Escopo do miniprojeto

Implementar:

- Entrada do número de quadros (mínimo 1).
- Entrada da sequência de referências (ex.: `7 0 1 2 0 3 0 4`).
- 4 algoritmos como funções puras isoladas: `fifo`, `lru`, `opt`, `random`.
- Modo **automático**: roda os 4 e mostra o total de faltas de cada um.
- Modo **manual (FIFO)**: passo a passo com estado dos quadros, fila FIFO atualizada e indicação de hit/falta.
- Modo **gráfico**: comparação visual de faltas por algoritmo (estilo Maziero, 2018).

**Entrega final** (do PDF):
1. Código funcionando no repositório.
2. Vídeo curto demonstrando o modo manual.
3. Slides explicando cada algoritmo (funcionamento, exemplos, comparação, resultados).
4. Identificação da equipe e link do repositório Git.
