import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const markupAttributes = /\b(?:href|src|poster|srcset)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
const cssUrls = /url\(\s*(?:"([^"]*)"|'([^']*)'|((?:\\.|[^\s)])+))\s*\)/gi;
const cssImports = /@(import|use|forward)[ \t]+(?:url\([ \t]*)?(?:"([^"]+)"|'([^']+)')/gi;

function filesIn(directory, extensions) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory()
      ? filesIn(file, extensions)
      : extensions.has(path.extname(entry.name).toLowerCase()) ? [file] : [];
  });
}

function referencePath(reference) {
  const value = reference.trim().replace(/\\(.)/g, '$1');
  if (value === '"' || value.includes('#{')) return null;
  if (!value || /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(value)) return null;
  const pathname = value.split(/[?#]/, 1)[0];
  if (!pathname) return null;
  try {
    return decodeURIComponent(pathname);
  } catch {
    return pathname;
  }
}

function existsAsHostingPath(publicRoot, sourceFile, reference) {
  const pathname = referencePath(reference);
  if (pathname === null) return true;

  const target = path.resolve(pathname.startsWith('/')
    ? publicRoot
    : path.dirname(sourceFile), pathname.replace(/^[/\\]+/, ''));
  const relative = path.relative(publicRoot, target);
  if (relative.startsWith('..') || path.isAbsolute(relative)) return false;
  if (existsSync(target)) return true;
  if (pathname.endsWith('/')) return existsSync(path.join(target, 'index.html'));
  if (!path.extname(pathname) && existsSync(`${target}.html`)) return true;
  if (['.scss', '.sass'].includes(path.extname(sourceFile).toLowerCase()) && !path.extname(pathname)) {
    const basename = path.basename(target);
    const sassCandidates = [
      `${target}.scss`, `${target}.sass`, `${target}.css`,
      path.join(path.dirname(target), `_${basename}.scss`),
      path.join(path.dirname(target), `_${basename}.sass`),
      path.join(target, '_index.scss'), path.join(target, 'index.scss')
    ];
    if (sassCandidates.some(existsSync)) return true;
  }

  // Build artifacts are absent from a clean checkout until Webpack runs.
  return relative.split(path.sep)[0] === 'dist' && !existsSync(path.join(publicRoot, 'dist'));
}

function localReferences(file, source) {
  const extension = path.extname(file).toLowerCase();
  const references = [];
  if (extension === '.html') {
    const html = source.replace(/<!--[\s\S]*?-->/g, '');
    for (const match of html.matchAll(markupAttributes)) {
      const attribute = match[1] === undefined && match[2] === undefined ? '' : match[1] ?? match[2];
      references.push(...(match[0].toLowerCase().includes('srcset=')
        ? attribute.split(',').map((candidate) => candidate.trim().split(/\s+/, 1)[0])
        : [attribute]));
    }
  }
  if (['.css', '.scss', '.html'].includes(extension)) {
    const css = source.replace(/\/\*[\s\S]*?\*\//g, '');
    for (const match of css.matchAll(cssUrls)) references.push(match[1] ?? match[2] ?? match[3]);
    for (const match of css.matchAll(cssImports)) references.push(match[2] ?? match[3]);
  }
  return references;
}

export function findMissingReferences(publicRoot) {
  const root = path.resolve(publicRoot);
  return filesIn(root, new Set(['.html', '.css', '.scss']))
    .flatMap((file) => localReferences(file, readFileSync(file, 'utf8'))
      .filter((reference) => !existsAsHostingPath(root, file, reference))
      .map((reference) => ({ file: path.relative(root, file), reference })));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const publicRoot = path.resolve('public');
  const missing = findMissingReferences(publicRoot);
  if (missing.length) {
    for (const { file, reference } of missing) console.error(`${file}: missing local reference ${reference}`);
    process.exitCode = 1;
  } else {
    console.log('All local HTML, CSS, and SCSS references resolve.');
  }
}
