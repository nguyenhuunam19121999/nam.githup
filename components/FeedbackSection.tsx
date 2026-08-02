// ─────────────────────────────────────────────────────────────────────────────
// FeedbackSection
// Khối "đóng góp ý kiến" dùng chung cho các trang vocab / Ngữ pháp.
// - Hiển thị danh sách góp ý đã có (lưu trong AsyncStorage theo pageKey)
// - Cho phép thích / không thích (mỗi tài khoản chỉ vote 1 chiều)
// - Khi chưa đăng nhập: nút "Đăng nhập để góp ý" (mở Alert hướng dẫn).
// - Khi đã đăng nhập: hiện ô nhập nội dung + nút "Gửi".
// ─────────────────────────────────────────────────────────────────────────────

import firestore from "@react-native-firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useAuth } from "../artifacts/mirai-jp/hooks/useAuth";

interface Feedback {
  id: string;
  user: string; 
  text: string;
  likes: string[]; 
  dislikes: string[]; 
  createdAt: number;
}

const PRIMARY = "#004370";

interface Props {
  pageKey: string; 
}

// Chuẩn hoá text để so khớp không phân biệt hoa/thường, dấu tiếng Việt
function normalizeForFilter(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

// Danh sách từ cấm — bạn tự bổ sung thêm khi phát hiện từ mới cần chặn
const BANNED_WORDS = [
  "đm", "vcl", "vl", "clm", "djt", "địt mẹ", "cc", "loz","lồn",
  "ngu", "chó chết", "đồ ngu", "sex",
  // 👈 thêm từ khác vào đây nếu cần, viết thường, không dấu
];

function containsBannedWord(text: string): boolean {
  const normalized = normalizeForFilter(text);
  return BANNED_WORDS.some((word) => normalized.includes(word));
}

export function FeedbackSection({ pageKey }: Props) {
  const { currentUser } = useAuth();

  const [items, setItems] = useState<Feedback[]>([]);
  const [text, setText] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const unsubscribe = firestore()
      .collection("feedback")
      .where("pageKey", "==", pageKey)
      .orderBy("createdAt", "desc")
      .onSnapshot(
        (snapshot) => {
          const list: Feedback[] = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              user: data.user,
              text: data.text,
              likes: data.likes || [],
              dislikes: data.dislikes || [],
              createdAt: data.createdAt?.toMillis?.() ?? Date.now(),
            };
          });
          setItems(list);
        },
        (err) => console.error("Lỗi tải góp ý:", err)
      );
    return unsubscribe;
  }, [pageKey]);

  const handleSubmit = async () => {
    if (submitting) return;
    if (!currentUser) {
      Alert.alert("Cần đăng nhập", "Bạn vui lòng quay về trang chủ và đăng nhập để gửi góp ý.");
      return;
    }
    const content = text.trim();
    if (!content) return;

    if (containsBannedWord(content)) {
      Alert.alert(
        "Không thể gửi",
        "Nội dung góp ý chứa từ ngữ không phù hợp, vui lòng chỉnh sửa lại.",
      );
      return;
    }

    setSubmitting(true);
    try {
      await firestore().collection("feedback").add({
        pageKey,
        user: currentUser,
        text: content,
        likes: [],
        dislikes: [],
        createdAt: firestore.FieldValue.serverTimestamp(),
      });
      setText("");
    } catch (err) {
      Alert.alert("Lỗi", "Không thể gửi góp ý, vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (id: string, type: "like" | "dislike") => {
    if (!currentUser) {
      Alert.alert("Cần đăng nhập", "Bạn vui lòng quay về trang chủ và đăng nhập để bình chọn.");
      return;
    }
    const target = items.find((it) => it.id === id);
    if (!target) return;

    const ref = firestore().collection("feedback").doc(id);
    const liked = target.likes.includes(currentUser);
    const disliked = target.dislikes.includes(currentUser);

    try {
      if (type === "like") {
        await ref.update({
          likes: liked
            ? firestore.FieldValue.arrayRemove(currentUser)
            : firestore.FieldValue.arrayUnion(currentUser),
          dislikes: firestore.FieldValue.arrayRemove(currentUser),
        });
      } else {
        await ref.update({
          dislikes: disliked
            ? firestore.FieldValue.arrayRemove(currentUser)
            : firestore.FieldValue.arrayUnion(currentUser),
          likes: firestore.FieldValue.arrayRemove(currentUser),
        });
      }
    } catch (err) {
      console.error("Lỗi vote:", err);
    }
  };

  const visible = showAll ? items : items.slice(0, 3);

  return (
    <View style={s.box}>
      <View style={s.header}>
        <View style={s.headerLeftRow}>
          <View style={s.headerBar} />
          <Text style={s.headerTitle}>Có {items.length} góp ý</Text>
        </View>
        {items.length > 3 && (
          <TouchableOpacity
            onPress={() => setShowAll((v) => !v)}
            hitSlop={8}
          >
            <Text style={s.headerMore}>
              {showAll ? "Thu gọn" : "Xem thêm"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Danh sách góp ý */}
      {visible.length === 0 ? (
        <Text style={s.empty}>
          Chưa có góp ý nào. Hãy là người đầu tiên!
        </Text>
      ) : (
        visible.map((it, i) => {
          const liked = currentUser ? it.likes.includes(currentUser) : false;
          const disliked = currentUser
            ? it.dislikes.includes(currentUser)
            : false;
          return (
            <View
              key={it.id}
              style={[s.item, i === visible.length - 1 && { borderBottomWidth: 0 }]}
            >
              <Text style={s.itemText}>{it.text}</Text>
              <View style={s.itemFooter}>
                <View style={s.voteRow}>
                  <TouchableOpacity
                    onPress={() => handleVote(it.id, "like")}
                    hitSlop={8}
                    style={s.voteBtn}
                  >
                    <Text style={[s.voteIcon, liked && s.voteIconActive]}>
                      👍
                    </Text>
                    <Text style={s.voteCount}>{it.likes.length}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleVote(it.id, "dislike")}
                    hitSlop={8}
                    style={s.voteBtn}
                  >
                    <Text style={[s.voteIcon, disliked && s.voteIconActive]}>
                      👎
                    </Text>
                    <Text style={s.voteCount}>{it.dislikes.length}</Text>
                  </TouchableOpacity>
                </View>
                <View style={s.userRow}>
                  <View style={s.avatar}>
                    <Text style={s.avatarText}>
                      {it.user.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={s.userName} numberOfLines={1}>
                    {it.user}
                  </Text>
                </View>
              </View>
            </View>
          );
        })
      )}

      {/* Vùng nhập / nút đăng nhập */}
      {currentUser ? (
        <View style={s.inputRow}>
          <TextInput
            style={s.input}
            value={text}
            onChangeText={setText}
            placeholder="Viết góp ý của bạn..."
            placeholderTextColor="#94a3b8"
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[s.sendBtn, !text.trim() && s.sendBtnDisabled]}
            onPress={handleSubmit}
            disabled={!text.trim() || submitting}
            activeOpacity={0.8}
          >
            <Text style={s.sendBtnText}>Gửi</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={s.loginBtn}
          onPress={() =>
            Alert.alert(
              "Đăng nhập để góp ý",
              "Bạn vui lòng quay về trang chủ và bấm nút menu (☰) ở góc trên để đăng nhập.",
            )
          }
          activeOpacity={0.85}
        >
          <Text style={s.loginBtnText}>Đăng nhập để góp ý</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  box: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  headerLeftRow: { flexDirection: "row", alignItems: "center" },
  headerBar: {
    width: 3,
    height: 18,
    backgroundColor: "#0f172a",
    marginRight: 8,
    borderRadius: 2,
  },
  headerTitle: { fontSize: 16, fontWeight: "800", color: "#0f172a" },
  headerMore: {
    fontSize: 14,
    color: "#0f172a",
    textDecorationLine: "underline",
  },

  empty: {
    paddingVertical: 18,
    textAlign: "center",
    color: "#64748b",
    fontSize: 14,
  },

  item: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e2e8f0",
  },
  itemText: { fontSize: 15, color: "#0f172a", lineHeight: 22 },
  itemFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  voteRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  voteBtn: { flexDirection: "row", alignItems: "center" },
  voteIcon: { fontSize: 16, color: "#94a3b8", marginRight: 4 },
  voteIconActive: { color: PRIMARY },
  voteCount: { fontSize: 13, color: "#64748b" },

  userRow: { flexDirection: "row", alignItems: "center", maxWidth: "55%" },
  avatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },
  avatarText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  userName: { fontSize: 13, color: "#475569", fontStyle: "italic" },

  inputRow: { flexDirection: "row", alignItems: "flex-end", marginTop: 10 },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 120,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    fontSize: 14,
    color: "#0f172a",
  },
  sendBtn: {
    marginLeft: 8,
    paddingHorizontal: 16,
    height: 42,
    borderRadius: 10,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: { opacity: 0.45 },
  sendBtnText: { color: "#fff", fontWeight: "700" },

  loginBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 10,
    paddingVertical: 14,
    marginTop: 12,
    alignItems: "center",
  },
  loginBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
