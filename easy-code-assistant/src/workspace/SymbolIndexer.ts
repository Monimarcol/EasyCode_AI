import * as vscode from 'vscode';

export interface SymbolInfo {
    name: string;
    type: "function" | "class" | "variable";
    file: string;
}

export async function buildSymbolIndex(): Promise<SymbolInfo[]> {

    const files =
        await vscode.workspace.findFiles(
            '**/*.{py,ts,js}',
            '**/{node_modules,dist,venv,.venv,__pycache__,.git,.vscode}/**',
            100
        );

    const symbols: SymbolInfo[] = [];

    for (const file of files) {

        const document =
            await vscode.workspace.openTextDocument(file);

        const relativePath =
            vscode.workspace.asRelativePath(file);

        if (
            relativePath.includes("easy-code-assistant/src/") ||
            relativePath.includes("easy-code-assistant/esbuild.js")
        ) {
            continue;
        }

        const lines =
            document.getText().split('\n');

        for (const line of lines) {

            const trimmed =
                line.trim();

            //
            // Python functions
            //
            const pythonFunction =
                trimmed.match(/^def\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/);

            if (pythonFunction) {

                symbols.push({
                    name: pythonFunction[1],
                    type: "function",
                    file: relativePath
                });

                continue;
            }

            //
            // Python classes
            //
            const pythonClass =
                trimmed.match(/^class\s+([A-Za-z_][A-Za-z0-9_]*)/);

            if (pythonClass) {

                symbols.push({
                    name: pythonClass[1],
                    type: "class",
                    file: relativePath
                });

                continue;
            }

            //
            // TS/JS functions
            //
            const tsFunction =
                trimmed.match(
                    /function\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/
                );

            if (tsFunction) {

                symbols.push({
                    name: tsFunction[1],
                    type: "function",
                    file: relativePath
                });

                continue;
            }

            //
            // TS classes
            //
            const tsClass =
                trimmed.match(
                    /class\s+([A-Za-z_][A-Za-z0-9_]*)/
                );

            if (tsClass) {

                symbols.push({
                    name: tsClass[1],
                    type: "class",
                    file: relativePath
                });

                continue;
            }

        }

    }

    return symbols;
}