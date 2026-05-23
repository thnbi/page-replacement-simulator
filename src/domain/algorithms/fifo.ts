import type { FrameSlot, PageNumber, RunResult, Step } from '../types';
import { EMPTY_SLOT } from '../types';

/**
 * FIFO: substitui a página que está há mais tempo em memória.
 * Mantém uma fila explícita; hits não reordenam a fila.
 *
 * @example fifo([7,0,1,2,0,3,0,4,2,3,0,3,2], 3) // { faltas: 9, passos: [...] }
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
