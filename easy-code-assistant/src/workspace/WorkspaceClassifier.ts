export function isExtensionInternalFile(
    relativePath: string
): boolean {

    return (
        relativePath === "app.py" ||
        relativePath === "requirements.txt" ||
        relativePath.startsWith("easy-code-assistant/src/") ||
        relativePath.startsWith("easy-code-assistant/.vscode/") ||
        relativePath.includes("node_modules/") ||
        relativePath.includes("dist/")
    );
}

export function isUserProjectFile(
    relativePath: string
): boolean {

    return !isExtensionInternalFile(relativePath);
}