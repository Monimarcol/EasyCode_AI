import { EasyCodeChatProvider } from './chat/ChatProvider';
import * as vscode from 'vscode';
import { EasyCodeActionProvider } from './providers/CodeActionProvider';
import { registerDebugCommand } from './commands/DebugCommand';

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

    registerDebugCommand(
    context,
    provider
   );
}

export function deactivate() {}