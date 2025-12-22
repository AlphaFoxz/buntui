import path from 'path';
import fs from 'fs';

const rootDir = path.resolve(__dirname, '..');
const packagesDir = path.resolve(rootDir, 'packages');

interface PackageJson {
    name: string;
    version?: string;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
}

function main() {
    const rootPackage = fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8');
    const rootPackageJson: PackageJson = JSON.parse(rootPackage);
    const rootVersion = rootPackageJson.version || '0.0.0';

    const dirs = fs.readdirSync(packagesDir);
    for (const dir of dirs) {
        const pkgJsonPath = path.join(packagesDir, dir, 'package.json');
        const content = fs.readFileSync(pkgJsonPath, 'utf-8');
        const json = JSON.parse(content) as PackageJson;
        json.version = rootVersion;
        fs.writeFileSync(pkgJsonPath, JSON.stringify(json, null, 4) + '\n', 'utf-8');
    }
}

main();
