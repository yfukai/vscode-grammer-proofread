import { TextChange } from './TextChange';

export interface CorrectionResponse {
    correctedText: string;
    explanation: string;
    changes: TextChange[];
    confidence: number;
}