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
        filename: 'diamond-contracts-claiming.bundle.js',
        library: "diamond-contracts-claiming"
      },
      resolve: {
        extensions: ['.ts'],
      },
  };