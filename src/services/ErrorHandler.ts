import * as vscode from 'vscode';

/**
 * Error categories for different types of failures
 */
export enum ErrorCategory {
    VALIDATION = 'validation',
    API = 'api',
    SYSTEM = 'system',
    USER = 'user'
}

/**
 * Structured error information
 */
export interface ErrorInfo {
    category: ErrorCategory;
    message: string;
    details?: string;
    suggestion?: string;
    retryable?: boolean;
}

/**
 * Centralized error handling and user feedback system
 */
export class ErrorHandler {
    private outputChannel: vscode.OutputChannel;
    private notificationHistory: Map<string, number> = new Map();
    private readonly MAX_NOTIFICATIONS_PER_MINUTE = 3;

    constructor(outputChannel: vscode.OutputChannel) {
        this.outputChannel = outputChannel;
    }

    /**
     * Handles an error and provides appropriate user feedback
     */
    public handleError(error: Error | ErrorInfo, context?: string): void {
        const errorInfo = this.normalizeError(error);
        const timestamp = new Date().toISOString();
        
        // Log to output channel
        this.logError(errorInfo, context, timestamp);
        
        // Show user notification if appropriate
        this.showUserNotification(errorInfo, context);
    }

    /**
     * Handles validation errors with specific formatting
     */
    public handleValidationError(message: string, field?: string): void {
        const errorInfo: ErrorInfo = {
            category: ErrorCategory.VALIDATION,
            message,
            details: field ? `Field: ${field}` : undefined,
            suggestion: 'Please check your input and try again.',
            retryable: true
        };
        
        this.handleError(errorInfo, 'Validation');
    }

    /**
     * Handles API errors with retry suggestions
     */
    public handleApiError(error: Error, endpoint?: string): void {
        const errorInfo: ErrorInfo = {
            category: ErrorCategory.API,
            message: this.extractApiErrorMessage(error),
            details: endpoint ? `Endpoint: ${endpoint}` : undefined,
            suggestion: this.getApiErrorSuggestion(error),
            retryable: this.isRetryableApiError(error)
        };
        
        this.handleError(errorInfo, 'API Request');
    }

    /**
     * Handles system errors (file I/O, configuration, etc.)
     */
    public handleSystemError(error: Error, operation?: string): void {
        const errorInfo: ErrorInfo = {
            category: ErrorCategory.SYSTEM,
            message: error.message,
            details: operation ? `Operation: ${operation}` : undefined,
            suggestion: 'Please check your system configuration and try again.',
            retryable: false
        };
        
        this.handleError(errorInfo, 'System');
    }

    /**
     * Handles user errors (no selection, invalid input, etc.)
     */
    public handleUserError(message: string, suggestion?: string): void {
        const errorInfo: ErrorInfo = {
            category: ErrorCategory.USER,
            message,
            suggestion: suggestion || 'Please check the requirements and try again.',
            retryable: true
        };
        
        this.handleError(errorInfo, 'User Action');
    }

    /**
     * Shows success feedback to the user
     */
    public showSuccess(message: string, details?: string): void {
        vscode.window.showInformationMessage(message);
        
        if (details) {
            this.outputChannel.appendLine(`[SUCCESS] ${message} - ${details}`);
        } else {
            this.outputChannel.appendLine(`[SUCCESS] ${message}`);
        }
    }

    /**
     * Shows warning feedback to the user
     */
    public showWarning(message: string, details?: string): void {
        vscode.window.showWarningMessage(message);
        
        if (details) {
            this.outputChannel.appendLine(`[WARNING] ${message} - ${details}`);
        } else {
            this.outputChannel.appendLine(`[WARNING] ${message}`);
        }
    }

    /**
     * Shows progress feedback during long operations
     */
    public async withProgress<T>(
        title: string,
        operation: (progress: vscode.Progress<{ increment?: number; message?: string }>) => Promise<T>
    ): Promise<T> {
        return vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title,
            cancellable: false
        }, operation);
    }

    /**
     * Shows progress feedback with cancellation support
     */
    public async withCancellableProgress<T>(
        title: string,
        operation: (
            progress: vscode.Progress<{ increment?: number; message?: string }>,
            token: vscode.CancellationToken
        ) => Promise<T>
    ): Promise<T> {
        return vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title,
            cancellable: true
        }, operation);
    }

    /**
     * Clears the notification history (useful for testing)
     */
    public clearNotificationHistory(): void {
        this.notificationHistory.clear();
    }

    /**
     * Gets error statistics for monitoring
     */
    public getErrorStatistics(): {
        totalNotifications: number;
        notificationsByCategory: Record<ErrorCategory, number>;
    } {
        const totalNotifications = Array.from(this.notificationHistory.values())
            .reduce((sum, count) => sum + count, 0);
        
        // This is a simplified version - in a real implementation,
        // you might want to track more detailed statistics
        return {
            totalNotifications,
            notificationsByCategory: {
                [ErrorCategory.VALIDATION]: 0,
                [ErrorCategory.API]: 0,
                [ErrorCategory.SYSTEM]: 0,
                [ErrorCategory.USER]: 0
            }
        };
    }

    /**
     * Normalizes different error types into ErrorInfo
     */
    private normalizeError(error: Error | ErrorInfo): ErrorInfo {
        if ('category' in error) {
            return error as ErrorInfo;
        }
        
        // Convert Error to ErrorInfo
        return {
            category: ErrorCategory.SYSTEM,
            message: error.message,
            retryable: false
        };
    }

    /**
     * Logs error to output channel with context
     */
    private logError(errorInfo: ErrorInfo, context?: string, timestamp?: string): void {
        const contextStr = context ? ` [${context}]` : '';
        const timeStr = timestamp ? ` ${timestamp}` : '';
        
        this.outputChannel.appendLine(
            `[ERROR${contextStr}]${timeStr} ${errorInfo.category.toUpperCase()}: ${errorInfo.message}`
        );
        
        if (errorInfo.details) {
            this.outputChannel.appendLine(`  Details: ${errorInfo.details}`);
        }
        
        if (errorInfo.suggestion) {
            this.outputChannel.appendLine(`  Suggestion: ${errorInfo.suggestion}`);
        }
    }

    /**
     * Shows user notification with rate limiting
     */
    private showUserNotification(errorInfo: ErrorInfo, context?: string): void {
        // Rate limiting to prevent notification spam
        const key = `${errorInfo.category}-${errorInfo.message}`;
        const now = Date.now();
        const lastShown = this.notificationHistory.get(key) || 0;
        
        if (now - lastShown < 60000) { // 1 minute cooldown
            return;
        }
        
        this.notificationHistory.set(key, now);
        
        // Clean up old entries
        this.cleanupNotificationHistory();
        
        // Format message for user
        let userMessage = errorInfo.message;
        if (context) {
            userMessage = `${context}: ${userMessage}`;
        }
        
        // Show appropriate notification type
        switch (errorInfo.category) {
            case ErrorCategory.VALIDATION:
            case ErrorCategory.USER:
                if (errorInfo.suggestion) {
                    vscode.window.showWarningMessage(`${userMessage}. ${errorInfo.suggestion}`);
                } else {
                    vscode.window.showWarningMessage(userMessage);
                }
                break;
                
            case ErrorCategory.API:
                if (errorInfo.retryable && errorInfo.suggestion) {
                    vscode.window.showErrorMessage(
                        `${userMessage}. ${errorInfo.suggestion}`,
                        'Retry'
                    ).then(selection => {
                        if (selection === 'Retry') {
                            // The caller should handle retry logic
                            this.outputChannel.appendLine('[INFO] User requested retry');
                        }
                    });
                } else {
                    vscode.window.showErrorMessage(userMessage);
                }
                break;
                
            case ErrorCategory.SYSTEM:
                vscode.window.showErrorMessage(
                    `System error: ${userMessage}`,
                    'Show Output'
                ).then(selection => {
                    if (selection === 'Show Output') {
                        this.outputChannel.show();
                    }
                });
                break;
        }
    }

    /**
     * Extracts meaningful error message from API errors
     */
    private extractApiErrorMessage(error: Error): string {
        const message = error.message.toLowerCase();
        
        if (message.includes('network') || message.includes('fetch')) {
            return 'Network connection failed';
        }
        
        if (message.includes('401') || message.includes('unauthorized')) {
            return 'API authentication failed';
        }
        
        if (message.includes('403') || message.includes('forbidden')) {
            return 'API access denied';
        }
        
        if (message.includes('429') || message.includes('rate limit')) {
            return 'API rate limit exceeded';
        }
        
        if (message.includes('500') || message.includes('internal server')) {
            return 'API server error';
        }
        
        if (message.includes('timeout')) {
            return 'API request timed out';
        }
        
        return error.message;
    }

    /**
     * Provides suggestions for API errors
     */
    private getApiErrorSuggestion(error: Error): string {
        const message = error.message.toLowerCase();
        
        if (message.includes('network') || message.includes('fetch')) {
            return 'Check your internet connection and try again.';
        }
        
        if (message.includes('401') || message.includes('unauthorized')) {
            return 'Check your API key in the extension settings.';
        }
        
        if (message.includes('403') || message.includes('forbidden')) {
            return 'Verify your API key has the required permissions.';
        }
        
        if (message.includes('429') || message.includes('rate limit')) {
            return 'Wait a moment before trying again.';
        }
        
        if (message.includes('500') || message.includes('internal server')) {
            return 'The API service is experiencing issues. Try again later.';
        }
        
        if (message.includes('timeout')) {
            return 'The request took too long. Try with shorter text or check your connection.';
        }
        
        return 'Check your API configuration and try again.';
    }

    /**
     * Determines if an API error is retryable
     */
    private isRetryableApiError(error: Error): boolean {
        const message = error.message.toLowerCase();
        
        // Non-retryable errors
        if (message.includes('401') || message.includes('unauthorized') ||
            message.includes('403') || message.includes('forbidden')) {
            return false;
        }
        
        // Retryable errors
        return message.includes('network') || 
               message.includes('timeout') || 
               message.includes('429') || 
               message.includes('500');
    }

    /**
     * Cleans up old notification history entries
     */
    private cleanupNotificationHistory(): void {
        const now = Date.now();
        const cutoff = now - 300000; // 5 minutes
        
        for (const [key, timestamp] of this.notificationHistory.entries()) {
            if (timestamp < cutoff) {
                this.notificationHistory.delete(key);
            }
        }
    }
}