import * as vscode from 'vscode';
import { EasyCodeChatProvider } from '../chat/ChatProvider';


export function registerDebugCommand(
    context: vscode.ExtensionContext,
    provider: EasyCodeChatProvider
) {

    const debugCommand =
        vscode.commands.registerCommand(
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