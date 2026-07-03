import * as vscode from 'vscode';

export async function getCurrentFileContent(
    document: vscode.TextDocument
): Promise<string> {

    return document.getText();
}

export function extractImports(
    content: string
): string[] {

    const lines = content.split('\n');

    return lines
        .map(line => line.trim())
        .filter(line =>
            line.startsWith('import ') ||
            line.startsWith('from ')
        );
}

export function resolveImportFiles(
    imports: string[]
): string[] {

    const files: string[] = [];

    for (const imp of imports) {

        if (imp.startsWith("from ")) {

            const module =
                imp
                    .split(" ")[1]
                    .trim();

            files.push(`${module}.py`);
        }

        else if (imp.startsWith("import ")) {

            const module =
                imp
                    .replace("import", "")
                    .split("as")[0]
                    .trim();

            files.push(`${module}.py`);
        }
    }

    return [...new Set(files)];
}

export async function findExistingImportFiles(
    candidateFiles: string[]
): Promise<vscode.Uri[]> {

    const foundFiles: vscode.Uri[] = [];

    for (const candidate of candidateFiles) {

        const matches =
            await vscode.workspace.findFiles(
                `**/${candidate}`,
                '**/{node_modules,dist,venv,.venv,__pycache__,.git}/**',
                5
            );

        foundFiles.push(...matches);
    }

    return foundFiles;
}

export async function readRelatedFileContents(
    files: vscode.Uri[]
): Promise<string> {

    const sections: string[] = [];

    for (const file of files) {

        const document =
            await vscode.workspace.openTextDocument(file);

        const relativePath =
            vscode.workspace.asRelativePath(file);

        const content =
            document.getText();

        const limitedContent =
            content
                .split('\n')
                .slice(0, 120)
                .join('\n');

        sections.push(`
RELATED FILE:
${relativePath}

CONTENT:
${limitedContent}
`.trim());
    }

    return sections.join('\n\n==============================\n\n');
}

export async function getRelatedContext(
    document: vscode.TextDocument
): Promise<string> {

    const currentFileContent =
        await getCurrentFileContent(document);

    const imports =
        extractImports(currentFileContent);

    const candidateFiles =
        resolveImportFiles(imports);

    const existingFiles =
        await findExistingImportFiles(candidateFiles);

    if (existingFiles.length === 0) {
        return "No related project files found.";
    }

    return await readRelatedFileContents(existingFiles);
}