import * as vscode from 'vscode';

export async function getWorkspaceSummary(
    currentFileUri?: vscode.Uri
): Promise<string> {

    const workspaceFolders =
        vscode.workspace.workspaceFolders;

    if (!workspaceFolders || workspaceFolders.length === 0) {
        return "No workspace folder found.";
    }

    const rootFolder =
        workspaceFolders[0];

    const files =
        await vscode.workspace.findFiles(
            '**/*.{py,ts,tsx,js,jsx,json,md}',
            '**/{node_modules,dist,venv,.venv,__pycache__,.git}/**',
            80
        );

    const fileList =
        files
            .map(file =>
                vscode.workspace.asRelativePath(file)
            )
            .sort()
            .join('\n');

    const currentFilePath =
        currentFileUri
            ? vscode.workspace.asRelativePath(currentFileUri)
            : 'Unknown';

    const projectType =
        detectProjectType(fileList);

    return `
WORKSPACE ROOT:
${rootFolder.name}

PROJECT TYPE:
${projectType}

CURRENT FILE:
${currentFilePath}

WORKSPACE FILES:
${fileList}
`.trim();
}

function detectProjectType(fileList: string): string {

    const hasPython =
        fileList.includes("app.py") ||
        fileList.includes("requirements.txt") ||
        fileList.includes("pyproject.toml");

    const hasNode =
        fileList.includes("package.json");

    if (hasPython && hasNode) {
        return "Hybrid Python Flask + VS Code Extension project";
    }

    if (hasPython) {
        return "Python / Flask project";
    }

    if (hasNode) {
        return "Node.js / TypeScript / JavaScript project";
    }

    return "Unknown project type";
}