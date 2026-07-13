module.exports = function withGoogleMobileAds(config, props = {}) {
  const pluginModule = require('react-native-google-mobile-ads/app.plugin.js');
  const plugin = pluginModule.default || pluginModule;
  const adsConfig = config.extra?.['react-native-google-mobile-ads'] || {};

  return plugin(config, {
    androidAppId: props.androidAppId ?? adsConfig.android_app_id ?? adsConfig.androidAppId,
    iosAppId: props.iosAppId ?? adsConfig.ios_app_id ?? adsConfig.iosAppId,
    delayAppMeasurementInit: props.delayAppMeasurementInit ?? false,
    optimizeInitialization: props.optimizeInitialization ?? true,
    optimizeAdLoading: props.optimizeAdLoading ?? true,
    skAdNetworkItems: props.skAdNetworkItems,
    userTrackingUsageDescription: props.userTrackingUsageDescription,
  });
};
