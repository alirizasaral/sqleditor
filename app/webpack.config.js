// webpack.config.js
const path = require('path');

module.exports = {
  //mode: 'development',
  mode: 'production',
  entry: './index.ts',
  devtool: 'inline-source-map',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test:/\.css$/,
        use:['style-loader','css-loader']
      }
    ]
  },
  resolve: {
    alias: {
      'vue$': 'vue/dist/vue.esm.js'
    },
    extensions: [ '.tsx', '.ts', '.js', '.vue', '.json' ]
  },
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'static')
  }
};