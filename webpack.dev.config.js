const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: 'development',
  
  entry: './src/index.tsx',
  
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: 'static/js/[name].js',
    chunkFilename: 'static/js/[name].chunk.js',
    publicPath: '/',
    assetModuleFilename: 'static/media/[name][ext][query]'
  },

  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.jsx', '.json'],
    fallback: {
      // Polyfills for Node.js modules in browser
      buffer: require.resolve('buffer'),
      crypto: require.resolve('crypto-browserify'),
      stream: require.resolve('stream-browserify'),
      assert: require.resolve('assert'),
      http: require.resolve('stream-http'),
      https: require.resolve('https-browserify'),
      os: require.resolve('os-browserify'),
      url: require.resolve('url'),
      process: require.resolve('process/browser'),
    },
  },

  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'ts-loader',
          options: {
            transpileOnly: true, // Skip type checking for faster builds
            configFile: 'tsconfig.json'
          }
        }
      },
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              '@babel/preset-env',
              '@babel/preset-react',
              '@babel/preset-typescript'
            ]
          }
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.(png|jpe?g|gif|svg)$/i,
        type: 'asset/resource',
      },
    ],
  },

  plugins: [
    new HtmlWebpackPlugin({
      template: 'public/index.html',
      inject: true
    }),
    
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
      process: 'process/browser',
    }),
    
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('development'),
      'process.env.REACT_APP_ENVIRONMENT': JSON.stringify(process.env.REACT_APP_ENVIRONMENT || 'production'),
      'process.env.REACT_APP_NETWORK': JSON.stringify(process.env.REACT_APP_NETWORK || 'mainnet'),
      'process.env.REACT_APP_CHAIN_ID': JSON.stringify(process.env.REACT_APP_CHAIN_ID || '56'),
      'process.env.REACT_APP_LOTTERY_CONTRACT_ADDRESS': JSON.stringify(process.env.REACT_APP_LOTTERY_CONTRACT_ADDRESS || '0xFE657EC636c55D2035345056f64B0FAB71E1B995'),
      'process.env.REACT_APP_USDT_CONTRACT_ADDRESS': JSON.stringify(process.env.REACT_APP_USDT_CONTRACT_ADDRESS || '0x55d398326f99059fF775485246999027B3197955'),
      'process.env.REACT_APP_BSC_MAINNET_RPC': JSON.stringify(process.env.REACT_APP_BSC_MAINNET_RPC || 'https://bsc-dataseed.binance.org/'),
      'process.env.REACT_APP_APP_NAME': JSON.stringify(process.env.REACT_APP_APP_NAME || 'BSC Lottery Platform'),
      'process.env.REACT_APP_OWNER_ADDRESS': JSON.stringify(process.env.REACT_APP_OWNER_ADDRESS || '0x207C68E76392e70C8Efa79617D0ccBddd6b25a4C'),
      'process.env.REACT_APP_ENABLE_REFERRALS': JSON.stringify(process.env.REACT_APP_ENABLE_REFERRALS || 'true'),
      'process.env.REACT_APP_ENABLE_BULK_DISCOUNTS': JSON.stringify(process.env.REACT_APP_ENABLE_BULK_DISCOUNTS || 'true'),
    }),
  ],

  devtool: 'eval-source-map',

  devServer: {
    historyApiFallback: {
      disableDotRule: true,
      index: '/index.html'
    },
    static: {
      directory: path.join(__dirname, 'public'),
      publicPath: '/'
    },
    compress: true,
    port: process.env.PORT || 3001,
    hot: true,
    open: false,
    client: {
      overlay: {
        errors: true,
        warnings: false
      }
    }
  },

  stats: {
    errorDetails: true,
    warnings: false,
    children: false,
    modules: false,
    chunks: false,
    chunkModules: false,
    entrypoints: false,
    assets: false,
  },
};