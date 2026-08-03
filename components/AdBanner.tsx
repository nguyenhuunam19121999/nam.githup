import React from "react";
import { View, StyleSheet } from "react-native";
import { BannerAd, BannerAdSize } from "react-native-google-mobile-ads";
import { useAds } from "../artifacts/mirai-jp/hooks/useAds";

export function AdBanner() {
  const { adsEnabled, adBannerUnitId } = useAds();
  if (!adsEnabled) return null;

  return (
    <View style={styles.adContainer}>
      <BannerAd
        unitId={adBannerUnitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  adContainer: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingVertical: 4,
  },
});