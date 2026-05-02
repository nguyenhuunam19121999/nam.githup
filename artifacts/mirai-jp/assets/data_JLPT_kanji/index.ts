import n1 from "./n1.json";
import n2 from "./n2.json";
import n3 from "./n3.json";
import n4 from "./n4.json";
import n5 from "./n5.json";

export interface KanjiExample {
  jp: string;
  reading: string;
  vi: string;
}

export interface KanjiComponent {
  kanji: string;
  hanViet: string;
}

export interface KanjiItem {
  id: string;
  kanji: string;
  hanViet: string;
  kunyomi: string[];
  onyomi: string[];
  strokes: number;
  level: string;
  frequency: number;
  components: KanjiComponent[];
  meanings: string[];
  examples: KanjiExample[];
}

export type JLPTLevel = "N1" | "N2" | "N3" | "N4" | "N5";

export const KANJI_DATA: Record<JLPTLevel, KanjiItem[]> = {
  N1: n1 as KanjiItem[],
  N2: n2 as KanjiItem[],
  N3: n3 as KanjiItem[],
  N4: n4 as KanjiItem[],
  N5: n5 as KanjiItem[],
};

export function getKanji(level: string): KanjiItem[] {
  const key = level.toUpperCase() as JLPTLevel;
  return KANJI_DATA[key] ?? [];
}

export function findKanjiById(id: string): KanjiItem | undefined {
  for (const level of Object.keys(KANJI_DATA) as JLPTLevel[]) {
    const found = KANJI_DATA[level].find((k) => k.id === id || k.kanji === id);
    if (found) return found;
  }
  return undefined;
}
