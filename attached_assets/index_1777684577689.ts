import n1 from "./n1.json";
import n2 from "./n2.json";
import n3 from "./n3.json";
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
  examples?: { jp: string; vi: string }[];
}

export const GRAMMAR_BY_LEVEL: Record<string, GrammarItem[]> = {
  N5: n5 as GrammarItem[],
  N4: n4 as GrammarItem[],
  N3: n3 as GrammarItem[],
  N2: n2 as GrammarItem[],
  N1: n1 as GrammarItem[],
};

export const ALL_GRAMMAR: GrammarItem[] = [
  ...(n5 as GrammarItem[]),
  ...(n4 as GrammarItem[]),
  ...(n3 as GrammarItem[]),
  ...(n2 as GrammarItem[]),
  ...(n1 as GrammarItem[]),
];

export function getGrammar(level?: string): GrammarItem[] {
  const lvl = (level ?? "").toUpperCase();
  if (GRAMMAR_BY_LEVEL[lvl]) return GRAMMAR_BY_LEVEL[lvl];
  return ALL_GRAMMAR;
}

export function getGrammarById(id: string): GrammarItem | undefined {
  return ALL_GRAMMAR.find((g) => g.id === id);
}
