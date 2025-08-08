const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'production',
  
  entry: './src/index.tsx',
  
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: 'static/js/[name].[contenthash:8].js',
    chunkFilename: 'static/js/[name].[contenthash:8].chunk.js',
    publicPath: '/',
    clean: true,
    assetModuleFilename: 'static/media/[name].[hash][ext][query]'
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
      inject: true,
      minify: {
        removeComments: true,
        collapseWhitespace: true,
        removeRedundantAttributes: true,
        useShortDoctype: true,
        removeEmptyAttributes: true,
        removeStyleLinkTypeAttributes: true,
        keepClosingSlash: true,
        minifyJS: false, // Deshabilitado para evitar problemas con eval()
        minifyCSS: true,
        minifyURLs: true,
      },
    }),
    
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
      process: 'process/browser',
    }),
    
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('production'),
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
    
    new CopyWebpackPlugin({
      patterns: [
        { from: 'public/favicon.ico', to: 'favicon.ico' },

        { from: 'public/manifest.json', to: 'manifest.json' },
        { from: 'public/robots.txt', to: 'robots.txt' },
        { from: 'public/_redirects', to: '_redirects' }
      ]
    }),
  ],

  optimization: {
    minimize: true,
    usedExports: true,
    sideEffects: false,
    splitChunks: {
      chunks: 'all',
      minSize: 50000,     // Aumentar tamaño mínimo
      maxSize: 500000,    // Aumentar tamaño máximo  
      maxInitialRequests: 8,  // Limitar requests iniciales
      maxAsyncRequests: 12,   // Limitar requests async
      cacheGroups: {
        // Web3 libraries - chunk grande
        blockchain: {
          test: /[\\/]node_modules[\\/](web3|ethers|@web3-react|@chainlink)[\\/]/,
          name: 'blockchain',
          chunks: 'all',
          priority: 40,
          enforce: true,
        },
        // React ecosystem
        react: {
          test: /[\\/]node_modules[\\/](react|react-dom|react-router)[\\/]/,
          name: 'react',
          chunks: 'all',
          priority: 30,
          enforce: true,
        },
        // UI Libraries
        ui: {
          test: /[\\/]node_modules[\\/](styled-components|framer-motion|@fortawesome)[\\/]/,
          name: 'ui',
          chunks: 'all',
          priority: 20,
          enforce: true,
        },
        // Vendor - resto de node_modules
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendor',
          chunks: 'all',
          priority: 10,
          minChunks: 2,
          enforce: true,
        },
        // Aplicación común
        common: {
          name: 'common',
          minChunks: 2,
          chunks: 'all',
          priority: 5,
          enforce: true,
        },
      },
    },
    // Runtime chunk único
    runtimeChunk: {
      name: 'runtime',
    },
  },

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
    port: 3000,
    open: true,
    client: {
      overlay: true
    }
  },

  stats: {
    errorDetails: true,
    warnings: true,
    children: false,
    modules: false,
    chunks: false,
    chunkModules: false,
    entrypoints: false,
    assets: false,
  },
};