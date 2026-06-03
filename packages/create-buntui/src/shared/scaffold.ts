import fs from 'node:fs';
import path from 'node:path';
import {readPackageVersion} from './utils';

export type TemplateName = 'basic' | 'sfc' | 'full';

function getTemplateDir(template: TemplateName): string {
  return path.resolve(import.meta.dir, '..', '..', 'templates', template);
}

function copyRecursive(srcDir: string, outDir: string, variables: Record<string, string>): void {
  const entries = fs.readdirSync(srcDir, {withFileTypes: true});
  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const outPath = path.join(outDir, entry.name);
    if (entry.isDirectory()) {
      fs.mkdirSync(outPath, {recursive: true});
      copyRecursive(srcPath, outPath, variables);
    } else {
      const content = fs.readFileSync(srcPath, 'utf-8');
      let rendered = content;
      for (const [key, value] of Object.entries(variables)) {
        rendered = rendered.replaceAll(`{{${key}}}`, value);
      }

      fs.writeFileSync(outPath, rendered, 'utf-8');
    }
  }
}

export function scaffoldCopy(
  projectName: string,
  targetDir: string,
  template: TemplateName = 'basic',
): string {
  const outputDir = path.resolve(targetDir, projectName);

  if (fs.existsSync(outputDir)) {
    throw new Error(`Directory already exists: ${outputDir}`);
  }

  const templateDir = getTemplateDir(template);
  if (!fs.existsSync(templateDir)) {
    throw new Error(`Template not found: ${template}`);
  }

  fs.mkdirSync(outputDir, {recursive: true});

  const selfVersion = readPackageVersion(path.resolve(import.meta.dir, '..', '..', 'package.json'));
  const variables: Record<string, string> = {
    name: projectName,
    version: selfVersion ?? 'latest',
  };

  try {
    copyRecursive(templateDir, outputDir, variables);
  } catch (error) {
    fs.rmSync(outputDir, {recursive: true, force: true});
    throw error;
  }

  return outputDir;
}

export function scaffoldCleanup(projectDir: string): void {
  if (fs.existsSync(projectDir)) {
    fs.rmSync(projectDir, {recursive: true, force: true});
  }
}
