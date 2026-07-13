import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
// import { requestTrackingPermissionsAsync } from "expo-tracking-transparency";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { AuthProvider } from "../artifacts/mirai-jp/hooks/useAuth";
import { ensureKanjiDbReady } from "../assets/data_JLPT_kanji";
import { ensureVocabDbReady } from "../assets/vocab";
import { ensureGrammarDbReady } from "../assets/data_nn";
import { ensureSentencesDbReady } from "../assets/sentences";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ 
      headerBackTitle: "Back", 
      animation: 'slide_from_right',
    }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      {/* Trang chọn sách (chỉ áp dụng cho N3 và N2) */}
      <Stack.Screen name="book-select" options={{ headerShown: false }} />
      {/* Trang menu trung gian (Hướng Dẫn / Từ Vựng / Ngữ Pháp / Kanji) */}
      <Stack.Screen name="learning-menu" options={{ headerShown: false }} />
      <Stack.Screen name="vocab" options={{ headerShown: false }} />
      {/* Trang danh sách ngữ pháp + chi tiết 1 mẫu ngữ pháp */}
      <Stack.Screen name="grammar" options={{ headerShown: false }} />
      <Stack.Screen name="grammar-detail" options={{ headerShown: false }} />
      {/* Trang kanji */}
      <Stack.Screen name="kanji" options={{ headerShown: false }} />
      <Stack.Screen name="kanji-detail" options={{ headerShown: false }} />
      <Stack.Screen name="soumatome-n2" options={{ headerShown: false }} />
      <Stack.Screen name="level-book" options={{ headerShown: false }} />
      <Stack.Screen name="exam-detail" options={{ headerShown: false }} />
      <Stack.Screen name="exam-result" options={{ headerShown: false }} />
      <Stack.Screen name="vocab-study" options={{ headerShown: false }} />
      <Stack.Screen name="vocab-detail" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [dbReady, setDbReady] = React.useState(false);
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if ((fontsLoaded || fontError) && dbReady) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, dbReady]);

  useEffect(() => {
    (async () => {
      const results = await Promise.all([
        ensureKanjiDbReady(),
        ensureVocabDbReady(),
        ensureGrammarDbReady(),
        ensureSentencesDbReady(),
      ]);
      console.log('[DB READY CHECK]', {
        kanji: results[0],
        vocab: results[1],
        grammar: results[2],
        sentences: results[3],
      });
      setDbReady(true);
    })();
  }, []);

  // Xin quyền App Tracking Transparency (ATT) — bắt buộc trên iOS 14+
  // trước khi bất kỳ SDK quảng cáo nào (AdMob) bắt đầu tracking.
  useEffect(() => {
    (async () => {
      // await requestTrackingPermissionsAsync();
    })();
  }, []);

  if ((!fontsLoaded && !fontError) || !dbReady) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView>
            <KeyboardProvider>
              {/* AuthProvider phải bọc bên trong cùng để mọi màn hình
                  (kể cả vocab) đều có thể đọc/ghi trạng thái đăng nhập */}
              <AuthProvider>
                <RootLayoutNav />
              </AuthProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
