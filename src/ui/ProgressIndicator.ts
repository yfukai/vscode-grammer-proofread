import * as vscode from 'vscode';

export class ProgressIndicator {
    
    static async withProgress<T>(
        title: string,
        task: (progress: vscode.Progress<{ increment?: number; message?: string }>) => Promise<T>
    ): Promise<T> {
        return vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: title,
            cancellable: false
        }, task);
    }

    static async withProgressInStatusBar<T>(
        title: string,
        task: (progress: vscode.Progress<{ increment?: number; message?: string }>) => Promise<T>
    ): Promise<T> {
        return vscode.window.withProgress({
            location: vscode.ProgressLocation.Window,
            title: title,
            cancellable: false
        }, task);
    }

    static async showProgressNotification(
        title: string,
        steps: Array<{ message: string; work: () => Promise<void> }>
    ): Promise<void> {
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: title,
            cancellable: false
        }, async (progress) => {
            const increment = 100 / steps.length;
            
            for (let i = 0; i < steps.length; i++) {
                const step = steps[i];
                progress.report({ 
                    increment: i === 0 ? 0 : increment, 
                    message: step.message 
                });
                
                await step.work();
            }
            
            progress.report({ increment: increment, message: 'Complete!' });
        });
    }
}