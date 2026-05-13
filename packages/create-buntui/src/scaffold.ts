import fs from 'node:fs';
import path from 'node:path';
import {execSync} from 'node:child_process';

const templateDir = path.resolve(import.meta.dir, '..', 'templates', 'basic');

export function scaffold(projectName: string, targetDir: string): void {
  const outputDir = path.resolve(targetDir, projectName);

  if (fs.existsSync(outputDir)) {
    throw new Error(`Directory already exists: ${outputDir}`);
  }

  fs.mkdirSync(outputDir, {recursive: true});

  const files = fs.readdirSync(templateDir);
  for (const file of files) {
    const src = path.join(templateDir, file);
    const content = fs.readFileSync(src, 'utf-8');
    const rendered = content.replaceAll('{{name}}', projectName);
    fs.writeFileSync(path.join(outputDir, file), rendered, 'utf-8');
  }

  execSync('bun install', {cwd: outputDir, stdio: 'inherit'});
}
