import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

export function getWebviewContent(
  webview: vscode.Webview,
  extensionUri: vscode.Uri
): string {
  const distPath = vscode.Uri.joinPath(extensionUri, "webview", "dist");

  // In production, load from the built webview assets
  const indexHtmlPath = path.join(distPath.fsPath, "index.html");
  if (fs.existsSync(indexHtmlPath)) {
    let html = fs.readFileSync(indexHtmlPath, "utf-8");

    // Rewrite asset paths to use webview URIs
    const assetUri = webview.asWebviewUri(distPath);
    html = html.replace(/(href|src)="\.?\/?assets\//g, `$1="${assetUri}/assets/`);
    html = html.replace(/(href|src)="\.\//g, `$1="${assetUri}/`);
    html = html.replace(/(href|src)="\//g, `$1="${assetUri}/`);

    // Add CSP
    const nonce = getNonce();
    const csp = [
      `default-src 'none'`,
      `img-src ${webview.cspSource} https: data:`,
      `script-src 'nonce-${nonce}'`,
      `style-src ${webview.cspSource} 'unsafe-inline'`,
      `font-src ${webview.cspSource}`,
      `connect-src ${webview.cspSource} https: http:`,
    ].join("; ");

    html = html.replace(
      "<head>",
      `<head>\n<meta http-equiv="Content-Security-Policy" content="${csp}">`
    );

    // Add nonce to script tags
    html = html.replace(/<script /g, `<script nonce="${nonce}" `);

    return html;
  }

  // Fallback: development mode with Vite dev server
  return getDevContent(webview, extensionUri);
}

function getDevContent(webview: vscode.Webview, extensionUri: vscode.Uri): string {
  const nonce = getNonce();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="
    default-src 'none';
    img-src ${webview.cspSource} https: data:;
    script-src 'nonce-${nonce}' http://localhost:5174;
    style-src ${webview.cspSource} 'unsafe-inline' http://localhost:5174;
    font-src ${webview.cspSource} http://localhost:5174;
    connect-src ${webview.cspSource} https: http: ws://localhost:5174;
  ">
  <title>MVP Canvas</title>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}">
    // Pass VS Code API to the React app
    window.vscodeApi = acquireVsCodeApi();
  </script>
  <script nonce="${nonce}" type="module" src="http://localhost:5174/src/main.tsx"></script>
</body>
</html>`;
}

function getNonce(): string {
  let text = "";
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return text;
}
