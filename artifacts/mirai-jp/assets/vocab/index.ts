import { KANJI_DATA } from "@/assets/data_JLPT_kanji";
import type { KanjiItem } from "@/assets/data_JLPT_kanji";
import { getGrammar } from "@/assets/data_nn";
import type { GrammarItem } from "@/assets/data_nn";
import { INDUSTRY_VOCAB } from "@/assets/data_nghanh_hoc";
import type { VocabEntry } from "@/assets/data_nghanh_hoc";

export type { KanjiItem, GrammarItem, VocabEntry };

export interface RawVocab {
  id: string;
  type: "kanji" | "grammar" | "vocab";
  kanji: string;
  hiragana: string;
  hira: string;
  han: string;
  nghia: string;
  example?: string;
  exampleMeaning?: string;
  category?: string;
  level?: string;
}

function kanjiToRaw(k: KanjiItem): RawVocab {
  return {
    id: k.id,
    type: "kanji",
    kanji: k.kanji,
    hiragana: k.kunyomi[0] ?? k.onyomi[0] ?? "",
    hira: k.kunyomi[0] ?? "",
    han: k.hanViet,
    nghia: k.meanings[0] ?? "",
    example: k.examples[0] ? `${k.examples[0].jp} (${k.examples[0].reading})` : undefined,
    exampleMeaning: k.examples[0]?.vi,
    level: k.level,
    category: `Kanji ${k.level}`,
  };
}

function grammarToRaw(g: GrammarItem): RawVocab {
  return {
    id: g.id,
    type: "grammar",
    kanji: g.pattern,
    hiragana: g.phienAm,
    hira: g.phienAm,
    han: "",
    nghia: g.meaning,
    example: g.examples[0]?.jp,
    exampleMeaning: g.examples[0]?.vi,
    level: g.level,
    category: `Ngữ pháp ${g.level}`,
  };
}

function vocabEntryToRaw(v: VocabEntry, industryId: string): RawVocab {
  return {
    id: `${industryId}-${v.jp}`,
    type: "vocab",
    kanji: v.jp,
    hiragana: v.kana,
    hira: v.kana,
    han: "",
    nghia: v.vi,
    category: v.category,
  };
}

export function getVocab(level?: string, bookId?: string): RawVocab[] {
  if (bookId) {
    const industryId = bookId.replace("industry-", "");
    const industry = INDUSTRY_VOCAB.find(
      (i) => i.id === industryId || `industry-${i.id}` === bookId,
    );
    if (industry) {
      return industry.vocab.map((v) => vocabEntryToRaw(v, industry.id));
    }

    const bookLevel = bookId.includes("n3")
      ? "N3"
      : bookId.includes("n2")
        ? "N2"
        : undefined;
    if (bookLevel) {
      return (KANJI_DATA[bookLevel as keyof typeof KANJI_DATA] ?? []).map(kanjiToRaw);
    }
  }

  if (level) {
    const key = level.toUpperCase() as keyof typeof KANJI_DATA;
    const kanjiList = KANJI_DATA[key] ?? [];
    const grammarList = getGrammar(level);
    return [...kanjiList.map(kanjiToRaw), ...grammarList.map(grammarToRaw)];
  }

  const allKanji = Object.values(KANJI_DATA).flat().map(kanjiToRaw);
  const allGrammar = (["N1", "N2", "N3", "N4", "N5"] as const).flatMap((l) =>
    getGrammar(l).map(grammarToRaw),
  );
  const allVocab = INDUSTRY_VOCAB.flatMap((ind) =>
    ind.vocab.map((v) => vocabEntryToRaw(v, ind.id)),
  );
  return [...allKanji, ...allGrammar, ...allVocab];
}

export const ALL_VOCAB: RawVocab[] = getVocab();
