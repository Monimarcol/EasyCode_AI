import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    const provider = new EasyCodeChatProvider(context.extensionUri);

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            'easy-code-assistant.chatView',
            provider
        )
    );

    context.subscriptions.push(
        vscode.languages.registerCodeActionsProvider(
            [{ language: 'python' }, { language: 'typescript' }],
            new EasyCodeActionProvider()
        )
    );

    const debugCommand = vscode.commands.registerCommand(
        'easy-code-assistant.debugWithChat',
        async (...args: any[]) => {
            await vscode.commands.executeCommand(
                'easy-code-assistant.chatView.focus'
            );

            const editor = vscode.window.activeTextEditor;

            if (!editor) {
                return;
            }

            // Get latest diagnostics directly from VS Code
            const diagnostics = vscode.languages.getDiagnostics(
                editor.document.uri
            );

            const error = diagnostics.find(
                d => d.severity === vscode.DiagnosticSeverity.Error || 
                    d.severity === vscode.DiagnosticSeverity.Warning
            );

            const errorMessage =
                error?.message ||
                (typeof args[2] === 'string'
                    ? args[2]
                    : 'Unknown Error');

            console.log('================================');
            console.log('DEBUG REQUEST');
            console.log('Error Message:', errorMessage);
            console.log('Diagnostics:', diagnostics);
            console.log('================================');

            const line =
                error?.range.start.line ?? 0;

            const start =
                Math.max(0, line - 10);

            const end =
                Math.min(
                    editor.document.lineCount - 1,
                    line + 10
                );

            const snippet =
                editor.document.getText(
                    new vscode.Range(
                        start,
                        0,
                        end,
                        editor.document.lineAt(end).text.length
                    )
                );

            provider.sendContextToChat(
                snippet,
                errorMessage
            );
        }
    );

    context.subscriptions.push(debugCommand);
}

class EasyCodeActionProvider implements vscode.CodeActionProvider {

    static readonly providedCodeActionKinds = [
        vscode.CodeActionKind.QuickFix
    ];

    provideCodeActions(
        doc: vscode.TextDocument,
        range: vscode.Range,
        context: vscode.CodeActionContext
    ): vscode.CodeAction[] {

        const error = context.diagnostics.find(
            d => d.severity === vscode.DiagnosticSeverity.Error || 
                d.severity === vscode.DiagnosticSeverity.Warning
        );
        if (!error) {
            return [];
        }

        const action = new vscode.CodeAction(
            '💡 Debug with Chat',
            vscode.CodeActionKind.QuickFix
        );

        action.isPreferred = true;

        action.command = {
            command: 'easy-code-assistant.debugWithChat',
            title: 'Debug with Chat',
            arguments: [doc, range, error.message]
        };

        return [action];
    }
}

class EasyCodeChatProvider implements vscode.WebviewViewProvider {

    private _view?: vscode.WebviewView;
    private _pendingMessage?: {
        code: string;
        error: string;
    };

    constructor(
        private readonly _uri: vscode.Uri
    ) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView
    ) {

        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true
        };

        const htmlPath = path.join(
            this._uri.fsPath,
            'webview',
            'chat.html'
        );

        webviewView.webview.html =
            fs.readFileSync(htmlPath, 'utf8');

        if (this._pendingMessage) {

            this.sendContextToChat(
                this._pendingMessage.code,
                this._pendingMessage.error
            );

            this._pendingMessage = undefined;
        }

        webviewView.webview.onDidReceiveMessage(
            async (msg) => {

                if (msg.type === 'sendMessage') {

                    console.log("================================");
                    console.log("SEND MESSAGE");
                    console.log("TEXT:", msg.text);
                    console.log("DEBUG MODE:", msg.isDebugMode);
                    console.log("CODE LENGTH:", msg.codeContext?.length);
                    console.log("================================");

                    try {

                        const editor =
                            vscode.window.activeTextEditor;

                        const document = editor?.document;

                        let liveCode = "";

                        if (document) {

                            const selection =
                                editor.selection.active.line;

                            const start =
                                Math.max(0, selection - 10);

                            const end =
                                Math.min(
                                    document.lineCount - 1,
                                    selection + 10
                                );

                            liveCode =
                                document.getText(
                                    new vscode.Range(
                                        start,
                                        0,
                                        end,
                                        document.lineAt(end).text.length
                                    )
                                );
                        }

                        const patchKeywords = [
                            'replace',
                            'change',
                            'rename',
                            'remove',
                            'delete',
                            'insert',
                            'add',
                            'fix',
                            'modify'
                        ];

                        const isPatchRequest =
                            msg.isDebugMode ||
                            patchKeywords.some(keyword =>
                                msg.text.toLowerCase().includes(keyword)
                            );

                        const endpoint =
                            isPatchRequest
                                ? 'http://127.0.0.1:8000/fix'
                                : 'http://127.0.0.1:8000/chat';

                        const requestBody =
                            isPatchRequest
                                ? {
                                    code_context: msg.codeContext || liveCode,
                                    error_message: msg.text
                                }
                                : {
                                    code_context: msg.codeContext || liveCode,
                                    message: msg.text
                                };

                        console.log("ENDPOINT:", endpoint);
                        console.log(
                            "PATCH REQUEST:",
                            isPatchRequest
                        );
                        console.log("REQUEST:");
                        console.log(requestBody);

                        const response = await fetch(
                            endpoint,
                            {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify(
                                    requestBody
                                )
                            }
                        );

                        if (
                            !response.ok ||
                            !response.body
                        ) {
                            throw new Error(
                                'Server connection failed'
                            );
                        }

                        const reader =
                            response.body.getReader();

                        const decoder =
                            new TextDecoder('utf-8');

                        let fullResponse = "";

                        while (true) {

                            const {
                                done,
                                value
                            } = await reader.read();

                            if (done) {
                                break;
                            }

                            const chunk =
                                decoder.decode(
                                    value,
                                    { stream: true }
                                );

                            fullResponse += chunk;

                            this._view?.webview.postMessage({
                                type: 'streamToken',
                                token: chunk
                            });
                        }

                        console.log("========== FULL RESPONSE ==========");
                        console.log(fullResponse);
                        console.log("===================================");

                        this._view?.webview.postMessage({
                            type: 'streamDone'
                        });

                    }
                    catch (err: any) {

                        this._view?.webview.postMessage({
                            type: 'streamToken',
                            token:
                                `\n\n❌ Connection Error: ${err.message}`
                        });

                        this._view?.webview.postMessage({
                            type: 'streamDone'
                        });
                    }
                }

                else if (msg.type === 'applyPatch') {

    console.log("================================");
    console.log("PATCH RECEIVED");
    console.log(JSON.stringify(msg.patch, null, 2));
    console.log("================================");

    const editor =
        vscode.window.activeTextEditor;

    if (!editor) {

        vscode.window.showErrorMessage(
            'No active editor found.'
        );

        return;
    }

    const patch = msg.patch;

    if (
        !patch ||
        !Array.isArray(patch.changes)
    ) {

        vscode.window.showErrorMessage(
            'Invalid patch received.'
        );

        return;
    }


    const originalText =
    editor.document.getText();

    let documentText =
        originalText;

    let changedCount = 0;

    for (const change of patch.changes) {

        try {

            if (change.type === 'replace') {

                const oldText = change.old || "";
const newText = change.new || "";

let searchText = oldText;

// Try exact match first
if (!documentText.includes(searchText)) {

    searchText = oldText.trim();

}

// Still not found?
if (!documentText.includes(searchText)) {

    console.log(
        "REPLACE FAILED - old text not found"
    );

    continue;

}

const occurrences =
    documentText.split(searchText).length - 1;

if (occurrences > 1) {

    vscode.window.showWarningMessage(
        "Multiple matches found. Applying first occurrence."
    );

}

documentText =
    documentText.replace(
        searchText,
        newText
    );

changedCount++;
            }

            else if (change.type === "insert_after") {

    const anchor = change.old || "";
    const content = change.new || "";

    let searchText = anchor;

    // Try exact match first
    if (!documentText.includes(searchText)) {
        searchText = anchor.trim();
    }

    // Still not found
    if (!documentText.includes(searchText)) {

        console.log(
            "INSERT_AFTER FAILED - anchor not found"
        );

        continue;
    }

    const index =
        documentText.indexOf(searchText);

    documentText =
        documentText.slice(
            0,
            index + searchText.length
        ) +
        content +
        documentText.slice(
            index + searchText.length
        );

    changedCount++;
}

            else if (change.type === "insert_before") {

    const anchor = change.old || "";
    const content = change.new || "";

    let searchText = anchor;

    // Try exact match first
    if (!documentText.includes(searchText)) {
        searchText = anchor.trim();
    }

    // Still not found
    if (!documentText.includes(searchText)) {

        console.log(
            "INSERT_BEFORE FAILED - anchor not found"
        );

        continue;
    }

    const index =
        documentText.indexOf(searchText);

    documentText =
        documentText.slice(0, index) +
        content +
        documentText.slice(index);

    changedCount++;
}

            else if (
                change.type === 'delete'
            ) {

                const oldText =
                    change.old || '';

                if (
                    !oldText ||
                    !documentText.includes(oldText)
                ) {

                    console.log(
                        'DELETE FAILED - text not found'
                    );

                    continue;
                }

                documentText =
                    documentText.replace(
                        oldText,
                        ''
                    );

                changedCount++;
            }

        } catch (err) {

            console.error(
                'Patch operation failed:',
                err
            );
        }
    }

    if (changedCount === 0) {

        vscode.window.showWarningMessage(
            'No matching code found for patch.'
        );

        return;
    }

    // ========================================
// DIFF PREVIEW
// ========================================

const originalDoc =
    await vscode.workspace.openTextDocument({
        content: originalText,
        language: editor.document.languageId
    });

const modifiedDoc =
    await vscode.workspace.openTextDocument({
        content: documentText,
        language: editor.document.languageId
    });

await vscode.commands.executeCommand(
    'vscode.diff',
    originalDoc.uri,
    modifiedDoc.uri,
    'AI Suggested Changes'
);

const choice =
    await vscode.window.showInformationMessage(
        `Preview ready. Apply ${changedCount} patch(es)?`,
        'Apply',
        'Cancel'
    );

if (choice !== 'Apply') {
    return;
}



    const edit =
        new vscode.WorkspaceEdit();

    const fullRange =
        new vscode.Range(
            editor.document.positionAt(0),
            editor.document.positionAt(
                editor.document.getText().length
            )
        );

    edit.replace(
        editor.document.uri,
        fullRange,
        documentText
    );

    const success =
        await vscode.workspace.applyEdit(
            edit
        );

    if (success) {

    await editor.document.save();

    await vscode.commands.executeCommand(
        'editor.action.formatDocument'
    );

    await new Promise(resolve =>
        setTimeout(resolve, 1000)
    );

    const diagnostics =
        vscode.languages.getDiagnostics(
            editor.document.uri
    );

    if (diagnostics.length === 0) {

    vscode.window.showInformationMessage(
        `🎉 Error fixed successfully! Applied ${changedCount} patch(es)`
    );

} else {

    vscode.window.showWarningMessage(
        `⚠️ ${diagnostics.length} issue(s) still remain`
    );
}

} else {

        vscode.window.showErrorMessage(
            'Failed to apply patch.'
        );
    }
}
            }
        );
    }

    public sendContextToChat(
        code: string,
        error: string
    ) {

        if (this._view) {

            this._view.webview.postMessage({
                type: 'injectContext',
                code,
                error
            });

        } else {

            this._pendingMessage = {
                code,
                error
            };
        }
    }
}

export function deactivate() {}