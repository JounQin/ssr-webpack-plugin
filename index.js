class VueSSRPlugin {
  constructor (options = {}) {
    this.options = options
  }

  apply (compiler) {
    compiler.plugin('emit', (compilation, cb) => {
      const stats = compilation.getStats().toJson()

      let entry = this.options.entry || 'main'
      if (!stats.assetsByChunkName[entry]) {
        throw new Error(
          `Entry "${entry}" not found. Did you specify the correct entry option?`
        )
      }

      const bundle = {
        entry: stats.assetsByChunkName[entry],
        files: {},
        maps: {}
      }

      stats.assets.forEach(asset => {
        if (asset.name.match(/\.js$/)) {
          bundle.files[asset.name] = compilation.assets[asset.name].source()
          delete compilation.assets[asset.name]
        } else if (asset.name.match(/\.js\.map$/)) {
          bundle.maps[asset.name] = compilation.assets[asset.name].source()
          delete compilation.assets[asset.name]
        }
      })

      const json = JSON.stringify(bundle, null, 2)
      const filename = this.options.filename || 'vue-ssr-bundle.json'

      compilation.assets[filename] = {
        source: () => json,
        size: () => json.length
      }

      cb()
    })
  }
}

module.exports = VueSSRPlugin
