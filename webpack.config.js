const path = require('path');

module.exports = {
  mode: 'development',
  entry: './src/browser/instrumentor/setup.ts',
  module: {
    rules: [{
      test: /\.ts$/,
      use: 'ts-loader',
      exclude: /node_modules/
    }]
  },
  devtool: "source-map",
  resolve: {
    extensions: ['.ts', '.js']
  },
  output: {
    path: path.resolve(__dirname, 'dist', 'browser'),
    filename: 'bundle.js'
  },
  optimization: {usedExports: true}
}