import rpi_jsy from 'rollup-plugin-jsy'
import rpi_dgnotify from 'rollup-plugin-dgnotify'
import rpi_resolve from '@rollup/plugin-node-resolve'
import { terser as rpi_terser } from 'rollup-plugin-terser'
import {builtinModules} from 'module'

const _cfg_ = {
  plugins: [ rpi_dgnotify(), rpi_resolve() ],
  external: id => builtinModules.includes(id),
}

const cfg_nodejs = { ..._cfg_,
  plugins: [
    rpi_jsy({defines: {PLAT_NODEJS: true}}),
    ... _cfg_.plugins ]}

const cfg_web = { ..._cfg_,
  plugins: [
    rpi_jsy({defines: {PLAT_WEB: true}}),
    ... _cfg_.plugins ]}

const cfg_web_min = { ... cfg_web,
  plugins: [ ... cfg_web.plugins, rpi_terser() ]}

const _out_ = { sourcemap: true }


const configs = []
export default configs


add_jsy('index')
add_jsy('v4')
add_jsy('v5')


function add_jsy(src_name, opt={}) {
  const input = `code/${src_name}${opt.ext || '.jsy'}`

  if (cfg_nodejs)
    configs.push({ ... cfg_nodejs, input, output: [
      { ... _out_, file: `cjs/${src_name}.cjs`, format: 'cjs', exports:opt.exports || 'named' },
      { ... _out_, file: `esm/node/${src_name}.mjs`, format: 'es' } ]})

  if (cfg_web)
    configs.push({ ... cfg_web, input,
      output: { ... _out_, file: `esm/web/${src_name}.mjs`, format: 'es' }})

  if ('undefined' !== typeof cfg_web_min)
    configs.push({ ... cfg_web_min, input,
      output: { ... _out_, file: `esm/web/${src_name}.min.mjs`, format: 'es', sourcemap: false }})
}
