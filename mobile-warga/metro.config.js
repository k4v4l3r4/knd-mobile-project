// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Exclude unnecessary directories from being watched to prevent EMFILE errors
// We use an array approach to extend the default blockList without needing the internal exclusionList helper
// which is not exported in newer metro-config versions.
const defaultBlockList = config.resolver.blockList || [];

config.resolver.blockList = [
  // Include existing blockList (can be Array or RegExp)
  ...(Array.isArray(defaultBlockList) ? defaultBlockList : [defaultBlockList]),
  
  // Add custom exclusions
  /.*\/android\/.*/,
  /.*\/ios\/.*/,
  /.*\/.git\/.*/,
  /.*\/eas-archive-preview\/.*/,
  /.*\/eas-archive-preview-2\/.*/,
  /.*\/.idea\/.*/,
  /.*\/.vscode\/.*/,
];

module.exports = config;
