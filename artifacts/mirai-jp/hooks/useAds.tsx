import React, { createContext, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";
import { TestIds, MobileAds } from "react-native-google-mobile-ads";
import remoteConfig from "@react-native-firebase/remote-config";
import * as TrackingTransparency from "expo-tracking-transparency";

interface AdsContextValue {
  adsEnabled: boolean;
  adBannerUnitId: string;
}

const AdsContext = createContext<AdsContextValue>({
  adsEnabled: false,
  adBannerUnitId: TestIds.BANNER,
});

export function AdsProvider({ children }: { children: React.ReactNode }) {
  const [adsEnabled, setAdsEnabled] = useState(false);
  const [adBannerUnitId, setAdBannerUnitId] = useState(TestIds.BANNER);

  useEffect(() => {
    (async () => {
      try {
        await remoteConfig().setConfigSettings({ minimumFetchIntervalMillis: 300000 }); // 5 phút — khớp với ExamScreen.tsx đang dùng
        await remoteConfig().setDefaults({
          ads_enabled: false,
          ad_banner_id_ios: TestIds.BANNER,
          ad_banner_id_android: TestIds.BANNER,
        });
        await remoteConfig().fetchAndActivate();

        const isAdsOn = remoteConfig().getValue("ads_enabled").asBoolean();
        setAdsEnabled(isAdsOn);
        if (!isAdsOn) return;

        const configKey = Platform.OS === "ios" ? "ad_banner_id_ios" : "ad_banner_id_android";
        const idTuXa = remoteConfig().getValue(configKey).asString();
        if (idTuXa) setAdBannerUnitId(idTuXa);

        const { status } = await TrackingTransparency.requestTrackingPermissionsAsync();
        console.log("ATT status:", status);

        await MobileAds().initialize();
      } catch (error) {
        console.log("Lỗi khởi tạo quảng cáo: ", error);
      }
    })();
  }, []);

  return (
    <AdsContext.Provider value={{ adsEnabled, adBannerUnitId }}>
      {children}
    </AdsContext.Provider>
  );
}

export function useAds() {
  return useContext(AdsContext);
}