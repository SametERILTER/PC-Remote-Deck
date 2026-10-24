// Polyfill for Node.js < 20.12 (Metro in Expo uses util.styleText)
const util = require('util');
if (!util.styleText) {
  util.styleText = (format, text) => {
    return text;
  };
}

// Polyfill for Node.js < 22 (Expo SDK 58 uses URL.parse)
if (!URL.parse) {
  URL.parse = function(url, base) {
    try {
      return new URL(url, base);
    } catch {
      return null;
    }
  };
}

const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

module.exports = config;
