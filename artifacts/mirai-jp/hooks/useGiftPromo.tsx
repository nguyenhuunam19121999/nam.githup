import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import remoteConfig from "@react-native-firebase/remote-config";

interface GiftPromoConfig {
  enabled: boolean;
  title: string;
  message: string;
  delaySeconds: number;
}

interface GiftPromoContextValue {
  config: GiftPromoConfig;
  showPopup: boolean;
  closePopup: () => void;
}

const defaultConfig: GiftPromoConfig = {
  enabled: false,
  title: "🎁 Ưu đãi đặc biệt!",
  message: "Giới thiệu bạn bè ngay hôm nay để nhận điểm thưởng hấp dẫn!",
  delaySeconds: 15,
};

const GiftPromoContext = createContext<GiftPromoContextValue>({
  config: defaultConfig,
  showPopup: false,
  closePopup: () => {},
});

export function GiftPromoProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<GiftPromoConfig>(defaultConfig);
  const [showPopup, setShowPopup] = useState(false);
  const hasShownThisAppSessionRef = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        await remoteConfig().setDefaults({
          gift_popup_enabled: false,
          gift_popup_title: defaultConfig.title,
          gift_popup_message: defaultConfig.message,
          gift_popup_delay_seconds: 15,
        });
        await remoteConfig().fetchAndActivate();
        setConfig({
          enabled: remoteConfig().getValue("gift_popup_enabled").asBoolean(),
          title: remoteConfig().getValue("gift_popup_title").asString(),
          message: remoteConfig().getValue("gift_popup_message").asString(),
          delaySeconds: remoteConfig().getValue("gift_popup_delay_seconds").asNumber(),
        });
      } catch (err) {
        console.log("Lỗi tải cấu hình khuyến mãi:", err);
      }
    })();
  }, []);

  useEffect(() => {
    if (!config.enabled || hasShownThisAppSessionRef.current) return;

    const timer = setTimeout(() => {
      setShowPopup(true);
      hasShownThisAppSessionRef.current = true;
    }, config.delaySeconds * 1000);

    return () => clearTimeout(timer);
  }, [config.enabled, config.delaySeconds]);

  const closePopup = () => setShowPopup(false);

  return (
    <GiftPromoContext.Provider value={{ config, showPopup, closePopup }}>
      {children}
    </GiftPromoContext.Provider>
  );
}

export function useGiftPromo() {
  return useContext(GiftPromoContext);
}