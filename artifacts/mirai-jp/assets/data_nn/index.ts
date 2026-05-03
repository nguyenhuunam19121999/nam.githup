import n1 from "./n1.json";
import n2Mimikara from "./n2_mimikara.json";
import n2Soumatome from "./n2_soumatome.json";
import n2SoumatomeKanji from "./n2_soumatome_kanji.json";
import n2SoumatomeVocab from "./n2_soumatome_vocab.json";
import n3Mimikara from "./n3_mimikara.json";
import n3Soumatome from "./n3_soumatome.json";
import n4 from "./n4.json";
import n5 from "./n5.json";

export interface GrammarItem {
  id: string;
  pattern: string;
  phienAm: string;
  meaning: string;
  level: "N5" | "N4" | "N3" | "N2" | "N1";
  structure: string;
  explanation: string;
  book?: string;
  examples?: { jp: string; vi: string }[];
}

export interface KanjiCompound {
  word: string;
  reading: string;
  meaning: string;
}

export interface KanjiItem {
  id: string;
  lesson: number;
  kanji: string;
  sinon: string;
  compounds: KanjiCompound[];
  level: string;
  book: string;
}

export interface VocabItem {
  id: string;
  lesson: number;
  word: string;
  reading: string;
  meaning: string;
  category: string;
  level: string;
  book: string;
}

const JLPT_GRAMMAR: Record<string, GrammarItem[]> = {
  "n5": n5 as GrammarItem[],
  "n4": n4 as GrammarItem[],
  "mimikara-n3": n3Mimikara as GrammarItem[],
  "soumatome-n3": n3Soumatome as GrammarItem[],
  "mimikara-n2": n2Mimikara as GrammarItem[],
  "soumatome-n2": n2Soumatome as GrammarItem[],
  "n1": n1 as GrammarItem[],
};

export const GRAMMAR_BY_BOOK: Record<string, GrammarItem[]> = {
  ...JLPT_GRAMMAR,
};

export const GRAMMAR_BY_LEVEL: Record<string, GrammarItem[]> = {
  N5: n5 as GrammarItem[],
  N4: n4 as GrammarItem[],
  N3: [
    ...(n3Soumatome as GrammarItem[]),
    ...(n3Mimikara as GrammarItem[]),
  ],
  N2: [
    ...(n2Soumatome as GrammarItem[]),
    ...(n2Mimikara as GrammarItem[]),
  ],
  N1: n1 as GrammarItem[],
};

export const ALL_GRAMMAR: GrammarItem[] = [
  ...(n5 as GrammarItem[]),
  ...(n4 as GrammarItem[]),
  ...(n3Soumatome as GrammarItem[]),
  ...(n3Mimikara as GrammarItem[]),
  ...(n2Soumatome as GrammarItem[]),
  ...(n2Mimikara as GrammarItem[]),
  ...(n1 as GrammarItem[]),
];

export function getGrammar(level?: string, bookId?: string): GrammarItem[] {
  if (bookId && GRAMMAR_BY_BOOK[bookId]) return GRAMMAR_BY_BOOK[bookId];
  const lvl = (level ?? "").toUpperCase();
  if (GRAMMAR_BY_LEVEL[lvl]) return GRAMMAR_BY_LEVEL[lvl];
  return ALL_GRAMMAR;
}

export function getGrammarByBook(bookId: string): GrammarItem[] {
  return GRAMMAR_BY_BOOK[bookId] ?? [];
}

export function getGrammarById(id: string): GrammarItem | undefined {
  return ALL_GRAMMAR.find((g) => g.id === id);
}

export const N2_SOUMATOME_KANJI: KanjiItem[] = n2SoumatomeKanji as KanjiItem[];

export const N2_SOUMATOME_VOCAB: VocabItem[] = n2SoumatomeVocab as VocabItem[];

export function getKanjiByLesson(lesson: number): KanjiItem[] {
  return N2_SOUMATOME_KANJI.filter((k) => k.lesson === lesson);
}

export function getVocabByLesson(lesson: number): VocabItem[] {
  return N2_SOUMATOME_VOCAB.filter((v) => v.lesson === lesson);
}

export function getVocabByCategory(category: string): VocabItem[] {
  return N2_SOUMATOME_VOCAB.filter((v) => v.category === category);
}
