# ssr-webpack-plugin

A Webpack plugin for generating a server-rendering bundle that can be used with Vue 2.x's [bundleRenderer](https://github.com/vuejs/vue/tree/dev/packages/vue-server-renderer#why-use-bundlerenderer). **This plugin requires `vue-server-renderer@^2.2.0`** in vue project or `run-in-vm` in react project.

### Why?

When you use Webpack's on-demand code-splitting feature (via `require.ensure` or dynamic `import`), the resulting server-side bundle will contain multiple separate files. This plugin simplifies the workflow by automatically packing these files into a single JSON file that can be passed to `bundleRenderer`.

### Usage

``` bash
npm install ssr-webpack-plugin --save-dev
```

``` js
// in your webpack server bundle config
const SSRPlugin = require('ssr-webpack-plugin')

module.exports = {
  target: 'node',
  output: {
    path: '...',
    filename: '...',
    libraryTarget: 'commonjs2'
  },
  // ...
  plugins: [
    new SSRPlugin()
  ]
}
```

By default, the resulting bundle JSON will be generated as `ssr-bundle.json` in your Webpack output directory. You can customize the filename by passing an option to the plugin:

``` js
new SSRPlugin({
  filename: 'my-bundle.json'
})
```

Using the generated bundle is straightforward:

``` js
// vue project
const renderer = require('vue-server-renderer')
  .createBundleRenderer('/path/to/my-bundle.json') // can also pass the parsed object
  
// react project
const context = {}
require('run-in-vm')(require('/path/to/my-bundle.json'), context)
```

If you have more than one named entries in your Webpack config (although you probably don't need to do this when building server bundles), you can specify which entry should be used for the SSR bundle using the `entry` option:

``` js
module.exports = {
  entry: {
    vendor: [...],
    app: '...'
  },
  plugins: [
    new SSRPlugin({
      entry: 'app' // <- use "app" chunk as SSR bundle entry
    })
  ]
}
```
