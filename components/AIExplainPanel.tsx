//// components/AIExplainPanel.tsx
// Khung chat AI luôn hiển thị sẵn. Nội dung giờ là mảng ContentSegment[] (để
// hỗ trợ furigana thật ở mọi trường), nhưng vẫn giữ hiệu ứng gõ CHỮ TỪNG KÝ TỰ
// như bản gốc: gõ hết ký tự trong 1 segment → sang segment kế → hết segment
// của 1 mục → sang mục kế tiếp. Furigana của 1 segment hiện cùng lúc với chữ
// (không phải gõ riêng), vì mỗi segment thường chỉ 1-2 chữ nên không đáng chú ý.

import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useColors } from "../artifacts/mirai-jp/hooks/useColors";
import {
  lookupAI,
  AIResult,
  AILookupType,
  ContentSegment,
  NotAuthenticatedError,
  AIQuotaExceededError,
  AIMaintenanceError,
} from "../services/aiService";
import { getLocalAiCache } from "../services/aiCacheLocal";
import FuriganaText from "./FuriganaText";

interface AIExplainPanelProps {
  type: AILookupType;
  word: string;
  context?: string;
}

const AI_GRAD = ["#6366F1", "#A855F7"] as const;
const TYPING_CHARS_PER_TICK = 1;
const TYPING_TICK_MS = 30;
const CHAT_BOX_HEIGHT = 260;

type TypingUnit =
  | { kind: "segments"; segments: ContentSegment[] }
  | { kind: "plain"; text: string };

type UnitMeta = { exampleIndex: number; part: "jp" | "vi" } | undefined;

interface BlockDef {
  key: string;
  icon: string;
  label: string;
  units: TypingUnit[];
  unitMeta?: UnitMeta[];
}

function segsLength(segments: ContentSegment[]): number {
  return segments.reduce((sum, s) => sum + (s.text?.length || 0), 0);
}

function unitLength(unit: TypingUnit): number {
  return unit.kind === "segments"
    ? segsLength(unit.segments)
    : unit.text?.length || 0;
}

function truncateUnit(unit: TypingUnit, n: number): TypingUnit {
  return unit.kind === "segments"
    ? { kind: "segments", segments: truncateSegments(unit.segments, n) }
    : { kind: "plain", text: (unit.text || "").slice(0, n) };
}

function truncateSegments(
  segments: ContentSegment[],
  n: number,
): ContentSegment[] {
  const out: ContentSegment[] = [];
  let remaining = n;
  for (const seg of segments) {
    if (remaining <= 0) break;
    const text = seg.text || "";
    if (text.length <= remaining) {
      out.push(seg);
      remaining -= text.length;
    } else {
      out.push({ text: text.slice(0, remaining), furigana: seg.furigana });
      remaining = 0;
    }
  }
  return out;
}

function groupKanjiBreakdown(segments: ContentSegment[]): ContentSegment[][] {
  const groups: ContentSegment[][] = [];
  for (const seg of segments) {
    const startsNewGroup = !!seg.furigana?.trim();
    if (startsNewGroup || groups.length === 0) {
      groups.push([seg]);
    } else {
      groups[groups.length - 1].push(seg);
    }
  }
  return groups;
}

function buildBlocks(r: AIResult, type: AILookupType): BlockDef[] {
  const blocks: BlockDef[] = [];

  if (r.parseFailed) {
    blocks.push({
      key: "raw",
      icon: "📖",
      label: "Nghĩa",
      units: [{ kind: "plain", text: r.meaningRaw ?? "" }],
    });
    return blocks;
  }

  blocks.push({
    key: "meaning",
    icon: "📖",
    label: "Nghĩa",
    units: [{ kind: "segments", segments: r.meaning || [] }],
  });

  if (type === "vocab" && r.part_of_speech?.trim()) {
    blocks.push({
      key: "pos",
      icon: "🏷️",
      label: "Từ loại",
      units: [{ kind: "plain", text: r.part_of_speech }],
    });
  }
  if (type === "grammar" && r.structure?.length) {
    blocks.push({
      key: "structure",
      icon: "🧩",
      label: "Cấu trúc",
      units: [{ kind: "segments", segments: r.structure }],
    });
  }
  if (r.usage?.length) {
    blocks.push({
      key: "usage",
      icon: "✏️",
      label: "Cách dùng",
      units: [{ kind: "segments", segments: r.usage }],
    });
  }
  if (type === "grammar" && r.conjugation?.length) {
    blocks.push({
      key: "conjugation",
      icon: "🔄",
      label: "Biến đổi",
      units: [{ kind: "segments", segments: r.conjugation }],
    });
  }
  if (type === "kanji" && r.stroke_count_note?.length) {
    const groups = groupKanjiBreakdown(r.stroke_count_note);
    blocks.push({
      key: "strokeNote",
      icon: "✍️",
      label: "Mẹo nhớ mặt chữ",
      units: groups.map(
        (g) => ({ kind: "segments", segments: g }) as TypingUnit,
      ),
    });
  }
  if (type === "vocab" && r.kanji_breakdown?.length) {
    const groups = groupKanjiBreakdown(r.kanji_breakdown);
    blocks.push({
      key: "kanjiBreakdown",
      icon: "🈁",
      label: "Phân tích kanji trong từ",
      units: groups.map(
        (g) => ({ kind: "segments", segments: g }) as TypingUnit,
      ),
    });
  }

  if (r.examples?.length) {
    const units: TypingUnit[] = [];
    const unitMeta: UnitMeta[] = [];
    r.examples.forEach((ex, i) => {
      units.push({ kind: "segments", segments: ex.jp_segments || [] });
      unitMeta.push({ exampleIndex: i, part: "jp" });
      units.push({ kind: "plain", text: ex.vi || "" });
      unitMeta.push({ exampleIndex: i, part: "vi" });
    });
    blocks.push({
      key: "examples",
      icon: "📝",
      label: "Ví dụ",
      units,
      unitMeta,
    });
  }

  if (type === "vocab" && r.collocations?.length) {
    blocks.push({
      key: "collocations",
      icon: "🔗",
      label: "Kết hợp từ thường gặp",
      units: [{ kind: "segments", segments: r.collocations }],
    });
  }
  if (r.synonyms_distinction?.length) {
    blocks.push({
      key: "synonyms",
      icon: "🔍",
      label: "Phân biệt từ/mẫu đồng nghĩa",
      units: [{ kind: "segments", segments: r.synonyms_distinction }],
    });
  }
  if (type === "kanji" && r.similar_kanji?.length) {
    blocks.push({
      key: "similarKanji",
      icon: "⚠️",
      label: "Kanji dễ nhầm",
      units: [{ kind: "segments", segments: r.similar_kanji }],
    });
  }
  if (type === "grammar" && r.jlpt_level?.trim()) {
    blocks.push({
      key: "jlpt",
      icon: "🎓",
      label: "Cấp độ JLPT",
      units: [{ kind: "plain", text: r.jlpt_level }],
    });
  }
  if (r.notes?.length) {
    blocks.push({
      key: "notes",
      icon: "💡",
      label: "Ghi chú",
      units: [{ kind: "segments", segments: r.notes }],
    });
  }

  return blocks;
}

function ThinkingDots({ color }: { color: string }) {
  const [dotCount, setDotCount] = useState(1);
  useEffect(() => {
    const id = setInterval(() => setDotCount((n) => (n % 3) + 1), 400);
    return () => clearInterval(id);
  }, []);
  return (
    <Text style={{ color, fontSize: 13, fontWeight: "700" }}>
      AI Thinking{".".repeat(dotCount)}
    </Text>
  );
}

function renderUnitNode(
  blockKey: string,
  unitIdx: number,
  unit: TypingUnit,
  meta: UnitMeta,
  color: string,
  mutedColor: string,
) {
  const key = `${blockKey}_${unitIdx}`;

  if (meta) {
    if (meta.part === "jp") {
      return (
        <View key={key} style={styles.exampleItem}>
          <Text style={[styles.exampleIndex, { color: mutedColor }]}>
            {meta.exampleIndex + 1}.
          </Text>
          <View style={styles.exampleContent}>
            {unit.kind === "segments" && (
              <FuriganaText segments={unit.segments} color={color} />
            )}
          </View>
        </View>
      );
    }
    // part === 'vi'
    return (
      <Text
        key={key}
        style={[
          styles.exampleVi,
          styles.exampleViIndent,
          { color: mutedColor },
        ]}
      >
        {unit.kind === "plain" ? `→ ${unit.text}` : ""}
      </Text>
    );
  }
  return unit.kind === 'segments' ? (
    <View key={key} style={unitIdx > 0 ? { marginTop: 6 } : undefined}>
      <FuriganaText segments={unit.segments} color={color} />
    </View>
  ) : (
    <Text key={key} style={[styles.resultText, { color }]}>
      {unit.text}
    </Text>
  );
}

function renderBlock(
  block: BlockDef,
  doneUnits: number,
  partialCharCount: number,
  color: string,
  mutedColor: string,
) {
  const nodes: React.ReactNode[] = [];
  block.units.forEach((unit, idx) => {
    let toRender: TypingUnit | null = null;
    if (idx < doneUnits) toRender = unit;
    else if (idx === doneUnits) toRender = truncateUnit(unit, partialCharCount);
    if (toRender) {
      nodes.push(
        renderUnitNode(
          block.key,
          idx,
          toRender,
          block.unitMeta?.[idx],
          color,
          mutedColor,
        ),
      );
    }
  });

  return (
    <View key={block.key} style={styles.block}>
      <Text style={[styles.blockHeader, { color }]}>
        {block.icon} {block.label}
      </Text>
      {nodes}
    </View>
  );
}

export default function AIExplainPanel({
  type,
  word,
  context,
}: AIExplainPanelProps) {
  const c = useColors();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<AIResult | null>(null);

  const [blocks, setBlocks] = useState<BlockDef[]>([]);
  // Vị trí gõ hiện tại: đang ở block nào, unit thứ mấy trong block đó đã gõ
  // xong hoàn toàn (doneUnits), và đã gõ được bao nhiêu ký tự trong unit đang
  // gõ dở (charCount).
  const [pos, setPos] = useState({ blockIdx: 0, doneUnits: 0, charCount: 0 });
  const [typingDone, setTypingDone] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!result) return;

    const built = buildBlocks(result, type);
    setBlocks(built);
    setPos({ blockIdx: 0, doneUnits: 0, charCount: 0 });
    setTypingDone(built.length === 0);

    if (built.length === 0) return;

    timerRef.current = setInterval(() => {
      setPos((prev) => {
        let { blockIdx, doneUnits, charCount } = prev;

        // Bỏ qua các block rỗng (không có unit nào) — không nên xảy ra
        // nhưng phòng hờ.
        while (blockIdx < built.length && built[blockIdx].units.length === 0) {
          blockIdx += 1;
          doneUnits = 0;
          charCount = 0;
        }

        if (blockIdx >= built.length) {
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = null;
          setTypingDone(true);
          return prev;
        }

        const block = built[blockIdx];
        const unit = block.units[doneUnits];
        const total = unitLength(unit);

        charCount += TYPING_CHARS_PER_TICK;
        scrollRef.current?.scrollToEnd({ animated: false });

        if (charCount >= total) {
          doneUnits += 1;
          charCount = 0;
          if (doneUnits >= block.units.length) {
            blockIdx += 1;
            doneUnits = 0;
          }
        }

        if (blockIdx >= built.length) {
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = null;
          setTypingDone(true);
        }

        return { blockIdx, doneUnits, charCount };
      });
    }, TYPING_TICK_MS);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [result]);

  const handlePress = async () => {
    if (result || loading) return;

    setLoading(true);
    setErrorMsg(null);
    try {
      const cached = await getLocalAiCache(type, word);
      if (cached) {
        setResult(cached);
        return;
      }
      const r = await lookupAI(type, word, context);
      setResult(r);
    } catch (err: any) {
      console.error("[AIExplainPanel] Lỗi thật khi tra cứu AI:", err);
      if (err instanceof NotAuthenticatedError) {
        setErrorMsg("Vui lòng đăng nhập để dùng tính năng tra cứu AI.");
      } else if (err instanceof AIQuotaExceededError) {
        const resetTime = err.resetAt
          ? new Date(err.resetAt).toLocaleTimeString("vi-VN", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : null;
        setErrorMsg(
          `Bạn đã dùng hết ${err.used ?? "?"}/${err.limit ?? "?"} lượt tra cứu AI hôm nay. ` +
            (resetTime
              ? `Quay lại sau ${resetTime} nhé.`
              : "Quay lại vào ngày mai nhé."),
        );
      } else if (err instanceof AIMaintenanceError) {
        setErrorMsg("Hệ thống AI đang bảo trì, vui lòng thử lại sau ít phút.");
      } else {
        setErrorMsg("Có lỗi khi tra cứu AI, vui lòng thử lại.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setResult(null);
    setErrorMsg(null);
    setBlocks([]);
    setPos({ blockIdx: 0, doneUnits: 0, charCount: 0 });
    setTypingDone(false);
    handlePress();
  };

  const hasAnyContent = loading || !!errorMsg || !!result;
  const isThinking = loading;
  const isTypingInProgress = !!result && !typingDone && !errorMsg;
  const isFullyDone = !!result && typingDone && !errorMsg;

  let buttonLabel = "🤖 Tra cứu từ AI";
  if (isThinking) buttonLabel = "";
  else if (errorMsg) buttonLabel = "🔄 Thử lại";
  else if (isTypingInProgress) buttonLabel = "AI replying...";
  else if (isFullyDone) buttonLabel = "Completed";

  const buttonDisabled = loading || isTypingInProgress || isFullyDone;

  return (
    <View style={styles.wrapper}>
      <LinearGradient
        colors={AI_GRAD}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBorder}
      >
        <View style={[styles.chatBox, { backgroundColor: "#272829" }]}>
          <LinearGradient
            colors={AI_GRAD}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.header}
          >
            <Text style={styles.headerIcon}>🤖</Text>
            <Text style={styles.headerTitle}>Trợ lý AI Mirai</Text>
          </LinearGradient>

          <ScrollView
            ref={scrollRef}
            style={{ maxHeight: CHAT_BOX_HEIGHT }}
            contentContainerStyle={styles.chatContent}
            showsVerticalScrollIndicator
          >
            {!hasAnyContent && (
              <Text
                style={[styles.placeholderText, { color: c.mutedForeground }]}
              >
                🤖 Nhấn &quot;Tra cứu từ AI&quot; bên dưới để xem giải thích chi
                tiết về <Text style={{ fontWeight: "700" }}>{word}</Text>...
              </Text>
            )}

            {isThinking && (
              <View style={styles.thinkingRow}>
                <ThinkingDots color="#8B5CF6" />
              </View>
            )}

            {errorMsg && !loading && (
              <Text style={[styles.errorText, { color: c.destructive }]}>
                {errorMsg}
              </Text>
            )}

            {result && !errorMsg && !loading && (
              <>
                {blocks.map((block, idx) => {
                  if (idx < pos.blockIdx) {
                    return renderBlock(
                      block,
                      block.units.length,
                      0,
                      "#f2f5f9",
                      c.mutedForeground,
                    );
                  }
                  if (idx === pos.blockIdx) {
                    return renderBlock(
                      block,
                      pos.doneUnits,
                      pos.charCount,
                      "#f2f5f9",
                      c.mutedForeground,
                    );
                  }
                  return null;
                })}
              </>
            )}
          </ScrollView>
        </View>
      </LinearGradient>

      <TouchableOpacity
        onPress={errorMsg ? handleRetry : handlePress}
        activeOpacity={0.85}
        disabled={buttonDisabled}
        style={styles.triggerBtnWrapper}
      >
        <LinearGradient
          colors={
            buttonDisabled && !isThinking && !errorMsg
              ? ["#94A3B8", "#94A3B8"]
              : AI_GRAD
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.triggerBtn}
        >
          {isThinking ? (
            <ThinkingDots color="#fff" />
          ) : (
            <Text style={styles.triggerText}>{buttonLabel}</Text>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 16 },
  gradientBorder: {
    borderRadius: 14,
    padding: 2,
    marginBottom: 10,
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  chatBox: { borderRadius: 12, overflow: "hidden" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 6,
  },
  headerIcon: { fontSize: 16 },
  headerTitle: { color: "#fff", fontSize: 13, fontWeight: "800" },
  chatContent: { padding: 14 },
  placeholderText: { fontSize: 13, lineHeight: 20, fontStyle: "italic" },
  thinkingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  errorText: { fontSize: 13, lineHeight: 20 },
  resultText: { fontSize: 14, lineHeight: 22 },
  block: { marginBottom: 14 },
  blockHeader: { fontSize: 14, fontWeight: "700", marginBottom: 4 },
  exampleItem: { flexDirection: "row", marginTop: 8, gap: 6 },
  exampleIndex: { fontSize: 13, lineHeight: 22 },
  exampleContent: { flex: 1 },
  exampleVi: { fontSize: 13, lineHeight: 20, fontStyle: "italic" },
  exampleViIndent: { marginLeft: 20, marginTop: 2 },
  triggerBtnWrapper: {
    borderRadius: 12,
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  triggerBtn: {
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
  },
  triggerText: { color: "#fff", fontSize: 14, fontWeight: "800" },
});
