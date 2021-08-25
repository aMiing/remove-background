/**
 * @author amingxiansen 1006934861@qq.com
 * @description cli配置
 */

module.exports = {
  devServer: {
    hot: true,
    open: true,
    noInfo: false,
    overlay: {
      warnings: true,
      errors: true,
    },
    proxy: {
      '/vab-mock-server': {
        // target: 'http://49.235.109.180:3000',
        target: 'http://localhost:3000',
        pathRewrite: {
          '^/vab-mock-server': '/api'
        }
      },
      '/api/upload/': {
        target: 'http://localhost:3000',
      },
      'customer-upload/': {
        target: 'http://localhost:3000',
      },
      '/example.xlsx': {
        target: 'http://localhost:3000',
      }
    }
  },

  chainWebpack(config) {
    config.module.rule('pug')
      .test(/\.pug$/)
      .use('pug-html-loader')
      .loader('pug-html-loader')
      .end()
  },
}