import type { RawVocab } from "../../vocab";
import vocabData from "./thuc_pham.json";

export const THUC_PHAM_VOCAB: RawVocab[] = vocabData as RawVocab[];

export const THUC_PHAM_DOCS = {
  otafftv: {
    name: "Tài liệu từ OTAFFtv",
    description: "Kỹ năng Đặc định Số 1 — Thực phẩm và Đồ uống",
    route: "/otafftv-doc",
    dataFile: "./otafftv.json",
  },
} as const;
