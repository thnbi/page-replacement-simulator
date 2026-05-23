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
