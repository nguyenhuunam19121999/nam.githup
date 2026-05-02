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
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
// AuthProvider: bọc toàn bộ ứng dụng để mọi màn hình đều dùng được useAuth()
import { AuthProvider } from "@/hooks/useAuth";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      {/* Trang chọn sách (chỉ áp dụng cho N3 và N2) */}
      <Stack.Screen name="book-select" options={{ headerShown: false }} />
      {/* Trang menu trung gian (Hướng Dẫn / Từ Vựng / Ngữ Pháp / Kanji) */}
      <Stack.Screen name="learning-menu" options={{ headerShown: false }} />
      <Stack.Screen name="flashcard" options={{ headerShown: false }} />
      {/* Trang danh sách ngữ pháp + chi tiết 1 mẫu ngữ pháp */}
      <Stack.Screen name="grammar" options={{ headerShown: false }} />
      <Stack.Screen name="grammar-detail" options={{ headerShown: false }} />
      {/* Trang kanji */}
      <Stack.Screen name="kanji" options={{ headerShown: false }} />
      <Stack.Screen name="kanji-detail" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView>
            <KeyboardProvider>
              {/* AuthProvider phải bọc bên trong cùng để mọi màn hình
                  (kể cả flashcard) đều có thể đọc/ghi trạng thái đăng nhập */}
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
