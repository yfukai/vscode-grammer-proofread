import * as vscode from 'vscode';

export class CorrectionButtonProvider {
    
    static createQuickPickItems(): vscode.QuickPickItem[] {
        return [
            {
                label: '$(check) Grammar',
                description: 'Correct grammatical errors',
                detail: 'Fix grammar, punctuation, and sentence structure'
            },
            {
                label: '$(paintcan) Style',
                description: 'Improve writing style',
                detail: 'Enhance word choice, flow, and readability'
            },
            {
                label: '$(lightbulb) Clarity',
                description: 'Improve clarity',
                detail: 'Simplify complex sentences and remove ambiguity'
            },
            {
                label: '$(comment) Tone',
                description: 'Adjust tone',
                detail: 'Ensure appropriate and consistent tone'
            },
            {
                label: '$(edit) Custom',
                description: 'Custom correction',
                detail: 'Provide your own correction instructions'
            }
        ];
    }

    static async showCorrectionPicker(): Promise<string | undefined> {
        const items = this.createQuickPickItems();
        
        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select the type of correction to apply',
            matchOnDescription: true,
            matchOnDetail: true
        });

        if (selected) {
            // Extract the command from the label
            const label = selected.label.toLowerCase();
            if (label.includes('grammar')) {
                return 'grammarProofreading.correctGrammar';
            } else if (label.includes('style')) {
                return 'grammarProofreading.correctStyle';
            } else if (label.includes('clarity')) {
                return 'grammarProofreading.correctClarity';
            } else if (label.includes('tone')) {
                return 'grammarProofreading.correctTone';
            } else if (label.includes('custom')) {
                return 'grammarProofreading.correctCustom';
            }
        }

        return undefined;
    }
}