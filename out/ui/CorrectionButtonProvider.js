"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CorrectionButtonProvider = void 0;
const vscode = __importStar(require("vscode"));
class CorrectionButtonProvider {
    static createQuickPickItems() {
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
    static async showCorrectionPicker() {
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
            }
            else if (label.includes('style')) {
                return 'grammarProofreading.correctStyle';
            }
            else if (label.includes('clarity')) {
                return 'grammarProofreading.correctClarity';
            }
            else if (label.includes('tone')) {
                return 'grammarProofreading.correctTone';
            }
            else if (label.includes('custom')) {
                return 'grammarProofreading.correctCustom';
            }
        }
        return undefined;
    }
}
exports.CorrectionButtonProvider = CorrectionButtonProvider;
//# sourceMappingURL=CorrectionButtonProvider.js.map