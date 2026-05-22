/* eslint-env node, es6 */

'use strict';

const
  fs = require('fs'),
  http = require('http'),
  path = require('path'),

  DOC_ROOT = __dirname,
  PORT = 8080,

  MODULE_PACKAGES = [
    'jasmine-core',
    'test-page-loader',
    'anim-event',
    'plain-draggable'
  ];

function getPackageRoot(packageName) {
  return require.resolve(packageName).replace(
    new RegExp(`^(.*[/\\\\]node_modules)[/\\\\]${packageName}[/\\\\].*$`),
    `$1${path.sep}${packageName}`);
}

function getPathname(requestUrl) {
  try {
    return decodeURIComponent(new URL(requestUrl, `http://localhost:${PORT}`).pathname);
  } catch (error) {
    return null;
  }
}

function resolveRequestPath(pathname) {
  for (const packageName of MODULE_PACKAGES) {
    if (pathname === `/${packageName}` || pathname.startsWith(`/${packageName}/`)) {
      return path.join(getPackageRoot(packageName), pathname.slice(packageName.length + 2));
    }
  }

  if (pathname === '/src' || pathname.startsWith('/src/')) {
    return path.join(DOC_ROOT, '..', pathname);
  }

  return path.join(DOC_ROOT, pathname);
}

function sendResponse(response, statusCode, body, contentType = 'text/plain') {
  response.writeHead(statusCode, {
    'Cache-Control': 'no-cache, must-revalidate',
    'Content-Type': contentType
  });
  response.end(body);
}

function getContentType(filePath) {
  switch (path.extname(filePath)) {
    case '.css': return 'text/css';
    case '.html': return 'text/html';
    case '.js': return 'text/javascript';
    case '.json': return 'application/json';
    case '.svg': return 'image/svg+xml';
    default: return 'application/octet-stream';
  }
}

http.createServer((request, response) => {
  const pathname = getPathname(request.url);

  if (!pathname) {
    console.error('(%s) 400', request.url);
    sendResponse(response, 400, 'Bad Request');
    return;
  }

  const filePath = resolveRequestPath(pathname);
  fs.stat(filePath, (statError, stat) => {
    if (statError) {
      console.error('(%s) 404', request.url);
      sendResponse(response, 404, 'Not Found');
      return;
    }

    const resolvedPath = stat.isDirectory() ? path.join(filePath, 'index.html') : filePath;
    fs.readFile(resolvedPath, (readError, content) => {
      if (readError) {
        console.error('(%s) 404', request.url);
        sendResponse(response, 404, 'Not Found');
        return;
      }

      console.info('(%s) 200', request.url);
      sendResponse(response, 200, content, getContentType(resolvedPath));
    });
  });
}).listen(PORT);

console.log(`START: http://localhost:${PORT}/\nROOT: ${DOC_ROOT}`);
console.log('(^C to stop)');
