// components/SmartSearch.tsx
import React, { useState, useRef, forwardRef, useImperativeHandle } from "react";
import {
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import SearchInline from "./SearchInline";

const TEAL = "#1F6F7A";

interface SmartSearchProps {
  onVocabPress?: (vocab: string) => void;
  placeholder?: string;
  onFocus?: () => void;
  onBlur?: () => void;
  isFocused?: boolean;
  onDrawerStateChange?: (open: boolean) => void;
  onDrawerClosed?: () => void;
  onQueryChange?: (text: string) => void;
  onModalClose?: () => void;
}

export interface SmartSearchRef {
  focusInput: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
}

const SmartSearch = forwardRef<SmartSearchRef, SmartSearchProps>(({
  placeholder = "🔍 Tìm kiếm...",
  onFocus,
  onBlur,
  onModalClose,
}, ref) => {
  const [searchVisible, setSearchVisible] = useState(false);
  const [autoOpenDrawer, setAutoOpenDrawer] = useState(false);

  const openSearch = () => {
    setAutoOpenDrawer(false);
    setSearchVisible(true);
    if (onBlur) onBlur();
  };

  const openSearchWithDrawer = () => {
    setAutoOpenDrawer(true);
    setSearchVisible(true);
    if (onBlur) onBlur();
  };

  const closeSearch = () => {
    setSearchVisible(false);
    setAutoOpenDrawer(false);
    if (onModalClose) onModalClose();
  };

  useImperativeHandle(ref, () => ({
    focusInput: () => openSearch(),
    openDrawer: () => openSearchWithDrawer(),
    closeDrawer: () => closeSearch(),
  }));

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.container}>
        {/* Thanh tìm kiếm — tap để mở SearchInline */}
        <View style={styles.searchWrap}>
          <Text style={styles.searchIcon}>🌐</Text>
          <TouchableOpacity style={{ flex: 1 }} onPress={openSearch} activeOpacity={0.85}>
            <Text style={styles.searchPlaceholder}>{placeholder}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={openSearchWithDrawer}
            style={styles.drawIconBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.drawIcon}>✍️</Text>
          </TouchableOpacity>
        </View>

        {/* SearchInline toàn màn hình khi active */}
        {searchVisible && (
          <View style={StyleSheet.absoluteFill}>
            <SearchInline
              onBack={closeSearch}
              autoOpenDrawer={autoOpenDrawer}
              onDrawerOpened={() => setAutoOpenDrawer(false)}
              initialTab={autoOpenDrawer ? 'kanji' : 'vocab'}
            />
          </View>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
});
SmartSearch.displayName = 'SmartSearch';

const styles = StyleSheet.create({
  container: { width: "100%" },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginHorizontal: 16,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchPlaceholder: { flex: 1, fontSize: 15, color: "#94a3b8" },
  drawIconBtn: {
    width: 40, height: 40,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 20,
  },
  drawIcon: { fontSize: 20, color: TEAL },
});

export default SmartSearch;
