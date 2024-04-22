const path = require('path');

module.exports = {
    entry: './api/src/index.ts',
    module: {
        rules: [
          {
            test: /\.ts?$/,
            use: 'ts-loader',
            exclude: /node_modules/,
          },
        ],
      },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'my-first-webpack.bundle.js',
      },
      resolve: {
        extensions: ['.ts'],
      },
  };