export interface TextChange {
    original: string;
    corrected: string;
    reason: string;
    position: {
        start: number;
        end: number;
    };
}