import * as ReactNative from 'react-native';

// Polyfill InteractionManager for React Native 0.88+
if (!ReactNative.InteractionManager || typeof ReactNative.InteractionManager.runAfterInteractions !== 'function') {
  const im = {
    runAfterInteractions(task) {
      let handle;
      const promise = new Promise((resolve) => {
        handle = requestAnimationFrame(() => {
          resolve(typeof task === 'function' ? task() : undefined);
        });
      });
      return {
        then: promise.then.bind(promise),
        done: (...args) => promise.then(...args),
        cancel: () => cancelAnimationFrame(handle),
      };
    },
    createInteractionHandle() { return 1; },
    clearInteractionHandle() {},
    setDeadline() {},
    addListener() { return { remove() {} }; },
    Events: { interactionStart: 'interactionStart', interactionComplete: 'interactionComplete' },
  };
  try {
    Object.defineProperty(ReactNative, 'InteractionManager', {
      configurable: true,
      enumerable: true,
      writable: true,
      value: im,
    });
  } catch (_) {
    ReactNative.InteractionManager = im;
  }
}

import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
