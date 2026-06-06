import fs from 'node:fs';

export function readPackageVersion(filePath: string): string | undefined {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const parsed: unknown = JSON.parse(raw);
  if (typeof parsed === 'object' && parsed !== null && 'version' in parsed) {
    const {version} = (parsed as Record<string, unknown>);
    if (typeof version === 'string') {
      return version;
    }
  }

  return undefined;
}
