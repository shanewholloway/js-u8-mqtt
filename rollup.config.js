import rpi_jsy from 'rollup-plugin-jsy'
import rpi_dgnotify from 'rollup-plugin-dgnotify'
import rpi_resolve from '@rollup/plugin-node-resolve'
import rpi_terser from '@rollup/plugin-terser'
import rpi_json from '@rollup/plugin-json'
import { builtinModules } from 'module'

const _rpis_ = (defines, ...args) => [
  rpi_jsy({defines}),
  rpi_json(),
  rpi_resolve(),
  ...args,
  rpi_dgnotify()]

const _cfg_ = {
  external: id => /^\w*:/.test(id) || builtinModules.includes(id),
  plugins: _rpis_({}) }

const cfg_nodejs = { ..._cfg_,
  plugins: _rpis_({PLAT_NODEJS: true}) }

const cfg_deno = { ..._cfg_,
  plugins: _rpis_({PLAT_DENO: true}) }

const cfg_web = { ..._cfg_,
  plugins: _rpis_({PLAT_WEB: true}) }

let is_watch = process.argv.includes('--watch')
const cfg_web_min = is_watch ? null : { ... cfg_web,
  plugins: _rpis_({PLAT_WEB: true}, rpi_terser()) }



export default [
  ... add_jsy('index'),
  ... add_jsy('v4'),
  ... add_jsy('v5'),
]


function * add_jsy(src_name, opt={}) {
  const input = `code/${src_name}.mjs`

  if (cfg_nodejs)
    yield ({ ... cfg_nodejs, input, output: [
      { file: `cjs/${src_name}.cjs`, format: 'cjs', exports:opt.exports || 'named', sourcemap: true },
      { file: `esm/node/${src_name}.js`, format: 'es', sourcemap: true },
      { file: `esm/node/${src_name}.mjs`, format: 'es', sourcemap: true },
    ]})

  if (cfg_deno)
    yield ({ ... cfg_deno, input,
      output: { file: `esm/deno/${src_name}.js`, format: 'es', sourcemap: true } })

  if (cfg_web)
    yield ({ ... cfg_web, input,
      output: { file: `esm/web/${src_name}.js`, format: 'es', sourcemap: true } })

  if (cfg_web_min)
    yield ({ ... cfg_web_min, input,
      output: { file: `esm/web/${src_name}.min.js`, format: 'es', sourcemap: false } })
}
