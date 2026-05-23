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
  pagina: PageNumber;
  hit: boolean;
  quadrosDepois: FrameSlot[];
  filaDepois?: PageNumber[];   // só FIFO
  vitima?: PageNumber;         // página removida nessa referência
};

export type RunResult = { passos: Step[]; faltas: number };

export type AllResults = {
  fifo: RunResult;
  lru: RunResult;
  opt: RunResult;
  randomVisual: RunResult;     // 1 execução determinística (seed base) para o modo manual
  randomMedia: number;         // média de 30 execuções, arredondada
  randomDesvio: number;        // desvio padrão (informativo)
};
```

### 3.4 Constantes nomeadas

```ts
export const DEFAULT_FRAMES = 3;
export const MIN_FRAMES = 1;
export const DEFAULT_GRAFICO_MAX = 10;
export const RANDOM_AMOSTRAS = 30;
export const RANDOM_SEED_BASE = 0xC0FFEE;  // base para seeds reprodutíveis
```

## 4. Funções de algoritmo

Assinaturas obrigatórias (nomes do PDF):

```ts
fifo(seq: PageNumber[], quadros: number): RunResult
lru (seq: PageNumber[], quadros: number): RunResult
opt (seq: PageNumber[], quadros: number): RunResult
random(seq: PageNumber[], quadros: number, rng?: () => number): RunResult
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
3. `randomMedia = round(soma_faltas / 30)`.
4. `randomDesvio = sqrt(var(faltas))`.
5. `randomVisual = random(seq, quadros, mulberry32(RANDOM_SEED_BASE))` — a primeira execução também é guardada inteira para o modo manual poder mostrar uma simulação reproduzível e step-by-step quando o aluno escolhe "RANDOM" no seletor.

## 5. Store (Zustand)

### 5.1 Shape

```ts
type SimulatorState = {
  // entrada
  quadros: number;                      // default DEFAULT_FRAMES
  sequenciaTexto: string;               // raw input do usuário
  sequencia: PageNumber[];              // parseado (derivado)
  erroParse: string | null;             // mensagem se inválido

  // resultados
  resultados: AllResults | null;        // null = ainda não executou

  // modo manual (qualquer algoritmo)
  algoritmoManual: Algorithm;           // qual algoritmo o passo-a-passo está mostrando
  passoAtual: StepIndex;                // -1 = antes de começar; 0..N-1
  vitimaPiscando: PageNumber | null;    // dispara animação no MemoryView

  // gráfico
  quadrosMaxGrafico: number;            // default DEFAULT_GRAFICO_MAX

  // ações
  setQuadros(n: number): void;
  setSequenciaTexto(s: string): void;
  setAlgoritmoManual(a: Algorithm): void;  // troca o algoritmo do passo-a-passo
  executar(): void;
  avancarPasso(): void;
  voltarPasso(): void;
  resetar(): void;
  setQuadrosMaxGrafico(n: number): void;
};
```

### 5.2 Regras

- `setSequenciaTexto` faz parse no momento da escrita, atualiza `sequencia` ou `erroParse`.
- `setQuadros` clampa em `>= MIN_FRAMES`. Em caso de inválido, mantém o último válido e seta `erroParse`.
- `setAlgoritmoManual` troca qual algoritmo o modo manual está visualizando. Como os 4 algoritmos compartilham o mesmo número de passos (`seq.length`), `passoAtual` é preservado entre trocas.
- `executar` exige `erroParse === null` e `quadros >= MIN_FRAMES`. Caso contrário no-op.
- `avancarPasso` clampa em `passos.length - 1` do algoritmo atualmente selecionado. `voltarPasso` clampa em `-1`.
- Selectors granulares no componente (`useSimulatorStore(s => s.passoAtual)`), nunca desestruturação do store inteiro.

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

- Input numérico para `quadros` (min=1).
- Textarea/input para `sequenciaTexto`.
- Botão **Executar** (desabilitado se `erroParse` ou sequência vazia).
- Botão **Resetar**.
- Mensagem de erro de parse logo abaixo do textarea (vermelho, cita o caractere ofensor).

### 6.3 ManualMode (aba "Manual")

- **Seletor de algoritmo** (radio ou segmented control): FIFO / LRU / OPT / RANDOM. Troca dispara `setAlgoritmoManual`; a interface inteira (memória, sequência, badges) reflete o algoritmo selecionado sem perder o `passoAtual`.
- Header: sequência inteira como chips horizontais; o índice `passoAtual` em destaque.
- `MemoryView`: array vertical de `quadros` slots, cada slot pintado com a cor da página (de `lib/colors.ts`). Slot vazio → texto "—".
- `HitMissBadge`: chip verde "HIT" ou vermelho "FALTA" do passo atual.
- Fila FIFO: chips horizontais com o estado de `filaDepois`. **Visível só quando `algoritmoManual === 'fifo'`** (os outros algoritmos não preenchem esse campo).
- Botões **← Voltar** e **Avançar →** (disabled nos extremos).
- Contagem corrente de faltas até o passo atual (`passos.slice(0, passoAtual+1).filter(p => !p.hit).length`) — ajuda o aluno a ver o total acumulado.
- Animação: se o passo atual tem `vitima` definida, o slot que sofreu a substituição (agora contendo a nova página) pisca (motion/react, 2 ciclos, ~600ms) para chamar atenção à troca.
- Placeholder se `resultados === null`: "Clique em Executar para começar."

### 6.4 AutoResults (aba "Automático")

Grid de 4 cards (FIFO, LRU, OPT, RANDOM):
- Total de faltas (grande, cor primária).
- Mini-tabela: `passos` | `hits` | `faltas` | `%`.
- Card RANDOM mostra "média de 30 execuções: N (±σ)".

### 6.5 ComparisonChart (aba "Gráfico")

- Slider/input para `quadrosMaxGrafico` (default 10, range 1..20).
- `LineChart` Recharts: X = quadros (1..max), Y = faltas, 4 linhas (cores fixas por algoritmo).
- Memoizado por `(sequencia, quadrosMaxGrafico)` no próprio componente (`useMemo`); chama `runAll(seq, k)` para cada `k` no range.
- Tooltip mostra os 4 valores no mesmo k.

### 6.6 Cores

`src/lib/colors.ts` exporta:
```ts
export function corDaPagina(p: PageNumber): string;
export const COR_ALGORITMO: Record<Algorithm, string>;
```

Mapa estável: página `p` mapeia sempre para a mesma cor entre algoritmos, para facilitar comparação visual. Implementação: paleta fixa de ~12 tokens Skeleton (`bg-primary-500`, `bg-success-500`, ...) indexada por `p % paleta.length`.

## 7. Validação de entrada

- `quadros`: inteiro `>= MIN_FRAMES`. Não-inteiro/negativo → mantém último válido + erro.
- `sequência`: regex `/^[\s,]*\d+([\s,]+\d+)*[\s,]*$/`. Aceita espaços e vírgulas.
- Sequência vazia: válida (`erroParse = null`), mas botão Executar fica desabilitado.
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

- Sequência clássica × 3 quadros → faltas esperadas + estado final dos quadros conferido.
- Sequência clássica × 4 quadros → faltas esperadas.
- Sequência vazia → `{ passos: [], faltas: 0 }`.
- Sequência menor que `quadros` → todas faltas, sem vítima.
- Página repetida (`[5, 5, 5]`) → 1 falta + 2 hits.
- 1 quadro → cada página nova é falta com vítima = anterior.

### 8.3 Casos específicos

- **FIFO:** `filaDepois.length === ocupação atual da memória`; um hit **não** altera a fila.
- **LRU:** caso onde difere de FIFO (`[1,2,3,1,4]`, 3 quadros): LRU expulsa 2, FIFO expulsa 1.
- **OPT:** página sem próximo uso (Infinity) é a primeira a sair.
- **RANDOM:** com `rng = () => 0` (sempre escolhe índice 0) é determinístico — contagem exata. Sem RNG, apenas `faltas >= opt.faltas` para a sequência clássica.

### 8.4 Testes do parser e runAll

- `parseSequence("7 0 1 2")` → `[7,0,1,2]`.
- `parseSequence("7,0,1,2")` → `[7,0,1,2]`.
- `parseSequence("7,, 0  1")` → `[7,0,1]` (separadores múltiplos toleráveis dentro da regex).
- `parseSequence("7 x 0")` → erro citando posição e caractere `'x'`.
- `parseSequence("")` → `[]`, sem erro.
- `runAll`: `randomMedia` é finito, `randomMedia >= opt.faltas`, `randomDesvio >= 0`.

### 8.5 Testes do store

- `executar()` com input válido preenche `resultados`.
- `executar()` com `erroParse !== null` é no-op.
- `avancarPasso()` não passa de `passos.length - 1` do algoritmo manual selecionado.
- `voltarPasso()` não desce de `-1`.
- `setAlgoritmoManual('lru')` muda o algoritmo sem resetar `passoAtual`.
- `resetar()` zera tudo de volta aos defaults (algoritmoManual = 'fifo').

### 8.6 Smoke tests de UI

- `<App />` renderiza sem crash.
- Após "Executar", aba Automático mostra os 4 cards com números.
- Após "Executar" + clicar "Avançar →" 3×, aparece um HIT ou FALTA.

### 8.7 Comando

```sh
bun run test
```

## 9. Critérios de aceite

1. Os 4 algoritmos passam contra as fixtures clássicas (3 e 4 quadros).
2. Modo manual avança/volta passo-a-passo sem crashar e mostra HIT/FALTA correto a cada passo. Seletor troca entre FIFO/LRU/OPT/RANDOM sem perder `passoAtual`; fila FIFO só aparece quando o algoritmo selecionado é FIFO.
3. Modo automático mostra os 4 totais; RANDOM mostra média.
4. Modo gráfico desenha 4 linhas com curva descendente coerente (mais quadros → menos faltas, com possíveis platôs).
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

## 11. Entregáveis do miniprojeto (do PDF)

1. Código funcionando neste repositório.
2. Vídeo curto demonstrando o modo manual.
3. Slides explicando cada algoritmo (funcionamento, exemplos, comparação, resultados).
4. Identificação da equipe e link do repositório Git.

(Itens 2, 3 e 4 são fora do escopo de implementação técnica deste spec.)
