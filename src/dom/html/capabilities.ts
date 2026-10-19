import { HTMLCanvasAPICandidate, HTMLCanvasFeatureSurface,
    HTMLCanvasContextFeatureSurface } from '../../canvas/html/types';

export type HTMLCanvasFeature = 'drawElementImage' | 'paint' | 'inert';

export interface HTMLCanvasSupportResult {
    featuresPresent: boolean
    reason?: string
    missingCapabilities: string[]
    features: HTMLCanvasFeature[]
    candidate: HTMLCanvasAPICandidate
    userAgent?: string
}

/** Feature presence only: does not certify signatures, snapshots or hit geometry. */
export function checkHTMLCanvasSupport(doc?: Document): HTMLCanvasSupportResult {
    doc = doc || (typeof document !== 'undefined' ? document : null);
    const result: HTMLCanvasSupportResult = {
        featuresPresent: false,
        missingCapabilities: [],
        features: [],
        candidate: 'unknown'
    };
    const missing = result.missingCapabilities;
    if (!doc || !doc.createElement) {
        missing.push('DOM');
    }
    else {
        // Use the supplied document's realm, not the global window's prototypes.
        const canvas = doc.createElement('canvas');
        const surface = canvas as HTMLCanvasElement & HTMLCanvasFeatureSurface;
        const element = doc.createElement('div');
        let context: CanvasRenderingContext2D & HTMLCanvasContextFeatureSurface;
        try {
            context = canvas.getContext('2d');
        }
        catch (e) {
            // Disabled/unavailable contexts are an ordinary negative result.
        }
        if (context && typeof context.drawElementImage === 'function') {
            result.features.push('drawElementImage');
        }
        else {
            missing.push('drawElementImage');
        }
        if ('onpaint' in surface && typeof surface.requestPaint === 'function') {
            result.features.push('paint');
        }
        else {
            missing.push('paint/requestPaint');
        }
        if ('inert' in element) {
            result.features.push('inert');
        }
        else {
            missing.push('inert');
        }
        if ('content' in surface) {
            result.candidate = 'drawable';
        }
        else if ('layoutSubtree' in surface) {
            result.candidate = 'layout-subtree';
        }
        else {
            missing.push('content/layoutSubtree');
        }
        if (typeof surface.clearElementGeometry !== 'function') {
            missing.push('clearElementGeometry');
        }
        if (typeof surface.updateElementGeometry !== 'function') {
            missing.push('updateElementGeometry');
        }
        const view = doc.defaultView;
        result.userAgent = view && view.navigator && view.navigator.userAgent;
    }
    result.featuresPresent = missing.length === 0;
    if (!result.featuresPresent) {
        result.reason = 'Missing HTML canvas features: ' + missing.join(', ');
    }
    return result;
}
