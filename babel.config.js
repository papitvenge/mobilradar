module.exports = function(api) {
  api.cache(true);
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          // Disable lazy import transform to avoid "lazyImportsHook is not a function"
          // when transforming polyfill:environment-variables in Metro (Babel/plugin resolution issue).
          lazyImports: false,
        },
      ],
    ],
  };
};
