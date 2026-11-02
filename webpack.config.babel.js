import path from 'path';

export default {
  entry: {
    bootstrap: './src/bootstrap.js',
    sponsor: './src/sponsor.js'
  },
  output: {
    filename: '[name].bundle.js',
    chunkFilename: '[name].bundle.js',
    path: path.resolve(__dirname, 'public/dist'),
  },
  optimization: {
    splitChunks: {
      chunks: 'all',
      maxSize: 200_000,
    },
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
          },
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  devServer: {
    static: { directory: path.join(__dirname, 'public') },
    compress: true,
    port: 9000,
  },
  mode: 'production',
};
