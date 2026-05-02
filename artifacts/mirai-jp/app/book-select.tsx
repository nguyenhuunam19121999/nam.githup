import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const TEAL = "#4ECDC4";

interface Book {
  id: string;
  series: "mimikara" | "soumatome";
  level: "N3" | "N2";
  label: string;
}

const BOOKS: Book[] = [
  { id: "mimikara-n3", series: "mimikara", level: "N3", label: "Mimikara N3" },
  { id: "mimikara-n2", series: "mimikara", level: "N2", label: "Mimikara N2" },
  { id: "soumatome-n3", series: "soumatome", level: "N3", label: "Soumatome N3" },
  { id: "soumatome-n2", series: "soumatome", level: "N2", label: "Soumatome N2" },
];

function MimikaraCover({ level }: { level: "N3" | "N2" }) {
  return (
    <View style={cover.wrap}>
      <Text style={cover.mimiTopJp}>日本語</Text>
      <Text style={cover.mimiTitle}>みみから</Text>
      <View style={cover.mimiBottom}><Text style={cover.mimiBottomText}>MIMIKARA {level}</Text></View>
    </View>
  );
}

function SoumatomeCover({ level }: { level: "N3" | "N2" }) {
  return (
    <View style={cover.wrap}>
      <Text style={cover.souTopJp}>日本語</Text>
      <Text style={cover.souTitle}>総まとめ</Text>
      <View style={cover.souBottom}><Text style={cover.souBottomText}>{level}</Text></View>
    </View>
  );
}

export default function BookSelectScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ level?: string }>();
  const level = params.level === "N2" ? "N2" : "N3";
  const books = BOOKS.filter((b) => b.level === level);

  const handleSelect = (book: Book) => {
    router.push({ pathname: "/learning-menu", params: { level: book.level, bookId: book.id, title: book.label } });
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={TEAL} />
      <SafeAreaView style={s.topBar} edges={["top", "left", "right"]}>
        <View style={s.topBarInner}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7} hitSlop={10}>
            <Text style={s.backIcon}>‹</Text>
          </TouchableOpacity>
          <Text style={s.topTitle} numberOfLines={1}>Chọn sách {level}</Text>
          <View style={s.backBtn} />
        </View>
      </SafeAreaView>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {books.map((book) => (
          <TouchableOpacity key={book.id} style={s.bookCard} onPress={() => handleSelect(book)} activeOpacity={0.7}>
            <View style={s.coverWrap}>
              {book.series === "mimikara" ? <MimikaraCover level={book.level} /> : <SoumatomeCover level={book.level} />}
            </View>
            <Text style={s.bookLabel} numberOfLines={1}>{book.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f1f5f9" },
  topBar: { backgroundColor: TEAL },
  topBarInner: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10 },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  backIcon: { color: "#fff", fontSize: 32, fontWeight: "300", marginTop: -4 },
  topTitle: { flex: 1, color: "#fff", fontSize: 18, fontWeight: "800", textAlign: "center" },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  bookCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#ffffff", borderRadius: 32, paddingVertical: 12, paddingHorizontal: 14, borderWidth: 1.5, borderColor: "#bfdbfe", marginBottom: 14, minHeight: 78 },
  coverWrap: { width: 56, height: 56, alignItems: "center", justifyContent: "center" },
  bookLabel: { flex: 1, fontSize: 18, fontWeight: "700", color: "#0f172a", marginLeft: 14 },
});

const cover = StyleSheet.create({
  wrap: { width: 50, height: 50, backgroundColor: "#fff", borderRadius: 4, borderWidth: 1, borderColor: "#e2e8f0", alignItems: "center", justifyContent: "flex-start", overflow: "hidden", paddingTop: 3 },
  mimiTopJp: { fontSize: 7, color: "#dc2626", fontWeight: "800" },
  mimiTitle: { fontSize: 8, color: "#1f2937", fontWeight: "800", marginTop: 2 },
  mimiBottom: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: "#dc2626", paddingVertical: 2, alignItems: "center" },
  mimiBottomText: { color: "#fff", fontSize: 6, fontWeight: "900" },
  souTopJp: { fontSize: 7, color: "#1f2937", fontWeight: "800" },
  souTitle: { fontSize: 8, color: "#dc2626", fontWeight: "800", marginTop: 2 },
  souBottom: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: "#f59e0b", paddingVertical: 2, alignItems: "center" },
  souBottomText: { color: "#fff", fontSize: 7, fontWeight: "900" },
});
