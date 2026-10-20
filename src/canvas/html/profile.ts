import { createHTMLHostError, HTMLHostErrorCode } from '../../dom/html/diagnostics';

export interface HTMLCanvasMatrix {
    a: number
    b: number
    c: number
    d: number
    e: number
    f: number
    is2D?: boolean
    toString(): string
    toFloat64Array(): unknown
}

/** Validate the native result rather than inferring API compatibility from the OS or UA. */
export function verifyHTMLCanvasMatrix(value: unknown): HTMLCanvasMatrix {
    const matrix = value as HTMLCanvasMatrix;
    const error = createHTMLHostError(HTMLHostErrorCode.CAPABILITY_MISSING,
        'Native HTML backend requires drawElementImage to return a finite 2D DOMMatrix');
    if (!matrix || matrix.is2D === false || typeof matrix.toFloat64Array !== 'function'
        || typeof matrix.toString !== 'function') {
        throw error;
    }
    const components = [matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f];
    for (let i = 0; i < components.length; i++) {
        if (typeof components[i] !== 'number' || !isFinite(components[i])) {
            throw error;
        }
    }
    return matrix;
}
