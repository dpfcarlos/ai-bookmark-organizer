// Parses and generates the standard "Netscape bookmark file" HTML format,
// which every browser can import and export (Chrome, Edge, Firefox, Safari, Opera...).

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", apos: "'", nbsp: ' ' };

export function decode(str = '') {
  return str.replace(/&(#x[0-9a-f]+|#\d+|[a-z0-9]+);/gi, (m, e) => {
    if (e[0] === '#') {
      const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

export function encode(str = '') {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function attr(attrs, name) {
  const m = attrs.match(new RegExp(`${name}\\s*=\\s*"([^"]*)"`, 'i')) || attrs.match(new RegExp(`${name}\\s*=\\s*'([^']*)'`, 'i'));
  return m ? decode(m[1]) : undefined;
}

/**
 * Parses bookmarks HTML into a tree:
 * { type: 'folder', name, children: [...], toolbar?: true } / { type: 'url', name, url, addDate }
 * Returns the top-level folder (name "root").
 */
export function parse(html) {
  const root = { type: 'folder', name: 'root', children: [] };
  const stack = [root];
  let pendingFolder = null;
  const re = /<DT>\s*<H3([^>]*)>([\s\S]*?)<\/H3>|<DT>\s*<A([^>]*)>([\s\S]*?)<\/A>|<DL[^>]*>|<\/DL>/gi;
  let m;
  while ((m = re.exec(html))) {
    const token = m[0];
    const top = stack[stack.length - 1];
    if (m[1] !== undefined) {
      const attrs = m[1];
      pendingFolder = {
        type: 'folder',
        name: decode(m[2].replace(/<[^>]+>/g, '').trim()),
        addDate: Number(attr(attrs, 'ADD_DATE')) || undefined,
        toolbar: /PERSONAL_TOOLBAR_FOLDER\s*=\s*"true"/i.test(attrs),
        children: [],
      };
      top.children.push(pendingFolder);
    } else if (m[3] !== undefined) {
      const url = attr(m[3], 'HREF');
      if (!url) continue;
      top.children.push({
        type: 'url',
        name: decode(m[4].replace(/<[^>]+>/g, '').trim()) || url,
        url,
        addDate: Number(attr(m[3], 'ADD_DATE')) || undefined,
      });
    } else if (/^<DL/i.test(token)) {
      if (pendingFolder) {
        stack.push(pendingFolder);
        pendingFolder = null;
      } else if (stack.length > 1 || root.children.length) {
        // A stray <DL> without a heading: treat as continuing the current folder.
      }
    } else if (/^<\/DL/i.test(token)) {
      if (stack.length > 1) stack.pop();
    }
  }
  return root;
}

/** Counts urls and folders inside a parsed tree. */
export function count(node) {
  let urls = 0;
  let folders = 0;
  for (const c of node.children || []) {
    if (c.type === 'url') urls++;
    else {
      folders++;
      const r = count(c);
      urls += r.urls;
      folders += r.folders;
    }
  }
  return { urls, folders };
}

/**
 * Generates bookmarks HTML. `folders` is an array of top-level folder nodes in the same
 * shape parse() returns. Mark the bookmarks-bar folder with toolbar: true.
 */
export function generate(folders) {
  const now = Math.floor(Date.now() / 1000);
  const lines = [
    '<!DOCTYPE NETSCAPE-Bookmark-file-1>',
    '<!-- This is an automatically generated file.',
    '     It will be read and overwritten.',
    '     DO NOT EDIT! -->',
    '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
    '<TITLE>Bookmarks</TITLE>',
    '<H1>Bookmarks</H1>',
    '<DL><p>',
  ];
  const emit = (node, depth) => {
    const pad = '    '.repeat(depth);
    if (node.type === 'url') {
      lines.push(`${pad}<DT><A HREF="${encode(node.url)}" ADD_DATE="${node.addDate || now}">${encode(node.name)}</A>`);
      return;
    }
    const tb = node.toolbar ? ' PERSONAL_TOOLBAR_FOLDER="true"' : '';
    lines.push(`${pad}<DT><H3 ADD_DATE="${node.addDate || now}" LAST_MODIFIED="${now}"${tb}>${encode(node.name)}</H3>`);
    lines.push(`${pad}<DL><p>`);
    for (const c of node.children || []) emit(c, depth + 1);
    lines.push(`${pad}</DL><p>`);
  };
  for (const f of folders) emit(f, 1);
  lines.push('</DL><p>');
  return lines.join('\n') + '\n';
}
