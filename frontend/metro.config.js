// metro.config.js
const { getDefaultConfig } = require("expo/metro-config");
const path = require('path');
const { FileStore } = require('metro-cache');

const config = getDefaultConfig(__dirname);

// Use a stable on-disk store (shared across web/android)
const root = process.env.METRO_CACHE_ROOT || path.join(__dirname, '.metro-cache');
config.cacheStores = [
  new FileStore({ root: path.join(root, 'cache') }),
];


// // Exclude unnecessary directories from file watching
// config.watchFolders = [__dirname];
// config.resolver.blacklistRE = /(.*)\/(__tests__|android|ios|build|dist|.git|node_modules\/.*\/android|node_modules\/.*\/ios|node_modules\/.*\/windows|node_modules\/.*\/macos)(\/.*)?$/;

// // Alternative: use a more aggressive exclusion pattern
// config.resolver.blacklistRE = /node_modules\/.*\/(android|ios|windows|macos|__tests__|\.git|.*\.android\.js|.*\.ios\.js)$/;

// Reduce the number of workers to decrease resource usage
config.maxWorkers = 2;

// Aliases for problematic native deps without installing them
const ALIASES = {
  "react-native-linear-gradient": path.join(__dirname, "src/shims/LinearGradientShim.tsx"),
  "@react-native-masked-view/masked-view": path.join(__dirname, "src/shims/MaskedViewShim.tsx"),
};

const originalResolveRequest = config.resolver?.resolveRequest;
config.resolver = config.resolver || {};
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const redirected = ALIASES[moduleName] || moduleName;
  if (originalResolveRequest) {
    return originalResolveRequest(context, redirected, platform);
  }
  return context.resolveRequest(context, redirected, platform);
};

module.exports = config;
