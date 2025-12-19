export interface ChatMessage {
    id: string;
    type: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    promptName?: string;
    isSelection?: boolean;
    selectionRange?: {
        start: number;
        end: number;
    };
    actions?: MessageAction[];
}

export interface MessageAction {
    id: string;
    label: string;
    type: 'apply' | 'dismiss' | 'copy';
    data?: any;
}