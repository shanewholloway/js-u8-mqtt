import rpi_jsy from 'rollup-plugin-jsy'
import rpi_dgnotify from 'rollup-plugin-dgnotify'
import rpi_resolve from '@rollup/plugin-node-resolve'
import { terser as rpi_terser } from 'rollup-plugin-terser'
import {builtinModules} from 'module'

const _rpis_ = (defines, ...args) => [
  rpi_jsy({defines}),
  rpi_resolve(),
  ...args,
  rpi_dgnotify()]

const _cfg_ = {
  external: id => /^node:/.test(id) || builtinModules.includes(id),
  plugins: _rpis_({}) }

const cfg_nodejs = { ..._cfg_,
  plugins: _rpis_({PLAT_NODEJS: true, HAS_STREAM: true}) }

const cfg_deno = { ..._cfg_,
  plugins: _rpis_({PLAT_DENO: true}) }

const cfg_web = { ..._cfg_,
  plugins: _rpis_({PLAT_WEB: true}) }

const cfg_web_min = { ... cfg_web,
  plugins: _rpis_({PLAT_WEB: true}, rpi_terser()) }

const _out_ = { sourcemap: true }


export default [
  ... add_jsy('index'),
  ... add_jsy('v4'),
  ... add_jsy('v5'),
]


function * add_jsy(src_name, opt={}) {
  const input = `code/${src_name}.mjs`

  if (cfg_nodejs)
    yield ({ ... cfg_nodejs, input, output: [
      { ... _out_, file: `cjs/${src_name}.cjs`, format: 'cjs', exports:opt.exports || 'named' },
      { ... _out_, file: `esm/node/${src_name}.mjs`, format: 'es' } ]})

  if (cfg_deno)
    yield ({ ... cfg_deno, input,
      output: { ... _out_, file: `esm/deno/${src_name}.mjs`, format: 'es' }})

  if (cfg_web)
    yield ({ ... cfg_web, input,
      output: { ... _out_, file: `esm/web/${src_name}.mjs`, format: 'es' }})

  if ('undefined' !== typeof cfg_web_min)
    yield ({ ... cfg_web_min, input,
      output: { ... _out_, file: `esm/web/${src_name}.min.mjs`, format: 'es', sourcemap: false }})
}
