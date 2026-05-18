import fs from 'node:fs';
import path from 'node:path';

const templateDir = path.resolve(import.meta.dir, '..', 'templates', 'basic');

function copyRecursive(srcDir: string, outDir: string, projectName: string): void {
  const entries = fs.readdirSync(srcDir, {withFileTypes: true});
  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const outPath = path.join(outDir, entry.name);
    if (entry.isDirectory()) {
      fs.mkdirSync(outPath, {recursive: true});
      copyRecursive(srcPath, outPath, projectName);
    } else {
      const content = fs.readFileSync(srcPath, 'utf-8');
      const rendered = content.replaceAll('{{name}}', projectName);
      fs.writeFileSync(outPath, rendered, 'utf-8');
    }
  }
}

export function scaffoldCopy(projectName: string, targetDir: string): string {
  const outputDir = path.resolve(targetDir, projectName);

  if (fs.existsSync(outputDir)) {
    throw new Error(`Directory already exists: ${outputDir}`);
  }

  fs.mkdirSync(outputDir, {recursive: true});
  copyRecursive(templateDir, outputDir, projectName);
  return outputDir;
}
