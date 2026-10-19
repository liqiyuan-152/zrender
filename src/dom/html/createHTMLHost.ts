import { ZRenderType } from '../../zrender';
import { HTMLHost, HTMLHostOptions, HTMLHostLayout } from './types';
import { createHTMLHostError, HTMLHostErrorCode } from './diagnostics';

export interface HTMLHostPainter {
    createHTMLHost(zr: ZRenderType, options: HTMLHostOptions): HTMLHost
}

export function validateHTMLHostLayout(config: HTMLHostLayout) {
    if (!config || typeof config.width !== 'number' || !isFinite(config.width) || config.width < 0
        || (config.height != null && (typeof config.height !== 'number'
            || !isFinite(config.height) || config.height < 0))
        || (config.x != null && (typeof config.x !== 'number' || !isFinite(config.x)))
        || (config.y != null && (typeof config.y !== 'number' || !isFinite(config.y)))) {
        throw createHTMLHostError(HTMLHostErrorCode.INVALID_OPTIONS,
            'HTML host requires a finite non-negative width, optional height and finite position');
    }
    if ('layout' in config) {
        throw createHTMLHostError(HTMLHostErrorCode.UNSUPPORTED_SCENE,
            'Target layout binding is not implemented in M1');
    }
}

/** Creates a renderer-owned stable DOM container, without mounting application content. */
export function createHTMLHost(zr: ZRenderType, options: HTMLHostOptions): HTMLHost {
    validateHTMLHostLayout(options);
    const order = [options.zlevel, options.z, options.z2];
    for (let i = 0; i < order.length; i++) {
        if (order[i] != null && (typeof order[i] !== 'number' || !isFinite(order[i]))) {
            throw createHTMLHostError(HTMLHostErrorCode.INVALID_OPTIONS,
                'HTML host stacking values must be finite numbers');
        }
    }
    const timeout = options.initializationTimeoutMs;
    if (timeout != null && (typeof timeout !== 'number' || !isFinite(timeout) || timeout <= 0)) {
        throw createHTMLHostError(HTMLHostErrorCode.INVALID_OPTIONS,
            'initializationTimeoutMs must be a finite positive number');
    }
    const painter = zr && zr.painter as typeof zr.painter & Partial<HTMLHostPainter>;
    if (!painter || !painter.createHTMLHost) {
        throw createHTMLHostError(HTMLHostErrorCode.CAPABILITY_MISSING,
            'The current renderer has no validated HTML host backend');
    }
    return painter.createHTMLHost(zr, options);
}
