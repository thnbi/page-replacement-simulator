# Page Replacement Simulator — Design

**Data:** 2026-05-22
**Status:** Aprovado para implementação
**Disciplina:** Sistemas Operacionais — IFSC, Tecnologia em ADS
**Especificação canônica:** `MiniprojetoSubstitucaoPagina (2).pdf` (em caso de divergência, o PDF vence)

## 1. Objetivo

Simulador web didático que executa e visualiza os quatro algoritmos clássicos de substituição de página (FIFO, LRU, OPT, RANDOM) sobre uma sequência de referências, com três modos de operação: manual (passo a passo, com seletor para escolher qualquer um dos 4 algoritmos), automático (totais dos 4) e gráfico (comparação faltas × quadros).

## 2. Decisões de produto

| Decisão | Escolha | Motivo |
|---|---|---|
| Layout das visualizações | Abas (Skeleton tabs) com painel de entrada fixo no topo | Mantém o foco em um modo por vez para uso em sala de aula |
| Eixo X do modo Gráfico | Nº de quadros (1..N), Y = faltas, 4 séries | Estilo Maziero (2018); evidencia a curva de Belády |
| Tratamento do RANDOM | Média de 30 execuções com seeds determinísticas (`mulberry32`) + 1 execução de amostra para visualização | Aluno entende que RANDOM fica em média entre OPT e o pior caso |
| Stack | React 19 + TS + Tailwind v4 + Skeleton v3 + Zustand + Recharts + Motion + Vitest + Biome (Bun como runner) | Decisão do time; PDF pede `index.html` único, mas mantemos `fifo/lru/opt/random` como funções JS separadas para preservar o critério |
| Abordagem de implementação | Domain-first, bottom-up (TDD) | Garante corretude das fixtures antes de gastar tempo em UI |

## 3. Arquitetura

### 3.1 Camadas

```
App.tsx
  ├─ InputPanel               (quadros + sequência + Executar/Resetar)
  └─ Tabs (Skeleton)
       ├─ ManualMode          (passo-a-passo FIFO)
       ├─ AutoResults         (4 totais)
       └─ ComparisonChart     (Recharts: faltas × quadros)

store/simulator.ts (Zustand)
   ↑↓ chama
domain/runAll.ts → domain/algorithms/{fifo,lru,opt,random}.ts
                 → domain/parseSequence.ts
lib/colors.ts   (mapa página → cor estável)
```

**Regra de ouro:** `src/domain/` não importa nada de React, Zustand ou DOM. É testável isoladamente com Vitest.

### 3.2 Estrutura de pastas

```
src/
├── main.tsx
├── App.tsx
├── app.css
│
├── domain/
│   ├── types.ts
│   ├── algorithms/
│   │   ├── fifo.ts
│   │   ├── lru.ts
│   │   ├── opt.ts
│   │   └── random.ts
│   ├── parseSequence.ts
│   ├── runAll.ts
│   └── mulberry32.ts          # RNG seedável (compartilhado domain/teste)
│
├── store/
│   └── simulator.ts
│
├── components/
│   ├── InputPanel.tsx
│   ├── MemoryView.tsx
│   ├── ManualMode.tsx
│   ├── AutoResults.tsx
│   ├── ComparisonChart.tsx
│   └── HitMissBadge.tsx
│
├── lib/
│   └── colors.ts
│
└── test/
    ├── setup.ts
    └── fixtures.ts            # SEQ_CLASSICA + tabela esperada
```

### 3.3 Tipos centrais (`src/domain/types.ts`)

```ts
export type PageNumber = number;        // valor da página referenciada
export type FrameIndex = number;        // posição no array de quadros
export type StepIndex = number;         // posição na sequência
export type Algorithm = 'fifo' | 'lru' | 'opt' | 'random';

export const EMPTY_SLOT = null;
export type FrameSlot = PageNumber | null;

export type Step = {
  page: PageNumber;
  hit: boolean;
  framesAfter: FrameSlot[];
  queueAfter?: PageNumber[];   // FIFO only
  victim?: PageNumber;         // page evicted on this reference
};

export type RunResult = { steps: Step[]; faults: number };

export type AllResults = {
  fifo: RunResult;
  lru: RunResult;
  opt: RunResult;
  randomVisual: RunResult;     // single deterministic run (base seed) for manual mode
  randomMean: number;          // mean of 30 runs, rounded
  randomStdev: number;         // standard deviation (informational)
};
```

### 3.4 Constantes nomeadas

```ts
export const DEFAULT_FRAMES = 3;
export const MIN_FRAMES = 1;
export const DEFAULT_CHART_MAX = 10;
export const MAX_CHART_FRAMES = 20;
export const RANDOM_SAMPLES = 30;
export const RANDOM_SEED_BASE = 0xc0ffee;  // base for reproducible seeds
```

## 4. Funções de algoritmo

Assinaturas obrigatórias (nomes do PDF):

```ts
fifo(seq: PageNumber[], frames: number): RunResult
lru (seq: PageNumber[], frames: number): RunResult
opt (seq: PageNumber[], frames: number): RunResult
random(seq: PageNumber[], frames: number, rng?: () => number): RunResult
```

### 4.1 Comportamento

- **FIFO:** mantém fila explícita. Em falta, expulsa o primeiro da fila. Hit não reordena a fila.
- **LRU:** mantém ordem de uso recente. Em falta, expulsa o menos recentemente usado. Hit move a página para o topo.
- **OPT:** para cada página em memória, calcula o próximo índice de uso em `seq.slice(i+1)`. Página sem próximo uso → `Infinity` → primeira a sair.
- **RANDOM:** em falta com memória cheia, sorteia índice via `rng()` (default `Math.random`). Aceita RNG injetável para teste e para a média de 30 execuções.

### 4.2 Imutabilidade

Nunca mutar `seq` ou `quadrosAnteriores`. Cada `Step` recebe cópias novas (`quadrosDepois`, `filaDepois`).

### 4.3 Casos-borda

- `seq` vazia → `{ passos: [], faltas: 0 }`.
- `seq.length < quadros` → todas faltas, nenhuma vítima.
- `quadros < 1` → não chega aqui; é responsabilidade do store/UI bloquear.
- Página repetida consecutiva → primeira falta, repetições são hits.

### 4.4 `runAll(seq, quadros): AllResults`

1. Chama `fifo`, `lru`, `opt` uma vez cada.
2. Roda `random` 30× com `mulberry32(RANDOM_SEED_BASE + i)` para `i = 0..29` (para média e desvio).
3. `randomMean = round(sum / 30)`.
4. `randomStdev = sqrt(variance)`.
5. `randomVisual = random(seq, frames, mulberry32(RANDOM_SEED_BASE))` — a primeira execução é guardada inteira para o modo manual poder mostrar uma simulação reproduzível step-by-step quando o aluno escolhe "RANDOM" no seletor.

## 5. Store (Zustand)

### 5.1 Shape

```ts
type SimulatorState = {
  // input
  frames: number;                       // default DEFAULT_FRAMES
  sequenceText: string;                 // raw user input
  sequence: PageNumber[];               // parsed (derived)
  parseError: string | null;            // message if invalid

  // results
  results: AllResults | null;           // null = not run yet

  // manual mode (any algorithm)
  manualAlgorithm: Algorithm;           // which algorithm the walkthrough is showing
  stepIndex: StepIndex;                 // -1 = before start; 0..N-1

  // chart
  maxChartFrames: number;               // default DEFAULT_CHART_MAX

  // actions
  setFrames(n: number): void;
  setSequenceText(s: string): void;
  setManualAlgorithm(a: Algorithm): void;
  run(): void;
  stepForward(): void;
  stepBack(): void;
  reset(): void;
  setMaxChartFrames(n: number): void;
};
```

### 5.2 Regras

- `setSequenceText` faz parse no momento da escrita, atualiza `sequence` ou `parseError`.
- `setFrames` clampa em `>= MIN_FRAMES`. Em caso de inválido, mantém o último válido.
- `setManualAlgorithm` troca qual algoritmo o modo manual está visualizando. Como os 4 algoritmos compartilham o mesmo número de passos (`seq.length`), `stepIndex` é preservado entre trocas.
- `run` exige `parseError === null` e `frames >= MIN_FRAMES`. Caso contrário no-op.
- `stepForward` clampa em `steps.length - 1` do algoritmo atualmente selecionado. `stepBack` clampa em `-1`.
- Selectors granulares no componente (`useSimulatorStore(s => s.stepIndex)`), nunca desestruturação do store inteiro.

## 6. UI / Componentes

### 6.1 Layout

```
┌──────────────────────────────────────────────┐
│ Quadros: [3]   Sequência: [7 0 1 2 0 3 0 4]  │
│ [Executar] [Resetar]   (erro de parse aqui)   │
├──────────────────────────────────────────────┤
│ ( Manual FIFO )( Automático )( Gráfico )     │
├──────────────────────────────────────────────┤
│                                              │
│   conteúdo da aba ativa                      │
│                                              │
└──────────────────────────────────────────────┘
```

### 6.2 InputPanel

- Input numérico para `frames` (min=1).
- Textarea/input para `sequenceText`.
- Botão **Executar** (desabilitado se `parseError` ou sequência vazia).
- Botão **Resetar**.
- Mensagem de erro de parse logo abaixo do textarea (vermelho, cita o caractere ofensor).

### 6.3 ManualMode (aba "Manual")

- **Seletor de algoritmo** (radio ou segmented control): FIFO / LRU / OPT / RANDOM. Troca dispara `setManualAlgorithm`; a interface inteira (memória, sequência, badges) reflete o algoritmo selecionado sem perder o `stepIndex`.
- Header: sequência inteira como chips horizontais; o índice `stepIndex` em destaque.
- `MemoryView`: array vertical de `frames` slots, cada slot pintado com a cor da página (de `lib/colors.ts`). Slot vazio → texto "—".
- `HitMissBadge`: chip verde "HIT" ou vermelho "FALTA" do passo atual.
- Fila FIFO: chips horizontais com o estado de `queueAfter`. **Visível só quando `manualAlgorithm === 'fifo'`** (os outros algoritmos não preenchem esse campo).
- Botões **← Voltar** e **Avançar →** (disabled nos extremos).
- Contagem corrente de faltas até o passo atual (`steps.slice(0, stepIndex+1).filter(s => !s.hit).length`) — ajuda o aluno a ver o total acumulado.
- Animação: se o passo atual tem `victim` definido, o slot que sofreu a substituição (agora contendo a nova página) pisca (motion/react, 2 ciclos, ~600ms) para chamar atenção à troca.
- Placeholder se `results === null`: "Clique em Executar para começar."

### 6.4 AutoResults (aba "Automático")

Grid de 4 cards (FIFO, LRU, OPT, RANDOM):
- Total de faltas (grande, cor primária).
- Mini-tabela: `steps` | `hits` | `faults` | `%`.
- Card RANDOM mostra "média de 30 execuções: N (±σ)".

### 6.5 ComparisonChart (aba "Gráfico")

- Slider/input para `maxChartFrames` (default 10, range 1..20).
- `LineChart` Recharts: X = frames (1..max), Y = faults, 4 linhas (cores fixas por algoritmo).
- Memoizado por `(sequence, maxChartFrames)` no próprio componente (`useMemo`); chama `runAll(seq, k)` para cada `k` no range.
- Tooltip mostra os 4 valores no mesmo k.

### 6.6 Cores

`src/lib/colors.ts` exporta:
```ts
export function pageColor(p: PageNumber): string;
export const ALGORITHM_COLOR: Record<Algorithm, string>;
export const ALGORITHM_LABEL: Record<Algorithm, string>;
```

Mapa estável: página `p` mapeia sempre para a mesma cor entre algoritmos, para facilitar comparação visual. Implementação: paleta fixa de ~12 tokens Skeleton indexada por `p % palette.length`.

## 7. Validação de entrada

- `frames`: inteiro `>= MIN_FRAMES`. Não-inteiro/negativo → mantém último válido + erro.
- `sequence`: regex `/^[\s,]*\d+([\s,]+\d+)*[\s,]*$/`. Aceita espaços e vírgulas.
- Sequência vazia: válida (`parseError = null`), mas botão Executar fica desabilitado.
- Erro de parse: mensagem citando o caractere e a posição. Exemplo: `"Caractere inválido na posição 7: 'x'. Esperado: dígitos separados por espaço ou vírgula."`

## 8. Testes (Vitest + Testing Library)

### 8.1 Fixtures canônicas (`src/test/fixtures.ts`)

Sequência clássica do PDF: `7 0 1 2 0 3 0 4 2 3 0 3 2`

| Quadros | FIFO | LRU | OPT |
|---|---|---|---|
| 3 | 10 | 9 | 7 |
| 4 | 7 | 6 | 6 |

Valores conferidos por trace manual passo-a-passo (Tanenbaum, *Modern OS*). A tabela no `CLAUDE.md` traz valores incorretos copiados de outra sequência (o exemplo clássico de anomalia de Belády usa `1 2 3 4 1 2 5 1 2 3 4 5`, não esta).

### 8.2 Casos por algoritmo (FIFO/LRU/OPT)

- Sequência clássica × 3 frames → faltas esperadas + estado final conferido.
- Sequência clássica × 4 frames → faltas esperadas.
- Sequência vazia → `{ steps: [], faults: 0 }`.
- Sequência menor que `frames` → todas faltas, sem vítima.
- Página repetida (`[5, 5, 5]`) → 1 falta + 2 hits.
- 1 frame → cada página nova é falta com vítima = anterior.

### 8.3 Casos específicos

- **FIFO:** `queueAfter.length === ocupação atual da memória`; um hit **não** altera a fila.
- **LRU:** caso onde difere de FIFO (`[1,2,3,1,4]`, 3 frames): LRU expulsa 2, FIFO expulsa 1.
- **OPT:** página sem próximo uso (Infinity) é a primeira a sair.
- **RANDOM:** com `rng = () => 0` (sempre escolhe índice 0) é determinístico — contagem exata. Sem RNG, apenas `faults >= opt.faults` para a sequência clássica.

### 8.4 Testes do parser e runAll

- `parseSequence("7 0 1 2")` → `[7,0,1,2]`.
- `parseSequence("7,0,1,2")` → `[7,0,1,2]`.
- `parseSequence("7,, 0  1")` → `[7,0,1]` (separadores múltiplos toleráveis).
- `parseSequence("7 x 0")` → `ParseError` citando posição e caractere `'x'`.
- `parseSequence("")` → `[]`, sem erro.
- `runAll`: `randomMean` é finito, `randomMean >= opt.faults`, `randomStdev >= 0`.

### 8.5 Testes do store

- `run()` com input válido preenche `results`.
- `run()` com `parseError !== null` é no-op.
- `stepForward()` não passa de `steps.length - 1` do algoritmo manual selecionado.
- `stepBack()` não desce de `-1`.
- `setManualAlgorithm('lru')` muda o algoritmo sem resetar `stepIndex`.
- `reset()` zera tudo de volta aos defaults (`manualAlgorithm = 'fifo'`).

### 8.6 Smoke tests de UI

- `<App />` renderiza sem crash.
- Após "Executar", aba Automático mostra os 4 cards com números.
- Após "Executar" + clicar "Avançar →" 3×, aparece um HIT ou FALTA.

### 8.7 Comando

```sh
bun run test
```

## 9. Critérios de aceite

1. Os 4 algoritmos passam contra as fixtures clássicas (3 e 4 frames).
2. Modo manual avança/volta passo-a-passo sem crashar e mostra HIT/FALTA correto a cada passo. Seletor troca entre FIFO/LRU/OPT/RANDOM sem perder `stepIndex`; fila FIFO só aparece quando o algoritmo selecionado é FIFO.
3. Modo automático mostra os 4 totais; RANDOM mostra média.
4. Modo gráfico desenha 4 linhas com curva descendente coerente (mais frames → menos faltas, com possíveis platôs).
5. Validação de entrada: número inválido bloqueia Executar com mensagem clara.
6. `bun run test` verde. `bun run check` verde.
7. `bun run build` produz dist sem erro de TS.

## 10. Não-objetivos (fora de escopo)

- Anomalia de Belády em FIFO (visualização especial) — pode ser adicionada depois.
- Persistência (localStorage, URL state).
- Exportar resultados (CSV/PNG do gráfico).
- Modo escuro (tema fixo `hamlindigo` light).
- i18n (UI em pt-BR somente).
- Suportar páginas com identificador não-numérico.

## 11. Entregáveis do miniprojeto

1. Código funcionando neste repositório.
2. Identificação da equipe e link do repositório Git.

(Vídeo e slides foram removidos do escopo pelo time.)
