import n1 from "./n1.json";
import n2 from "./n2.json";
import n3 from "./n3.json";
import n4 from "./n4.json";
import n5 from "./n5.json";

export interface GrammarExample {
  jp: string;
  vi: string;
}

export interface GrammarItem {
  id: string;
  pattern: string;
  phienAm: string;
  meaning: string;
  level: string;
  structure: string;
  explanation: string;
  examples: GrammarExample[];
}

type RawEntry = {
  id: string;
  pattern: string;
  meaning: string;
  level: string;
  usage: string;
  examples: GrammarExample[];
  notes: string;
};

function toGrammarItem(raw: RawEntry): GrammarItem {
  return {
    id: raw.id,
    pattern: raw.pattern,
    phienAm: raw.pattern,
    meaning: raw.meaning,
    level: raw.level,
    structure: raw.usage,
    explanation: raw.notes,
    examples: raw.examples,
  };
}

export type JLPTLevel = "N1" | "N2" | "N3" | "N4" | "N5";

const RAW_DATA: Record<JLPTLevel, RawEntry[]> = {
  N1: n1 as RawEntry[],
  N2: n2 as RawEntry[],
  N3: n3 as RawEntry[],
  N4: n4 as RawEntry[],
  N5: n5 as RawEntry[],
};

export function getGrammar(level: string): GrammarItem[] {
  const key = level.toUpperCase() as JLPTLevel;
  return (RAW_DATA[key] ?? []).map(toGrammarItem);
}

export function getGrammarById(id: string): GrammarItem | undefined {
  for (const level of Object.keys(RAW_DATA) as JLPTLevel[]) {
    const found = RAW_DATA[level].find((g) => g.id === id);
    if (found) return toGrammarItem(found);
  }
  return undefined;
}
