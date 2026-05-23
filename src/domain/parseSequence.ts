import type { PageNumber } from './types';

export class ParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ParseError';
  }
}

const VALID_SEQUENCE = /^[\s,]*\d+([\s,]+\d+)*[\s,]*$/;
const SEPARATOR = /[\s,]+/;

export function parseSequence(text: string): PageNumber[] {
  if (text.trim() === '') return [];

  if (!VALID_SEQUENCE.test(text)) {
    const invalid = text.match(/[^\s,\d]/);
    if (invalid && invalid.index !== undefined) {
      // user-facing message stays in pt-BR (UX language)
      throw new ParseError(
        `Caractere inválido na posição ${invalid.index}: '${invalid[0]}'. ` +
          `Esperado: dígitos separados por espaço ou vírgula.`,
      );
    }
    throw new ParseError('Sequência inválida.');
  }

  return text
    .split(SEPARATOR)
    .filter((s) => s !== '')
    .map((s) => Number.parseInt(s, 10));
}
