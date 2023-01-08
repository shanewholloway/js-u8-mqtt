import {createWriteStream} from 'fs'
import {stat, readdir} from 'fs/promises'

const out_doc_path = process.argv[2]
const local_path = './esm/web/'

stat_outputs()
  .then(show_stat_table)

async function stat_outputs() {
  let dir = await readdir(local_path)
  dir = dir
    .filter(e => e.includes('.js'))
    .sort()

  let by_name = {}

  for (let e of dir) {
    let {size} = await stat(`${local_path}/${e}`)

    let [name0, kind] = e.split('.js')
    let name = name0.replace(/\.min$/,'')
    kind = kind ? kind.replace(/^\./,'')
      : name === name0 ? 'raw' : 'min'

    let row = by_name[name] || {name: `\`${name}\``.padEnd(16)}
    row[kind] = `${size}`.padStart(6, ' ')
    by_name[name] = row
  }
  return by_name
}

async function show_stat_table(by_name) {
  let out = out_doc_path
    ? createWriteStream(out_doc_path)
    : process.stdout


  out.write(`# Summary Size Cost in Bytes\n`)
  out.write(`\n`)
  out.write(`| module           |   brotli | minified |   source |\n`)
  out.write(`|:-----------------|---------:|---------:|---------:|\n`)
  for (let o of Object.values(by_name))
    out.write(`| ${o.name} | ${o.br} B | ${o.min} B | ${o.raw} B |\n`)
  out.write(`\n`)
  out.write(`\n`)

  out.end()
}

