import path from 'path';

export default {
  entry: {
    index: './src/index.js',
    registration: './src/registration.js',
    login: './src/login.js',
    resetPassword: './src/reset-password.js',
    treasury: './src/treasury.js',
    delegates_relation: './src/delegates-relation.js',
    delegates: './src/delegates.js',
    compe_manager: './src/compe-manager.js',
    delegates_sc: './src/delegates-sc.js',
    compe_manager_sc: './src/compe-manager-sc.js',
    sc_prelim: './src/sc_prelim.js',
    login_sc: './src/login-sc.js',
    ct_start: './src/ct-start.js',
    ct_finish: './src/ct-finish.js',
    gi_start: './src/gi-start.js',
    gi_finish: './src/gi-finish.js',
    event_attendance: './src/event-attendance.js',
    merchandise: './src/merchandise.js',
    merchmanager: './src/merchmanager.js',
    sponsor: './src/sponsor.js'
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'public/dist'),
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
