const hash = require('hash-sum')

module.exports = class VueSSRClientPlugin {
  constructor (options = {}) {
    this.options = options
  }

  apply (compiler) {
    compiler.plugin('emit', (compilation, cb) => {
      const stats = compilation.getStats().toJson()

      const allFiles = stats.assets
        .map(a => a.name)
        .filter(file => /\.js$/.test(file))

      const initialFiles = Object.keys(stats.entrypoints)
        .map(name => stats.entrypoints[name].assets)
        .reduce((assets, all) => all.concat(assets), [])
        .filter(file => /\.js$/.test(file))

      const asyncFiles = allFiles
        .filter(file => initialFiles.indexOf(file) < 0)

      const manifest = {
        publicPath: stats.publicPath,
        all: allFiles,
        initial: initialFiles,
        async: asyncFiles,
        modules: { /* [identifier: string]: Array<index: number> */ }
      }

      stats.modules.forEach(m => {
        // ignore modules duplicated in multiple chunks
        if (m.chunks.length === 1) {
          const cid = m.chunks[0]
          const chunk = stats.chunks.find(c => c.id === cid)
          manifest.modules[hash(m.identifier)] = chunk.files.map(file => {
            return manifest.all.indexOf(file)
          })
        }
      })

      // produce no-css version of async chunks
      stats.chunks.forEach(chunk => {
        if (!chunk.initial) {
          chunk.files.forEach(file => {
            const source = compilation.assets[file].source()
            const stripped = stripCss(source)
            if (source !== stripped) {
              // record in manifest that
              ;(manifest.hasNoCssVersion || (manifest.hasNoCssVersion = {}))[file] = true
              compilation.assets[file.replace(/\.js$/, '.no-css.js')] = {
                source: () => stripped,
                size: () => stripped.length
              }
            }
          })
        }
      })

      const json = JSON.stringify(manifest, null, 2)
      compilation.assets['vue-ssr-client-manifest.json'] = {
        source: () => json,
        size: () => json.length
      }
      cb()
    })
  }
}

// super hacky way of stripping CSS from minified output
// (this is how css-loader embeds CSS)
const CSS_RE = /(\d+:function\(\w,\w,\w\)\{\w=\w\.exports=\w\(\d+\)\(void 0\),\w\.push\(\[\w\.i,")[^"]*?(",")[^"]*?("\]\)\})/g

function stripCss (source) {
  return source.replace(CSS_RE, '$1$2$3')
}
