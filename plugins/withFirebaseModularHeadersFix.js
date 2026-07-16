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

      // 1. Báo cho RN Firebase biết đang dùng static frameworks
      if (!contents.includes('$RNFirebaseAsStaticFramework')) {
        contents = `$RNFirebaseAsStaticFramework = true\n${contents}`;
        console.log('[withFirebaseModularHeadersFix] INSERTED $RNFirebaseAsStaticFramework');
      }

      // 2. Cho phép non-modular includes
      const postInstallSnippet = `
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |bc|
        bc.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
      end
    end
`;
      if (!contents.includes('CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES')) {
        contents = contents.replace(
          /post_install do \|installer\|/,
          `post_install do |installer|\n${postInstallSnippet}`
        );
        console.log('[withFirebaseModularHeadersFix] INSERTED CLANG_ALLOW_NON_MODULAR snippet');
      }

      // 3. QUAN TRỌNG: Ép các pod RNFB build như static library thay vì static framework
      const preInstallSnippet = `
pre_install do |installer|
  installer.pod_targets.each do |pod|
    if pod.name.start_with?('RNFB')
      def pod.build_type
        Pod::BuildType.static_library
      end
    end
  end
end

`;
      if (!contents.includes("pod.name.start_with?('RNFB')")) {
        if (contents.includes('post_install do |installer|')) {
          contents = contents.replace(
            /post_install do \|installer\|/,
            `${preInstallSnippet}post_install do |installer|`
          );
        } else {
          contents += `\n${preInstallSnippet}`;
        }
        console.log('[withFirebaseModularHeadersFix] INSERTED pre_install RNFB static_library fix');
      }

      fs.writeFileSync(podfilePath, contents);
      console.log('[withFirebaseModularHeadersFix] Podfile written successfully');
      return config;
    },
  ]);
};