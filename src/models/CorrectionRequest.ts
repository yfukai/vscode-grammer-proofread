import { CorrectionType } from './CorrectionType';

export interface CorrectionRequest {
    text: string;
    prompt: string;
    correctionType: CorrectionType;
    apiEndpoint: string;
    apiKey: string;
}