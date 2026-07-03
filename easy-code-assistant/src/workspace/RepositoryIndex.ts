import * as vscode from 'vscode';

export interface RepositoryFile {
    path: string;
    contentPreview: string;
}

export async function buildRepositoryIndex(): Promise<RepositoryFile[]> {

    const files =
        await vscode.workspace.findFiles(
            '**/*.{py,ts,tsx,js,jsx,json,md}',
            '**/{node_modules,dist,venv,.venv,__pycache__,.git}/**',
            100
        );

    const index: RepositoryFile[] = [];

    for (const file of files) {

        const document =
            await vscode.workspace.openTextDocument(file);

        const contentPreview =
            document
                .getText()
                .split('\n')
                .slice(0, 80)
                .join('\n');

        index.push({
            path: vscode.workspace.asRelativePath(file),
            contentPreview
        });
    }

    return index;
}

export function searchRepositoryIndex(
    index: RepositoryFile[],
    query: string,
    limit: number = 5
): RepositoryFile[] {

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
        index.map(file => {

            const searchableText =
                `${file.path}\n${file.contentPreview}`.toLowerCase();

            const score =
                queryTerms.reduce((total, term) => {

                    if (searchableText.includes(term)) {

                        return total + (
                            file.path
                                .toLowerCase()
                                .includes(term)
                                ? 3
                                : 1
                        );
                    }

                    return total;

                }, 0);

            return {
                file,
                score
            };
        });

    return scored
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(item => item.file);
}