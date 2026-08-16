// components/SearchHistory.tsx
import React, { useEffect, useState, useImperativeHandle, forwardRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../artifacts/mirai-jp/hooks/useAuth";
import { useColors } from "../artifacts/mirai-jp/hooks/useColors";

interface SearchHistoryProps {
  onSelectHistory: (item: string) => void;
   type: "kanji" | "vocab" | "grammar" | "sentence";
}

export interface SearchHistoryRef {
  saveSearch: (text: string) => Promise<void>;
}

interface HistoryItem {
  id: string;
  text: string;
  timestamp: number;
  type: string;
}

export const SearchHistory = forwardRef<SearchHistoryRef, SearchHistoryProps>(
  ({ onSelectHistory, type }, ref) => {
    const c = useColors(); // bảng màu hiện tại — tự đổi theo giờ / lựa chọn người dùng
    const { currentUser, scopedKey } = useAuth();
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [isVisible, setIsVisible] = useState(true);

    const getStorageKey = () => {
      return scopedKey(`search_history_${type}`);
    };

    const loadHistory = async () => {
      if (!currentUser) return;

      try {
        const key = getStorageKey();
        const raw = await AsyncStorage.getItem(key);
        if (raw) {
          const items = JSON.parse(raw) as HistoryItem[];
          setHistory(items.sort((a, b) => b.timestamp - a.timestamp).slice(0, 10));
        }
      } catch (error) {
      }
    };

    useEffect(() => {
      if (currentUser) {
        loadHistory();
      }
    }, [currentUser]);

    const saveSearch = async (text: string) => {
      if (!currentUser || !text.trim()) return;

      try {
        const key = getStorageKey();
        const raw = await AsyncStorage.getItem(key);
        let items: HistoryItem[] = raw ? JSON.parse(raw) : [];

        items = items.filter(item => item.text !== text);

        const newItem: HistoryItem = {
          id: Date.now().toString(),
          text: text.trim(),
          timestamp: Date.now(),
          type: type,
        };
        items.unshift(newItem);

        if (items.length > 20) items = items.slice(0, 20);

        await AsyncStorage.setItem(key, JSON.stringify(items));
        setHistory(items.slice(0, 10));
      } catch (error) {}
    };

    useImperativeHandle(ref, () => ({
      saveSearch,
    }));

    const deleteHistoryItem = async (itemId: string) => {
      if (!currentUser) return;

      try {
        const key = getStorageKey();
        const raw = await AsyncStorage.getItem(key);
        if (raw) {
          let items: HistoryItem[] = JSON.parse(raw);
          items = items.filter(item => item.id !== itemId);
          await AsyncStorage.setItem(key, JSON.stringify(items));
          setHistory(items.slice(0, 10));
        }
      } catch (error) {
      }
    };

    const clearAllHistory = async () => {
      if (!currentUser) return;

      Alert.alert(
        "Xóa lịch sử",
        "Bạn có chắc muốn xóa toàn bộ lịch sử tìm kiếm?",
        [
          { text: "Hủy", style: "cancel" },
          {
            text: "Xóa",
            style: "destructive",
            onPress: async () => {
              try {
                const key = getStorageKey();
                await AsyncStorage.removeItem(key);
                setHistory([]);
              } catch (error) {
              }
            },
          },
        ]
      );
    };

    const toggleVisible = () => {
      if (currentUser) {
        setIsVisible(!isVisible);
        if (!isVisible) loadHistory();
      }
    };

    if (!currentUser) return null;

    return (
      <View style={styles.container}>
        <TouchableOpacity onPress={toggleVisible} style={styles.historyToggle}>
          <Text style={[styles.historyToggleText, { color: c.text }]}>
            {isVisible ? "▼" : "▶"} Lịch sử tìm kiếm
          </Text>
          {history.length > 0 && (
            <TouchableOpacity onPress={clearAllHistory} style={styles.clearAllBtn}>
              <Text style={[styles.clearAllText, { color: c.destructive }]}>Xóa tất cả</Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        {isVisible && history.length > 0 && (
          <ScrollView
            style={[styles.historyList, { backgroundColor: c.card, borderColor: c.border }]}
            showsVerticalScrollIndicator={false}
          >
            {history.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.historyItem, { borderBottomColor: c.border }]}
                onPress={() => onSelectHistory(item.text)}
                activeOpacity={0.7}
              >
                <Text style={styles.historyIcon}>
                  {type === "kanji" ? "🈳" : type === "vocab" ? "📖" : type === "grammar" ? "📝" : "💬"}
                </Text>
                <Text style={[styles.historyText, { color: c.text }]}>{item.text}</Text>
                <TouchableOpacity
                  onPress={() => deleteHistoryItem(item.id)}
                  style={styles.deleteBtn}
                >
                  <Text style={[styles.deleteText, { color: c.mutedForeground }]}>✕</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {isVisible && history.length === 0 && (
          <View style={[styles.emptyHistory, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[styles.emptyText, { color: c.mutedForeground }]}>Chưa có lịch sử tìm kiếm</Text>
          </View>
        )}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    marginBottom: 4,
  },
  historyToggle: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  historyToggleText: {
    fontSize: 12,
    fontWeight: "600",
  },
  clearAllBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearAllText: {
    fontSize: 14,
  },
  historyList: {
    maxHeight: 200,
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
  },
  historyIcon: {
    fontSize: 22,
    marginRight: 10,
  },
  historyText: {
    flex: 1,
    fontSize: 14,
  },
  deleteBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteText: {
    fontSize: 14,
    fontWeight: "600",
  },
  emptyHistory: {
    paddingVertical: 16,
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
  },
  emptyText: {
    fontSize: 12,
  },
});
SearchHistory.displayName = 'SearchHistory';