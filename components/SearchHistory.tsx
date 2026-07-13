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

// ✅ MÀU CHỦ ĐẠO MỚI
const TEAL = "#1F6F7A";
const TEAL_DARK = "#0B3540";
const GRAD = [TEAL, TEAL_DARK] as const;

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

    // Expose saveSearch function to parent
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
          <Text style={styles.historyToggleText}>
            {isVisible ? "▼" : "▶"} Lịch sử tìm kiếm
          </Text>
          {history.length > 0 && (
            <TouchableOpacity onPress={clearAllHistory} style={styles.clearAllBtn}>
              <Text style={styles.clearAllText}>Xóa tất cả</Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        {isVisible && history.length > 0 && (
          <ScrollView style={styles.historyList} showsVerticalScrollIndicator={false}>
            {history.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.historyItem}
                onPress={() => onSelectHistory(item.text)}
                activeOpacity={0.7}
              >
                <Text style={styles.historyIcon}>
                  {type === "kanji" ? "🈳" : type === "vocab" ? "📖" : type === "grammar" ? "📝" : "💬"}
                </Text>
                <Text style={styles.historyText}>{item.text}</Text>
                <TouchableOpacity
                  onPress={() => deleteHistoryItem(item.id)}
                  style={styles.deleteBtn}
                >
                  <Text style={styles.deleteText}>✕</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {isVisible && history.length === 0 && (
          <View style={styles.emptyHistory}>
            <Text style={styles.emptyText}>Chưa có lịch sử tìm kiếm</Text>
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
    color: TEAL_DARK,
    fontWeight: "600",
  },
  clearAllBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearAllText: {
    fontSize: 14,
    color: "#ef4444",
  },
  historyList: {
    maxHeight: 200,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  historyIcon: {
    fontSize: 22,
    marginRight: 10,
  },
  historyText: {
    flex: 1,
    fontSize: 14,
    color: TEAL_DARK,
  },
  deleteBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteText: {
    fontSize: 14,
    color: "#94a3b8",
    fontWeight: "600",
  },
  emptyHistory: {
    paddingVertical: 16,
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  emptyText: {
    fontSize: 12,
    color: "#94a3b8",
  },
});
SearchHistory.displayName = 'SearchHistory';
