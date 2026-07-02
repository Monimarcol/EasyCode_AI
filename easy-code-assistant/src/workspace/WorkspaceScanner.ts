import * as vscode from 'vscode';

export async function getWorkspaceSummary(): Promise<string> {
    const workspaceFolders = vscode.workspace.workspaceFolders;

    if (!workspaceFolders || workspaceFolders.length === 0) {
        return "No workspace folder found.";
    }

    const files = await vscode.workspace.findFiles(
        '**/*.{py,ts,tsx,js,jsx,json,md}',
        '**/{node_modules,dist,venv,.venv,__pycache__,.git}/**',
        50
    );

    const fileList = files
        .map(file => vscode.workspace.asRelativePath(file))
        .join('\n');

    return `
WORKSPACE FILES:
${fileList}
`.trim();
}