import type { FrameSlot, PageNumber, RunResult, Step } from '../types';
import { EMPTY_SLOT } from '../types';

/**
 * LRU: substitui a página menos recentemente usada.
 * Mantém uma "stack" de uso recente (mais recente no fim).
 *
 * @example lru([7,0,1,2,0,3,0,4,2,3,0,3,2], 3) // { faltas: 9, passos: [...] }
 */
export function lru(seq: PageNumber[], quadros: number): RunResult {
  const memoria: FrameSlot[] = new Array(quadros).fill(EMPTY_SLOT);
  // usoRecente: índice 0 = menos recente, último = mais recente
  const usoRecente: PageNumber[] = [];
  const passos: Step[] = [];
  let faltas = 0;

  for (const pagina of seq) {
    if (memoria.includes(pagina)) {
      // Hit: atualiza posição no histórico de uso
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
      // Há espaço livre: ocupa diretamente
      memoria[slotLivre] = pagina;
    } else {
      // Memória cheia: expulsa a menos recentemente usada (frente da fila)
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
