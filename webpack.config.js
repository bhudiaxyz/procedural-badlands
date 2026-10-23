const path = require('path');
const webpack = require('webpack');
const HtmlWebPackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const IS_DEV = process.env.NODE_ENV === 'dev';

const config = {
  mode: IS_DEV ? 'development' : 'production',
  devtool: IS_DEV ? 'eval' : 'source-map',

  entry: {
    main: path.join(__dirname, 'src', 'js', 'main.js'),
  },
  resolve: {
    extensions: ['.js'],
  },
  output: {
    filename: 'js/[name].[contenthash].js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        include: [path.resolve(__dirname, 'src')],
        loader: 'babel-loader',
        options: {
          presets: ['@babel/preset-env'],
          plugins: ['@babel/plugin-transform-class-properties'],
        },
      },
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader'],
      },
      {
        test: /\.scss$/,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader',
          {
            loader: 'sass-loader',
            options: {
              sassOptions: { silenceDeprecations: ['import', 'global-builtin', 'color-functions', 'slash-div', 'if-function'] },
            },
          },
        ],
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/,
        type: 'asset/resource',
        generator: { filename: 'fonts/[name][ext]' },
      },
      { test: /\.js$/, include: /node_modules/, loader: 'ify-loader' },
      {
        test: /\.(glsl|frag|vert)$/,
        include: [path.join(__dirname, 'src', 'glsl')],
        exclude: /node_modules/,
        use: [
          'raw-loader',
          { loader: 'glslify-loader' },
        ],
      },
    ],
  },
  plugins: [
    new CleanWebpackPlugin(),
    new MiniCssExtractPlugin({
      filename: IS_DEV ? 'css/[name].css' : 'css/[name].[contenthash].css',
      chunkFilename: 'css/[id].css',
    }),
    new HtmlWebPackPlugin({
      filename: 'index.html',
      template: path.join(__dirname, 'src', 'templates', 'index.html'),
      minify: !IS_DEV,
    }),
  ],
  devServer: {
    static: path.join(__dirname, 'src'),
    host: '0.0.0.0',
    open: true,
  },
  optimization: {
    moduleIds: 'deterministic',
    runtimeChunk: 'single',
    splitChunks: {
      cacheGroups: {
        vendor: {
          test: /node_modules/,
          chunks: 'initial',
          name: 'vendor',
          priority: 10,
          enforce: true,
        },
      },
    },
    minimizer: ['...'],
  },
};

if (!IS_DEV) {
  const TerserPlugin = require('terser-webpack-plugin');
  const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');

  config.optimization.minimizer = [
    new TerserPlugin(),
    new CssMinimizerPlugin(),
  ];
}

module.exports = config;
