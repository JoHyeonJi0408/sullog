// dist/ 결과물을 아티팩트용 HTML 한 장(artifact/sullog.html) + wasm 파일로 합친다
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';

const html = readFileSync('dist/index.html', 'utf8');
const jsPath = html.match(/<script[^>]+src="\.\/([^"]+\.js)"/)?.[1];
const cssPath = html.match(/<link[^>]+href="\.\/([^"]+\.css)"/)?.[1];
if (!jsPath || !cssPath) throw new Error('dist/index.html에서 js/css를 찾지 못함');

const js = readFileSync(join('dist', jsPath), 'utf8').replace(/<\/script/gi, '<\\/script');
const css = readFileSync(join('dist', cssPath), 'utf8').replace(/<\/style/gi, '<\\/style');

const page = `<title>술로그</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Gowun+Dodum&family=Jua&display=swap">
<style>${css}</style>
<div id="root"></div>
<script type="module">${js}</script>
`;

mkdirSync('artifact', { recursive: true });
writeFileSync('artifact/sullog.html', page);
copyFileSync('node_modules/zxing-wasm/dist/reader/zxing_reader.wasm', 'artifact/zxing_reader.wasm');
console.log(`artifact/sullog.html ${(page.length / 1024).toFixed(0)} KB`);
