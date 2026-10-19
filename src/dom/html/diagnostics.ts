export enum HTMLHostErrorCode {
    CAPABILITY_MISSING = 'HTML_CAPABILITY_MISSING',
    CYCLIC_DEPENDENCY = 'HTML_CYCLIC_DEPENDENCY',
    INVALID_TARGET = 'HTML_INVALID_TARGET',
    INVALID_OPTIONS = 'HTML_INVALID_OPTIONS',
    UNSUPPORTED_EXPORT = 'UNSUPPORTED_EXPORT',
    LAYOUT_COMPUTATION_FAILED = 'HTML_LAYOUT_COMPUTATION_FAILED',
    UNSUPPORTED_LAYER_MIGRATION = 'HTML_UNSUPPORTED_LAYER_MIGRATION',
    UNSUPPORTED_SCENE = 'HTML_UNSUPPORTED_SCENE',
    INITIALIZATION_FAILED = 'HTML_INITIALIZATION_FAILED',
    INITIALIZATION_TIMEOUT = 'HTML_INITIALIZATION_TIMEOUT',
    DISPOSED = 'HTML_DISPOSED',
    RENDER_FAILED = 'HTML_RENDER_FAILED'
}

export interface HTMLHostErrorContext {
    targetId?: string | number
    hostId?: string | number
    failedOperation?: string
    [key: string]: unknown
}

export interface HTMLHostError extends Error {
    code: HTMLHostErrorCode
    context?: HTMLHostErrorContext
}

// Return a native Error rather than subclassing it: Error subclassing needs
// prototype repair on the project's ES3 target.
export function createHTMLHostError(
    code: HTMLHostErrorCode,
    message: string,
    context?: HTMLHostErrorContext
): HTMLHostError {
    const error = new Error('[' + code + '] ' + message) as HTMLHostError;
    error.name = 'HTMLHostError';
    error.code = code;
    error.context = context;
    return error;
}
