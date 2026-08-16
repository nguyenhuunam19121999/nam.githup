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
import React, { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { AuthProvider } from "../artifacts/mirai-jp/hooks/useAuth";
import { AdsProvider } from "../artifacts/mirai-jp/hooks/useAds";
import { useForceUpdate } from "../artifacts/mirai-jp/hooks/useForceUpdate";
import { GiftPromoProvider } from "../artifacts/mirai-jp/hooks/useGiftPromo";
import { ColorsProvider } from "../artifacts/mirai-jp/hooks/useColors";
import { ForceUpdateScreen } from "../components/ForceUpdateScreen";
import { ensureKanjiDbReady } from "../assets/data_JLPT_kanji";
import { ensureVocabDbReady } from "../assets/vocab";
import { ensureGrammarDbReady } from "../assets/data_nn";
import { ensureSentencesDbReady } from "../assets/sentences";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

// ─── Cấu hình màn hình chào ─────────────────────────────────────────────────
const GREETINGS = ["Welcome", "ようこそ", "Xin chào"];
const GREETING_HOLD_MS = 1100; // thời gian mỗi câu hiển thị đứng yên
const FADE_MS = 280; // thời gian fade in / fade out
const GREETING_BG = "#004370"; // nên trùng backgroundColor trong app.json

function GreetingSplash({ text, opacity }: { text: string; opacity: Animated.Value }) {
  return (
    <View style={styles.greetingRoot}>
      <Animated.Text style={[styles.greetingText, { opacity }]}>
        {text}
      </Animated.Text>
    </View>
  );
}

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

  // ── State cho màn hình chào ────────────────────────────────────────────
  const [greetingDone, setGreetingDone] = useState(false);
  const [greetingIdx, setGreetingIdx] = useState(0);
  const greetingOpacity = useRef(new Animated.Value(0)).current;

  // appReady = điều kiện load thật (fonts + db) giống logic cũ
  const appReady = (fontsLoaded || !!fontError) && dbReady;
  const appReadyRef = useRef(appReady);
  useEffect(() => {
    appReadyRef.current = appReady;
  }, [appReady]);

  useEffect(() => {
    ensureKanjiDbReady(); 
  }, []);

  // Ẩn splash native NGAY khi component mount (không đợi load xong nữa)
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

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

  // ── Vòng lặp hiển thị lần lượt 3 lời chào ──────────────────────────────
  useEffect(() => {
    let cancelled = false;
    let idx = 0;

    const fadeTo = (toValue: number) =>
      new Promise<void>((resolve) => {
        Animated.timing(greetingOpacity, {
          toValue,
          duration: FADE_MS,
          useNativeDriver: true,
        }).start(() => resolve());
      });

    const wait = (ms: number) =>
      new Promise<void>((resolve) => setTimeout(resolve, ms));

    async function loop() {
      while (!cancelled) {
        setGreetingIdx(idx);
        await fadeTo(1);
        await wait(GREETING_HOLD_MS);
        await fadeTo(0);

        idx = (idx + 1) % GREETINGS.length;

        // Vừa chạy xong đủ 1 vòng (3 câu)
        if (idx === 0) {
          if (appReadyRef.current) {
            // App đã load xong đúng lúc hết vòng -> dừng loop, cho vào app
            if (!cancelled) setGreetingDone(true);
            break;
          }
          // App chưa xong -> lặp lại vòng tiếp theo tự động (while loop tiếp tục)
        }
      }
    }

    loop();
    return () => {
      cancelled = true;
    };
    // Chỉ chạy 1 lần khi mount — appReadyRef đảm bảo luôn đọc giá trị mới nhất
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Chưa xong lời chào -> luôn hiển thị màn chào, kể cả khi app đã load xong
  if (!greetingDone) {
    return <GreetingSplash text={GREETINGS[greetingIdx]} opacity={greetingOpacity} />;
  }

  if (needsUpdate) {
    return <ForceUpdateScreen storeUrl={storeUrl} />;
  }

  return (
    <ColorsProvider>
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
    </ColorsProvider>
  );
}

const styles = StyleSheet.create({
  greetingRoot: {
    flex: 1,
    backgroundColor: GREETING_BG,
    alignItems: "center",
    justifyContent: "center",
  },
  greetingText: {
    color: "#ffffff",
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
});








// import {
//   Inter_400Regular,
//   Inter_500Medium,
//   Inter_600SemiBold,
//   Inter_700Bold,
//   useFonts,
// } from "@expo-google-fonts/inter";
// import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// import { Stack } from "expo-router";
// import * as SplashScreen from "expo-splash-screen";
// import React, { useEffect } from "react";
// import { GestureHandlerRootView } from "react-native-gesture-handler";
// import { KeyboardProvider } from "react-native-keyboard-controller";
// import { SafeAreaProvider } from "react-native-safe-area-context";
// import { ErrorBoundary } from "../components/ErrorBoundary";
// import { AuthProvider } from "../artifacts/mirai-jp/hooks/useAuth";
// import { AdsProvider } from "../artifacts/mirai-jp/hooks/useAds";
// import { useForceUpdate } from "../artifacts/mirai-jp/hooks/useForceUpdate";
// import { GiftPromoProvider } from "../artifacts/mirai-jp/hooks/useGiftPromo";
// import { ForceUpdateScreen } from "../components/ForceUpdateScreen";
// import { ensureKanjiDbReady } from "../assets/data_JLPT_kanji";
// import { ensureVocabDbReady } from "../assets/vocab";
// import { ensureGrammarDbReady } from "../assets/data_nn";
// import { ensureSentencesDbReady } from "../assets/sentences";

// SplashScreen.preventAutoHideAsync();

// const queryClient = new QueryClient();

// function RootLayoutNav() {
//   return (
//     <Stack screenOptions={{ 
//       headerBackTitle: "Back", 
//       animation: 'slide_from_right',
//     }}>
//       <Stack.Screen name="index" options={{ headerShown: false }} />
//       <Stack.Screen name="book-select" options={{ headerShown: false }} />
//       <Stack.Screen name="learning-menu" options={{ headerShown: false }} />
//       <Stack.Screen name="vocab" options={{ headerShown: false }} />
//       <Stack.Screen name="grammar" options={{ headerShown: false }} />
//       <Stack.Screen name="grammar-detail" options={{ headerShown: false }} />
//       <Stack.Screen name="kanji" options={{ headerShown: false }} />
//       <Stack.Screen name="kanji-detail" options={{ headerShown: false }} />
//       <Stack.Screen name="soumatome-n2" options={{ headerShown: false }} />
//       <Stack.Screen name="level-book" options={{ headerShown: false }} />
//       <Stack.Screen name="exam-detail" options={{ headerShown: false }} />
//       <Stack.Screen name="exam-result" options={{ headerShown: false }} />
//       <Stack.Screen name="vocab-study" options={{ headerShown: false }} />
//       <Stack.Screen name="vocab-detail" options={{ headerShown: false }} />
//       <Stack.Screen name="exam-detail/index" options={{ headerShown: false }} />
//     </Stack>
//   );
// }

// export default function RootLayout() {
//   const [dbReady, setDbReady] = React.useState(false);
//   const [fontsLoaded, fontError] = useFonts({
//     Inter_400Regular,
//     Inter_500Medium,
//     Inter_600SemiBold,
//     Inter_700Bold,
//   });
//   const { needsUpdate, storeUrl } = useForceUpdate();

//   useEffect(() => {
//     ensureKanjiDbReady(); 
//   }, []);

//   useEffect(() => {
//     if ((fontsLoaded || fontError) && dbReady) {
//       SplashScreen.hideAsync();
//     }
//   }, [fontsLoaded, fontError, dbReady]);

//   useEffect(() => {
//     (async () => {
//       const results = await Promise.all([
//         ensureKanjiDbReady(),
//         ensureVocabDbReady(),
//         ensureGrammarDbReady(),
//         ensureSentencesDbReady(),
//       ]);
//       console.log('[DB READY CHECK]', {
//         kanji: results[0],
//         vocab: results[1],
//         grammar: results[2],
//         sentences: results[3],
//       });
//       setDbReady(true);
//     })();
//   }, []);

//   if ((!fontsLoaded && !fontError) || !dbReady) return null;

//   if (needsUpdate) {
//     return <ForceUpdateScreen storeUrl={storeUrl} />;
//   }

//   return (
//     <SafeAreaProvider>
//       <ErrorBoundary>
//         <QueryClientProvider client={queryClient}>
//           <GestureHandlerRootView>
//             <KeyboardProvider>
//               <AdsProvider>
//                 <GiftPromoProvider>
//                   <AuthProvider>
//                     <RootLayoutNav />
//                   </AuthProvider>
//                 </GiftPromoProvider>
//               </AdsProvider>
//             </KeyboardProvider>
//           </GestureHandlerRootView>
//         </QueryClientProvider>
//       </ErrorBoundary>
//     </SafeAreaProvider>
//   );
// }
