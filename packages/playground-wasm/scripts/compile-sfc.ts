import {compileSfc} from './compile.ts';

const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: bun run scripts/compile-sfc.ts <file.vue>');
  process.exit(1);
}

const source = await Bun.file(filePath).text();
const code = compileSfc(source, filePath);
process.stdout.write(code);
