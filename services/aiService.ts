// services/aiService.ts
// Gọi Cloud Function "explainWithAI" từ app React Native/Expo.
// Yêu cầu: đã cài "firebase" và app đã init Firebase (giống cách useAuth đang dùng).

import { getApp } from "firebase/app";
import { getFunctions, httpsCallable } from "firebase/functions";

// Đổi "asia-southeast1" nếu bạn deploy function ở region khác trong file functions/explainWithAI.js
const functions = getFunctions(getApp(), "asia-southeast1");

type ExplainType = "vocab" | "grammar" | "dialogue";

interface VocabInput {
  word: string;
  reading?: string;
  meaning?: string;
  example?: string;
  level?: string;
}

interface GrammarInput {
  pattern: string;
  explanation?: string;
  example?: string;
  level?: string;
}

interface DialogueInput {
  topic?: string;
  level?: string;
}

export async function explainVocab(data: VocabInput): Promise<string> {
  return callExplain("vocab", data);
}

export async function explainGrammar(data: GrammarInput): Promise<string> {
  return callExplain("grammar", data);
}

export async function generateDialogue(data: DialogueInput): Promise<string> {
  return callExplain("dialogue", data);
}

async function callExplain(type: ExplainType, data: Record<string, any>): Promise<string> {
  const callable = httpsCallable(functions, "explainWithAI");
  const result = await callable({ type, data });
  return (result.data as { text: string }).text;
}

/* ── VÍ DỤ DÙNG TRONG COMPONENT ──────────────────────────────────────────
import { explainVocab } from "../services/aiService";

const [loading, setLoading] = useState(false);
const [answer, setAnswer] = useState("");

async function handleExplain() {
  setLoading(true);
  try {
    const text = await explainVocab({
      word: "食べる",
      reading: "たべる",
      meaning: "ăn",
      example: "朝ごはんを食べます。",
      level: "N5",
    });
    setAnswer(text);
  } catch (e) {
    setAnswer("Không lấy được giải thích lúc này, thử lại sau nhé.");
  } finally {
    setLoading(false);
  }
}
──────────────────────────────────────────────────────────────────────── */