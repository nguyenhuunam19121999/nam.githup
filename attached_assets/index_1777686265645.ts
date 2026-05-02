import {
  ALL_INDUSTRY_VOCAB,
  INDUSTRY_VOCAB,
} from "../data_nghanh_hoc";
import n1 from "./n1.json";
import n2Mimikara from "./n2_mimikara.json";
import n2Soumatome from "./n2_soumatome.json";
import n3Mimikara from "./n3_mimikara.json";
import n3Soumatome from "./n3_soumatome.json";
import n4 from "./n4.json";
import n5 from "./n5.json";

export interface RawVocab {
  kanji?: string;
  hira?: string;
  hiragana?: string;
  han?: string;
  nghia?: string;
  example?: string;
  exampleMeaning?: string;
  category?: string;
}

// Bộ dữ liệu theo cấp JLPT và theo sách (Mimikara / Soumatome)
const JLPT_VOCAB: Record<string, RawVocab[]> = {
  "n5": n5 as RawVocab[],
  "n4": n4 as RawVocab[],
  "mimikara-n3": n3Mimikara as RawVocab[],
  "soumatome-n3": n3Soumatome as RawVocab[],
  "mimikara-n2": n2Mimikara as RawVocab[],
  "soumatome-n2": n2Soumatome as RawVocab[],
  "n1": n1 as RawVocab[],
};

// Map dùng chung: tra cứu theo bookId duy nhất (cấp JLPT hoặc ngành nghề)
export const VOCAB_BY_BOOK: Record<string, RawVocab[]> = {
  ...JLPT_VOCAB,
  ...INDUSTRY_VOCAB,
};

export const ALL_VOCAB: RawVocab[] = [
  ...(n5 as RawVocab[]),
  ...(n4 as RawVocab[]),
  ...(n3Mimikara as RawVocab[]),
  ...(n3Soumatome as RawVocab[]),
  ...(n2Mimikara as RawVocab[]),
  ...(n2Soumatome as RawVocab[]),
  ...(n1 as RawVocab[]),
  ...ALL_INDUSTRY_VOCAB,
];

export function getVocab(level?: string, bookId?: string): RawVocab[] {
  if (bookId && VOCAB_BY_BOOK[bookId]) return VOCAB_BY_BOOK[bookId];
  const lvl = (level ?? "").toUpperCase();
  if (lvl === "N5") return n5 as RawVocab[];
  if (lvl === "N4") return n4 as RawVocab[];
  if (lvl === "N3") return n3Mimikara as RawVocab[];
  if (lvl === "N2") return n2Mimikara as RawVocab[];
  if (lvl === "N1") return n1 as RawVocab[];
  return ALL_VOCAB;
}
