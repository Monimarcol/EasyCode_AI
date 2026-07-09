
import * as vscode from 'vscode';
import { isUserProjectFile } from './WorkspaceClassifier';

export interface CodeChunk {
    file: string;
    symbol: string;
    type: "function" | "class" | "file";
    content: string;
    startLine: number;
    endLine: number;
}

export function chunkCodeFile(
    filePath: string,
    content: string
): CodeChunk[] {

    const lines = content.split("\n");
    const chunks: CodeChunk[] = [];

    let currentChunkStart = 0;
    let currentSymbol = "file";
    let currentType: CodeChunk["type"] = "file";

    function pushChunk(endLine: number) {

        const chunkLines =
            lines.slice(currentChunkStart, endLine);

        const chunkContent =
            chunkLines.join("\n").trim();

        if (!chunkContent) {
            return;
        }

        chunks.push({
            file: filePath,
            symbol: currentSymbol,
            type: currentType,
            content: chunkContent,
            startLine: currentChunkStart + 1,
            endLine
        });
    }

    for (let i = 0; i < lines.length; i++) {

        const trimmed = lines[i].trim();

        const pythonFunction =
            trimmed.match(/^def\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/);

        const pythonClass =
            trimmed.match(/^class\s+([A-Za-z_][A-Za-z0-9_]*)/);

        const tsFunction =
            trimmed.match(/function\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/);

        const tsClass =
            trimmed.match(/class\s+([A-Za-z_][A-Za-z0-9_]*)/);

        const matchedSymbol =
            pythonFunction?.[1] ||
            pythonClass?.[1] ||
            tsFunction?.[1] ||
            tsClass?.[1];

        if (matchedSymbol && i !== currentChunkStart) {

            pushChunk(i);

            currentChunkStart = i;
            currentSymbol = matchedSymbol;
            currentType =
                pythonClass || tsClass
                    ? "class"
                    : "function";
        }
        else if (matchedSymbol) {

            currentSymbol = matchedSymbol;
            currentType =
                pythonClass || tsClass
                    ? "class"
                    : "function";
        }
    }

    pushChunk(lines.length);

    return chunks;
}


export async function buildCodeChunkIndex(): Promise<CodeChunk[]> {

    const files =
        await vscode.workspace.findFiles(
            '**/*.{py,ts,js}',
            '**/{node_modules,dist,venv,.venv,__pycache__,.git,.vscode}/**',
            100
        );

    const allChunks: CodeChunk[] = [];

    for (const file of files) {

        const document =
            await vscode.workspace.openTextDocument(file);

        const relativePath =
            vscode.workspace.asRelativePath(file);

        if (!isUserProjectFile(relativePath)) {
    continue;
}

        const chunks =
            chunkCodeFile(
                relativePath,
                document.getText()
            );

        allChunks.push(...chunks);
    }

    return allChunks;
}

export function searchCodeChunks(
    chunks: CodeChunk[],
    query: string,
    limit: number = 5
): CodeChunk[] {

    const stopWords = new Set([
        "please",
        "debug",
        "this",
        "error",
        "is",
        "not",
        "defined",
        "found",
        "fix",
        "with",
        "chat"
    ]);

    const rawTerms =
    query
        .toLowerCase()
        .replace(/[^a-z0-9_]+/g, " ")
        .split(/\s+/)
        .filter(term =>
            term.length > 2 &&
            !stopWords.has(term)
        );

const expandedTerms =
    rawTerms.flatMap(term => {

        const parts =
            term
                .split("_")
                .filter(Boolean);

        return [
            term,
            ...parts
        ];
    });

const queryTerms =
    [...new Set(expandedTerms)];

    const scored =
        chunks.map(chunk => {

            const searchable =
                `
${chunk.file}
${chunk.symbol}
${chunk.content}
`
                .toLowerCase();

            const score =
                queryTerms.reduce((total, term) => {

                    if (searchable.includes(term)) {

                        return total +
                            (
                                chunk.symbol
                                    .toLowerCase()
                                    .includes(term)
                                    ? 5
                                    : 1
                            );
                    }

                    return total;

                }, 0);

            return {
                chunk,
                score
            };

        });

    return scored
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(item => item.chunk);
}