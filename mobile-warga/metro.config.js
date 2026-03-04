// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const exclusionList = require('metro-config/src/defaults/exclusionList');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Exclude unnecessary directories from being watched to prevent EMFILE errors
config.resolver.blockList = exclusionList([
  /.*\/android\/.*/,
  /.*\/ios\/.*/,
  /.*\/.git\/.*/,
  /.*\/eas-archive-preview\/.*/,
  /.*\/eas-archive-preview-2\/.*/,
  /.*\/.idea\/.*/,
  /.*\/.vscode\/.*/,
]);

module.exports = config;
