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
import { ErrorBoundary } from "../components/ErrorBoundary";
import { AuthProvider } from "../artifacts/mirai-jp/hooks/useAuth";
import { AdsProvider } from "../artifacts/mirai-jp/hooks/useAds";
import { useForceUpdate } from "../artifacts/mirai-jp/hooks/useForceUpdate";
import { GiftPromoProvider } from "../artifacts/mirai-jp/hooks/useGiftPromo";
import { ForceUpdateScreen } from "../components/ForceUpdateScreen";
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
      <Stack.Screen name="book-select" options={{ headerShown: false }} />
      <Stack.Screen name="learning-menu" options={{ headerShown: false }} />
      <Stack.Screen name="vocab" options={{ headerShown: false }} />
      <Stack.Screen name="grammar" options={{ headerShown: false }} />
      <Stack.Screen name="grammar-detail" options={{ headerShown: false }} />
      <Stack.Screen name="kanji" options={{ headerShown: false }} />
      <Stack.Screen name="kanji-detail" options={{ headerShown: false }} />
      <Stack.Screen name="soumatome-n2" options={{ headerShown: false }} />
      <Stack.Screen name="level-book" options={{ headerShown: false }} />
      <Stack.Screen name="exam-detail" options={{ headerShown: false }} />
      <Stack.Screen name="exam-result" options={{ headerShown: false }} />
      <Stack.Screen name="vocab-study" options={{ headerShown: false }} />
      <Stack.Screen name="vocab-detail" options={{ headerShown: false }} />
      <Stack.Screen name="exam-detail/index" options={{ headerShown: false }} />
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
  const { needsUpdate, storeUrl } = useForceUpdate();

  useEffect(() => {
    ensureKanjiDbReady(); 
  }, []);

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

  if ((!fontsLoaded && !fontError) || !dbReady) return null;

  if (needsUpdate) {
    return <ForceUpdateScreen storeUrl={storeUrl} />;
  }

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView>
            <KeyboardProvider>
              <AdsProvider>
                <GiftPromoProvider>
                  <AuthProvider>
                    <RootLayoutNav />
                  </AuthProvider>
                </GiftPromoProvider>
              </AdsProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
