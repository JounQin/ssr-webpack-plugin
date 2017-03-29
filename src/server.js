const hash = require('hash-sum')
const { validate, warn } = require('./validate')

module.exports = class VueSSRServerPlugin {
  constructor (options = {}) {
    this.options = options
  }

  apply (compiler) {
    validate(compiler)

    compiler.plugin('emit', (compilation, cb) => {
      const stats = compilation.getStats().toJson()
      const entryName = Object.keys(stats.entrypoints)[0]
      const entryAssets = stats.entrypoints[entryName].assets.filter(file => {
        return /\.js$/.test(file)
      })

      if (entryAssets.length > 1) {
        throw new Error(
          `Server-side bundle should have one single entry file. ` +
          `Avoid using CommonsChunkPlugin in the server config.`
        )
      }

      const entry = entryAssets[0]
      if (!entry || typeof entry !== 'string') {
        throw new Error(
          `Entry "${entryName}" not found. Did you specify the correct entry option?`
        )
      }

      const bundle = {
        entry,
        files: {},
        maps: {},
        modules: {} // maps each file to a list of hashed module identifiers
      }

      stats.assets.forEach(asset => {
        if (asset.name.match(/\.js$/)) {
          bundle.files[asset.name] = compilation.assets[asset.name].source()
          const modules = bundle.modules[asset.name] = []
          asset.chunks.forEach(id => {
            stats.modules.forEach(m => {
              if (m.chunks.some(_id => id === _id)) {
                modules.push(hash(m.identifier))
              }
            })
          })
          delete compilation.assets[asset.name]
        } else if (asset.name.match(/\.js\.map$/)) {
          bundle.maps[asset.name.replace(/\.map$/, '')] = JSON.parse(compilation.assets[asset.name].source())
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


