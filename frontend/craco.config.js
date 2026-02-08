const webpack = require('webpack');

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Add polyfills for Node.js modules (webpack 5 no longer includes them by default)
      webpackConfig.resolve.fallback = {
        ...webpackConfig.resolve.fallback,
        "crypto": require.resolve("crypto-browserify"),
        "stream": require.resolve("stream-browserify"),
        "assert": require.resolve("assert"),
        "http": require.resolve("stream-http"),
        "https": require.resolve("https-browserify"),
        "os": require.resolve("os-browserify"),
        "url": require.resolve("url"),
        "zlib": require.resolve("browserify-zlib"),
        "vm": require.resolve("vm-browserify"),
        "buffer": require.resolve("buffer"),
        "process": require.resolve("process/browser.js")
      };

      // Allow extensionless imports for ESM compatibility
      webpackConfig.resolve.extensionAlias = {
        ...webpackConfig.resolve.extensionAlias,
        ".js": [".ts", ".tsx", ".js", ".jsx"]
      };

      // Add plugins to provide global variables
      webpackConfig.plugins.push(
        new webpack.ProvidePlugin({
          process: 'process/browser.js',
          Buffer: ['buffer', 'Buffer']
        })
      );

      return webpackConfig;
    }
  }
};
