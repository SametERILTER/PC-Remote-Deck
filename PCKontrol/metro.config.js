// Polyfill for Node.js < 20.12 (Metro in Expo SDK 57 uses util.styleText)
const util = require('util');
if (!util.styleText) {
  util.styleText = (format, text) => {
    return text;
  };
}

const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

module.exports = config;
