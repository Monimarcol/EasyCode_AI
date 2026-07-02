
import * as vscode from 'vscode';

export class EasyCodeActionProvider implements vscode.CodeActionProvider {

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