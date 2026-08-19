import { useEffect, useState } from "react";
import Constants from "expo-constants";
import remoteConfig from "@react-native-firebase/remote-config";

const APP_STORE_ID = "6789786821";
const APP_STORE_URL = `https://apps.apple.com/app/id${APP_STORE_ID}`;

function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] ?? 0;
    const nb = pb[i] ?? 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

export function useForceUpdate() {
  const [needsUpdate, setNeedsUpdate] = useState(false);
  const [storeUrl, setStoreUrl] = useState(APP_STORE_URL);

  useEffect(() => {
    (async () => {
      try {
        await remoteConfig().setConfigSettings({ minimumFetchIntervalMillis: 0 });
        await remoteConfig().setDefaults({ min_supported_version: "0.0.0" });
        await remoteConfig().fetchAndActivate();

        const minVersion = remoteConfig().getValue("min_supported_version").asString();
        const currentVersion = Constants.expoConfig?.version ?? "0.0.0";

        if (compareVersions(currentVersion, minVersion) < 0) {
          setNeedsUpdate(true);
        }
        setStoreUrl(APP_STORE_URL);
      } catch (error) {
        console.log("Lỗi kiểm tra phiên bản:", error);
      }
    })();
  }, []);

  return { needsUpdate, storeUrl };
}