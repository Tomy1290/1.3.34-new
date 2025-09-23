module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // expo-router/babel is deprecated on SDK 50+; remove to avoid Metro bundling failures
      'react-native-reanimated/plugin', // must be last
    ],
  };
};