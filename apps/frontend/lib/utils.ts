import { Asset } from '../types';

export function getApiOrigin(): string {
  return process.env.NEXT_PUBLIC_API_ORIGIN || 'http://localhost:45174';
}

export function fmtBytes(bytes: number): string {
  if (!Number.isFinite(bytes)) return '-';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${n.toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}

export function docTypeOf(item: Asset): string {
  if (item.ext?.trim()) return item.ext.toLowerCase();
  if (item.mime?.trim()) return `mime:${item.mime.toLowerCase()}`;
  return 'no-extension';
}

export function docCategoryOf(item: Asset): 'pdf' | 'word' | 'excel' | 'powerpoint' | 'markdown' | 'text' | 'ebook' | 'database' | 'archive' | 'installer' | 'disk-image' | 'font' | 'certificate' | 'design' | 'cad' | 'executable' | 'code' | 'config' | 'other' {
  const filename = (item.originalName || '').toLowerCase();
  let ext = (item.ext || '').toLowerCase().replace(/^\./, '');
  if (!ext && filename.includes('.')) {
    ext = filename.split('.').pop() || '';
  }
  const mime = (item.mime || '').toLowerCase();
  const size = item.size || 0;

  // 1. Kiểm tra config filenames đặc thù trước
  const configFilenames = [
    'dockerfile', 'containerfile', 'makefile', 'cmakelists.txt',
    '.gitignore', '.gitattributes', '.gitmodules', '.editorconfig',
    '.env', '.env.local', '.env.production', '.env.development', '.env.test',
    'package-lock.json', 'package.json', 'tsconfig.json', 'jsconfig.json',
    'composer.json', 'composer.lock', 'cargo.toml', 'cargo.lock',
    'go.mod', 'go.sum', 'gemfile', 'gemfile.lock', 'podfile', 'podfile.lock',
    'jenkinsfile', 'procfile', 'vagrantfile', 'brewfile', 'tiltfile',
    'taskfile.yml', 'pnpm-workspace.yaml', 'docker-compose.yml', 'docker-compose.yaml',
    'compose.yaml', 'compose.yml', 'kustomization.yaml', 'chart.yaml', 'values.yaml'
  ];

  if (configFilenames.includes(filename)) return 'config';

  // 2. Định nghĩa hằng số extensions tĩnh của các category
  const categories: Record<string, string[]> = {
    pdf: ['pdf'],
    word: ['doc', 'docx', 'docm', 'dotx', 'odt', 'pages', 'rtf'],
    excel: ['xls', 'xlsx', 'xlsm', 'xlsb', 'csv', 'tsv', 'ods', 'numbers'],
    powerpoint: ['ppt', 'pptx', 'pptm', 'ppsx', 'odp'], // .key được xử lý động riêng biệt
    markdown: ['md', 'markdown', 'mdx'],
    text: ['txt', 'log'],
    ebook: ['epub', 'azw', 'azw1', 'azw3', 'azw4', 'azw8', 'kfx', 'tpz', 'mobi', 'prc', 'fb2', 'pdb', 'lrf', 'lrx', 'lit', 'djvu', 'djv', 'cbz', 'cbr', 'cb7', 'cbt', 'cba', 'ibooks', 'xeb'],
    database: ['db', 'db3', 'sqlite', 'sqlite3', 'sqlite2', 'sqlitedb', 'mdb', 'accdb', 'dbf', 'fpt', 'cdx', 'ndf', 'ldf', 'frm', 'ibd', 'myd', 'myi', 'dump', 'ora', 'dbs', 'fdb', 'gdb', 'dbm', 'realm', 'mdbx', 'ldb', 'rdb', 'aof', 'mv.db', 'h2.db', 'duckdb', 'parquet', 'orc', 'feather', 'arrow', 'gpkg', 'sst'],
    archive: ['zip', 'zipx', 'rar', '7z', 'tar', 'tgz', 'tbz', 'tbz2', 'txz', 'tzst', 'tlz', 'tlz4', 'taz', 'gz', 'bz2', 'xz', 'lz', 'lz4', 'lzma', 'zst', 'br', 'Z', 'cpio', 'ar', 'ace', 'arc', 'lzh', 'lha', 'zoo', 'sit', 'sitx'],
    installer: ['apk', 'aab', 'xapk', 'ipa', 'exe', 'msi', 'msix', 'msixbundle', 'appx', 'appxbundle', 'appinstaller', 'pkg', 'mpkg', 'deb', 'rpm', 'snap', 'flatpak', 'appimage', 'run', 'bin', 'jar', 'war', 'ear', 'whl', 'egg', 'crx', 'xpi', 'vsix'],
    'disk-image': ['iso', 'img', 'ima', 'toast', 'nrg', 'mds', 'ccd', 'cue', 'cdi', 'daa', 'uif', 'wim', 'esd', 'dmg', 'vdi', 'vhd', 'vhdx', 'vmdk', 'qcow', 'qcow2', 'ova', 'ovf', 'hdd', 'mdf'], // .cue được giữ ở đây
    font: ['ttf', 'ttc', 'otf', 'otc', 'woff', 'woff2', 'eot', 'fon', 'fnt', 'bdf', 'pcf', 'pfb', 'pfm', 'afm', 'ufo'],
    certificate: ['pem', 'crt', 'cer', 'der', 'csr', 'key', 'pub', 'pk8', 'pkcs8', 'p7b', 'p7c', 'p7s', 'p8', 'p10', 'p12', 'pfx', 'p11', 'jks', 'keystore', 'truststore', 'bks', 'bcfks', 'ppk', 'gpg', 'pgp', 'gpgsig', 'asc', 'sig', 'p7m', 'crl', 'cat', 'mobileprovision', 'spc'], // .key xử lý động
    design: ['psd', 'psb', 'ai', 'indd', 'indt', 'idml', 'xd', 'eps', 'fig', 'sketch', 'xcf', 'kra', 'svg', 'cdr', 'cmx', 'afdesign', 'afphoto', 'afpub', 'canva', 'clip', 'sai', 'sai2'],
    cad: ['dwg', 'dxf', 'dwt', 'step', 'stp', 'iges', 'igs', 'stl', 'fbx', '3ds', 'max', 'blend', 'glb', 'gltf', 'dae', 'abc', 'usd', 'usda', 'usdc', 'usdz', '3dm', 'skp', 'sldprt', 'sldasm', 'slddrw', 'ipt', 'iam', 'idw', 'catpart', 'catproduct', 'catdrawing', 'prt', 'x_t', 'x_b', 'sat', 'sab', 'ifc', 'rvt', 'rfa', 'scad', 'ply', 'las', 'laz', 'obj'],
    executable: ['dll', 'com', 'scr', 'cpl', 'ocx', 'drv', 'sys', 'mui', 'so', 'out', 'elf', 'ko', 'dylib', 'app', 'bundle', 'o', 'a', 'lib', 'lo', 'la', 'class', 'pyc', 'pyo', 'ni.dll', 'wasm'],
    code: [
      'c', 'cc', 'cp', 'cpp', 'cxx', 'c++', 'h', 'hh', 'hp', 'hpp', 'hxx', 'h++', 'inl', 'ipp', 'tpp', 'cs', 'vb', 'fs', 'fsi', 'fsx', 'java', 'kt', 'kts', 'scala', 'sc', 'groovy', 'gvy', 'gy', 'gsh', 'go', 'rs', 'zig', 'swift', 'm', 'mm', 'dart', 'js', 'mjs', 'cjs', 'jsx', 'ts', 'mts', 'cts', 'tsx', 'html', 'htm', 'xhtml', 'css', 'scss', 'sass', 'less', 'styl', 'vue', 'svelte', 'astro', 'php', 'php3', 'php4', 'php5', 'phtml', 'py', 'pyw', 'pyi', 'pyx', 'pxd', 'pxi', 'ipynb', 'rb', 'rbw', 'rake', 'pl', 'pm', 't', 'lua', 'r', 'rmd', 'jl', 'hs', 'lhs', 'ml', 'mli', 'elm', 'erl', 'hrl', 'ex', 'exs', 'clj', 'cljs', 'cljc', 'edn', 'lisp', 'lsp', 'el', 'scm', 'ss', 'nim', 'nims', 'cr', 'v', 'vsh', 'd', 'adb', 'ads', 'pas', 'pp', 'lpr', 'f', 'f77', 'f90', 'f95', 'f03', 'f08', 'cob', 'cbl', 'asm', 's', 'S', 'sh', 'bash', 'zsh', 'fish', 'ksh', 'csh', 'tcsh', 'ps1', 'psm1', 'psd1', 'bat', 'cmd', 'awk', 'sed', 'sql', 'psql', 'pgsql', 'graphql', 'gql', 'proto', 'thrift', 'sol', 'move', 'wat', 'pro', 'prolog', 'gd', 'glsl', 'vert', 'frag', 'geom', 'comp', 'tesc', 'tese', 'bicep'
    ],
    config: [
      'json', 'json5', 'jsonc', 'jsonld', 'xml', 'xsd', 'xsl', 'xslt', 'wsdl', 'yaml', 'yml', 'toml', 'ini', 'cfg', 'conf', 'cnf', 'properties', 'env', 'dockerfile', 'dockerignore', 'containerfile', 'gitignore', 'gitattributes', 'gitmodules', 'editorconfig', 'npmrc', 'yarnrc', 'pnpmfile', 'pnpm-workspace', 'npmignore', 'lock', 'cmake', 'make', 'mk', 'gradle', 'bazel', 'bzl', 'meson', 'ninja', 'tf', 'tfvars', 'hcl', 'jenkinsfile', 'kubeconfig', 'har', 'manifest', 'service', 'target'
    ]
  };

  // 3. Xử lý trường hợp .key đặc thù
  if (ext === 'key') {
    if (size > 102400 || mime.includes('keynote') || mime.includes('iwork')) {
      return 'powerpoint';
    }
    return 'certificate';
  }

  // 4. Quét qua các danh mục tĩnh
  for (const [catName, extensions] of Object.entries(categories)) {
    if (extensions.includes(ext)) {
      return catName as any;
    }
  }

  return 'other';
}

export const DOC_CATEGORY_LABELS: Record<string, string> = {
  pdf: 'PDF',
  word: 'Word',
  excel: 'Excel/CSV',
  powerpoint: 'PowerPoint',
  markdown: 'Markdown',
  text: 'Văn bản',
  ebook: 'Sách điện tử',
  database: 'Cơ sở dữ liệu',
  archive: 'Tệp nén',
  installer: 'Bộ cài đặt',
  'disk-image': 'Ảnh đĩa',
  font: 'Phông chữ',
  certificate: 'Chứng thư số',
  design: 'Thiết kế',
  cad: 'Bản vẽ CAD/3D',
  executable: 'Tệp thực thi',
  code: 'Mã nguồn',
  config: 'Cấu hình',
  other: 'Khác',
};

export function monthLabel(iso: string | null, lang: string): string {
  const d = iso ? new Date(iso) : new Date();
  const raw = new Intl.DateTimeFormat(lang === 'vi' ? 'vi-VN' : 'en-US', { month: 'long', year: 'numeric' }).format(d);
  if (!raw) return '';
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export function yearLabel(iso: string | null): string {
  const d = iso ? new Date(iso) : new Date();
  return String(d.getFullYear());
}

export function inferUploadKind(file: File): string {
  const t = (file?.type || '').toLowerCase();
  const name = (file?.name || '').toLowerCase();
  if (t.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|heic|avif|svg|bmp|tiff|tif|ico)$/.test(name)) return 'image';
  if (t.startsWith('video/') || /\.(mp4|mov|mkv|webm|avi|m4v|wmv|mpeg|mpg|3gp|flv|ogv)$/.test(name)) return 'video';
  return 'doc';
}

export async function readErrorMessage(res: Response, translateFn: (key: string, replacements?: Record<string, string | number>) => string): Promise<string> {
  try {
    const data = await res.clone().json();
    if (data?.message) return String(data.message);
    return JSON.stringify(data);
  } catch {
    try {
      const txt = await res.text();
      if (txt) return txt.slice(0, 300);
    } catch { }
  }
  return translateFn('messages.noDetailFromServer');
}

export function docIconOf(item: Asset): string {
  const ext = (item.ext || '').toLowerCase().replace(/^\./, '');
  
  if (['pdf'].includes(ext)) return '📕';
  if (['xls', 'xlsx', 'xlsm', 'xlsb', 'csv', 'tsv', 'ods', 'numbers'].includes(ext)) return '📊';
  if (['doc', 'docx', 'docm', 'dotx', 'odt', 'pages', 'rtf'].includes(ext)) return '📘';
  if (['ppt', 'pptx', 'pptm', 'ppsx', 'odp', 'key'].includes(ext)) return '📙';
  if (['zip', 'rar', '7z', 'tar', 'gz', 'tgz', 'bz2', 'xz', 'iso', 'dmg', 'apk', 'jar', 'war', 'cab'].includes(ext)) return '📦';
  if (['md', 'markdown', 'mdx', 'txt', 'log'].includes(ext)) return '📝';
  
  const codeExtensions = [
    'html', 'htm', 'css', 'scss', 'sass', 'less', 'js', 'jsx', 'ts', 'tsx', 'vue', 'svelte', 'astro', 'elm', 'graphql', 'gql', 'wasm', 'wat',
    'py', 'pyw', 'java', 'kt', 'kts', 'rb', 'rbw', 'pl', 'pm', 'php', 'go', 'rs', 'c', 'cpp', 'cc', 'cxx', 'h', 'hpp', 'cs', 'fs', 'fsx', 'sh', 'bash', 'zsh', 'fish', 'ps1', 'bat', 'cmd', 'awk', 'sed',
    'r', 'rmd', 'ipynb', 'lua', 'scala', 'groovy', 'clj', 'cljs', 'cljc', 'edn', 'ex', 'exs', 'erl', 'hrl', 'hs', 'pas', 'pp', 'f', 'f90', 'm', 'mm', 'swift', 'dart', 'sol',
    'json', 'jsonld', 'xml', 'yaml', 'yml', 'toml', 'ini', 'conf', 'config', 'properties', 'gradle', 'sql', 'proto', 'thrift', 'env', 'lock', 'mod', 'sum', 'podspec', 'gemspec'
  ];
  if (codeExtensions.includes(ext) || ext.endsWith('rc') || ext.endsWith('ignore')) return '💻';
  
  return '📄';
}

export function formatDateTime(dateStr: string | null | undefined, lang: string): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-US');
  } catch {
    return dateStr;
  }
}



export function hasWritePermission(asset: Asset, user: any, groups: any[]): boolean {
  if (!asset || !user) return false;
  if (!asset.groupId) {
    // Tệp tin cá nhân: Chỉ chủ sở hữu mới sửa được
    return asset.ownerId === user.sub;
  }
  // Tệp tin thuộc nhóm chia sẻ:
  const group = groups.find(g => g.id === asset.groupId);
  if (!group) return false;
  
  const isCreator = asset.ownerId === user.sub;
  const isManager = group.role === 'owner' || group.role === 'admin';
  return isCreator || isManager;
}

export function translateSpace(sp: any, t: (key: string, replacements?: Record<string, string | number>) => string): any {
  if (!sp) return sp;
  const isGeneral =
    sp.name === 'General' &&
    sp.type === 'journal' &&
    (sp.description === 'General discussion space for the group' || sp.description === 'Write journal entries with attachments.');
  if (isGeneral) {
    const isAlt = sp.description === 'Write journal entries with attachments.';
    return {
      ...sp,
      name: t('spaces.generalName') || sp.name,
      description: isAlt
        ? (t('spaces.generalDescAlternative') || sp.description)
        : (t('spaces.generalDesc') || sp.description),
    };
  }
  return sp;
}

