// dist/ 빌드 결과를 HTML 한 파일로 묶는다(외부 파일을 못 쓰는 게시 환경용).
// 사용: node scripts/inline-dist.mjs <출력 경로>
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const out = process.argv[2]
if (!out) {
  console.error('usage: node scripts/inline-dist.mjs <output.html>')
  process.exit(1)
}

const dist = 'dist'
const html = readFileSync(join(dist, 'index.html'), 'utf8')
const js = html.match(/<script type="module" crossorigin src="\.\/(assets\/[^"]+\.js)"><\/script>/)
const css = html.match(/<link rel="stylesheet" crossorigin href="\.\/(assets\/[^"]+\.css)">/)
if (!js || !css) {
  console.error('dist/index.html 에서 스크립트·스타일 태그를 찾지 못했습니다')
  process.exit(1)
}
const script = readFileSync(join(dist, js[1]), 'utf8').replace(/<\/script/gi, '<\\/script')
const style = readFileSync(join(dist, css[1]), 'utf8')

// 게시 환경이 doctype/html/head/body 를 씌우므로 내용만 쓴다.
const page = [
  '<title>식장까지 업고 튀어</title>',
  `<style>${style}</style>`,
  '<div id="root"></div>',
  `<script type="module">${script}</script>`,
  '',
].join('\n')
writeFileSync(out, page)
console.log(`${out} (${Math.round(page.length / 1024)} KB)`)
