import path from 'path';

export default {
  entry: {
    index: './public/src/index.js',
    registration: './public/src/registration.js',
    login: './public/src/login.js',
    resetPassword: './public/src/reset-password.js',
    treasury: './public/src/treasury.js',
    delegates_relation: './public/src/delegates-relation.js',
    delegates: './public/src/delegates.js',
    compe_manager: './public/src/compe-manager.js',
    delegates_sc: './public/src/delegates-sc.js',
    compe_manager_sc: './public/src/compe-manager-sc.js',
    sc_prelim: './public/src/sc_prelim.js',
    login_sc: './public/src/login-sc.js',
    ct_start: './public/src/ct-start.js',
    ct_finish: './public/src/ct-finish.js',
    gi_start: './public/src/gi-start.js',
    gi_finish: './public/src/gi-finish.js',
    event_attendance: './public/src/event-attendance.js',
    merchandise: './public/src/merchandise.js',
    merchmanager: './public/src/merchmanager.js'
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
    contentBase: path.join(__dirname, 'public/dist'),
    compress: true,
    port: 9000,
  },
  mode: 'production',
};
