const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withFirebaseModularHeadersFix(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfilePath, 'utf-8');

      console.log('[withFirebaseModularHeadersFix] Podfile path:', podfilePath);
      console.log('[withFirebaseModularHeadersFix] already has $RNFirebaseAsStaticFramework?', contents.includes('$RNFirebaseAsStaticFramework'));

      if (!contents.includes('$RNFirebaseAsStaticFramework')) {
        contents = `$RNFirebaseAsStaticFramework = true\n${contents}`;
        console.log('[withFirebaseModularHeadersFix] INSERTED $RNFirebaseAsStaticFramework');
      }

      const snippet = `
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |bc|
        bc.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
      end
    end
`;

      console.log('[withFirebaseModularHeadersFix] already has CLANG_ALLOW_NON_MODULAR?', contents.includes('CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'));

      if (!contents.includes('CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES')) {
        contents = contents.replace(
          /post_install do \|installer\|/,
          `post_install do |installer|\n${snippet}`
        );
        console.log('[withFirebaseModularHeadersFix] INSERTED CLANG_ALLOW_NON_MODULAR snippet');
      }

      fs.writeFileSync(podfilePath, contents);
      console.log('[withFirebaseModularHeadersFix] Podfile written successfully');
      return config;
    },
  ]);
};