import { ChatMessage } from './ChatMessage';

export interface ConversationHistory {
    messages: ChatMessage[];
    sessionId: string;
    createdAt: Date;
    lastActivity: Date;
}