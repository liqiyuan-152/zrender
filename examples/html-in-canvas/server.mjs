import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../../', import.meta.url));
const port = Number(process.env.PORT || 8081);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };

http.createServer(async (request, response) => {
    try {
        const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
        const relative = pathname === '/' ? 'examples/html-in-canvas/index.html' : pathname.slice(1);
        const filename = path.resolve(root, relative);
        const local = path.relative(root, filename).split(path.sep).join('/');
        if (local.startsWith('..') || path.isAbsolute(local)
            || !(local.startsWith('examples/html-in-canvas/') || local === 'dist/zrender.js')) {
            response.writeHead(404).end();
            return;
        }
        const content = await readFile(filename);
        response.writeHead(200, {
            'Content-Type': (types[path.extname(filename)] || 'application/octet-stream') + '; charset=utf-8',
            'Cache-Control': 'no-store'
        });
        response.end(content);
    }
    catch {
        response.writeHead(404).end('Not found');
    }
}).listen(port, '127.0.0.1', () => {
    console.log(`HTML in Canvas 示例：http://127.0.0.1:${port}`);
}).on('error', error => {
    console.error(error.message);
    process.exitCode = 1;
});
