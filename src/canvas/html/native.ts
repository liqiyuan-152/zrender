import { createHTMLHostError, HTMLHostErrorCode } from '../../dom/html/diagnostics';
import { ZRCanvasRenderingContext } from '../../core/types';
import { verifyHTMLCanvasProfile } from './profile';

interface LegacyMatrix {
    a: number
    b: number
    c: number
    d: number
    toString(): string
    toFloat64Array(): unknown
}
interface LegacyContext extends CanvasRenderingContext2D {
    drawElementImage(element: HTMLElement, x: number, y: number): LegacyMatrix
}
interface LegacyCanvas extends HTMLCanvasElement {
    requestPaint(): void
    clearElementGeometry(element: HTMLElement): void
    updateElementGeometry(element: HTMLElement, options: { canvasTransform: LegacyMatrix }): void
}
const canvasOwners: { canvas: HTMLCanvasElement; count: number; hadAttribute: boolean }[] = [];

function own(canvas: HTMLCanvasElement, delta: number) {
    for (let i = 0; i < canvasOwners.length; i++) {
        const entry = canvasOwners[i];
        if (entry.canvas === canvas) {
            entry.count += delta;
            if (!entry.count) {
                if (!entry.hadAttribute) {
                    canvas.removeAttribute('layoutsubtree');
                }
                canvasOwners.splice(i, 1);
            }
            return;
        }
    }
    if (delta > 0) {
        canvasOwners.push({ canvas, count: 1, hadAttribute: canvas.hasAttribute('layoutsubtree') });
        canvas.setAttribute('layoutsubtree', '');
    }
}

/** Explicit adapter for the independently tested legacy matrix-returning profile. */
export class NativeHTMLCanvas {
    snapshotReady = false
    private _canvas: LegacyCanvas
    private _element: HTMLElement
    private _probe: HTMLElement
    private _paint: () => void
    private _disposed = false
    private _visible = false

    constructor(canvas: HTMLCanvasElement, element: HTMLElement) {
        this._canvas = canvas as LegacyCanvas;
        this._element = element;
        element.setAttribute('drawable', '');
        element.style.transformOrigin = '0 0';
        own(canvas, 1);
    }

    start(ready: () => void, painted: () => void, failed: (error: unknown) => void) {
        const canvas = this._canvas;
        const probe = this._probe = canvas.ownerDocument.createElement('div');
        probe.setAttribute('drawable', '');
        probe.setAttribute('inert', '');
        probe.style.cssText = 'width:1px;height:1px;background:green;transform-origin:0 0';
        this._paint = () => {
            if (this._disposed) {
                return;
            }
            try {
                if (this._probe) {
                    const ctx = canvas.getContext('2d') as LegacyContext;
                    ctx.save();
                    try {
                        ctx.setTransform(1, 0, 0, 1, 0, 0);
                        const matrix = ctx.drawElementImage(probe, -2, -2);
                        if (!matrix || typeof matrix.toFloat64Array !== 'function') {
                            throw createHTMLHostError(HTMLHostErrorCode.CAPABILITY_MISSING,
                                'Native HTML backend requires the verified matrix-returning legacy interface');
                        }
                        probe.style.transform = matrix.toString();
                        canvas.updateElementGeometry(probe, { canvasTransform: matrix });
                    }
                    finally {
                        ctx.restore();
                    }
                    canvas.clearElementGeometry(probe);
                    probe.parentNode.removeChild(probe);
                    this._probe = null;
                    verifyHTMLCanvasProfile(canvas.ownerDocument.defaultView.navigator).then(() => {
                        if (!this._disposed) {
                            ready();
                        }
                    }).catch(failed);
                    return;
                }
                if (this._visible) {
                    this.snapshotReady = true;
                    painted();
                }
            }
            catch (error) {
                failed(error);
            }
        };
        canvas.addEventListener('paint', this._paint);
        canvas.appendChild(probe);
        canvas.requestPaint();
    }

    setVisible(visible: boolean) {
        if (this._visible !== visible) {
            this._visible = visible;
            this.invalidate();
        }
    }

    invalidate() {
        this.snapshotReady = false;
        this.clear();
        if (!this._disposed && this._visible) {
            this._canvas.requestPaint();
        }
    }

    clear() {
        if (!this._disposed) {
            this._canvas.clearElementGeometry(this._element);
        }
    }

    draw(ctx: CanvasRenderingContext2D) {
        if (this._disposed || !this._visible || !this.snapshotReady) {
            return;
        }
        // The tested legacy API supplies backing-store pixels for the snapshot.
        // Cancel only the CTM's DPR scale; its translation is already in backing
        // coordinates. The returned matrix then has logical CSS linear terms.
        const dpr = (ctx as ZRCanvasRenderingContext).dpr || 1;
        let matrix: LegacyMatrix;
        ctx.save();
        try {
            ctx.scale(1 / dpr, 1 / dpr);
            matrix = (ctx as LegacyContext).drawElementImage(this._element, 0, 0);
        }
        finally {
            ctx.restore();
        }
        const transform = matrix.toString();
        if (this._element.style.transform !== transform) {
            this._element.style.transform = transform;
        }
        this._canvas.updateElementGeometry(this._element, { canvasTransform: matrix });
    }

    dispose() {
        if (this._disposed) {
            return;
        }
        this.clear();
        this._disposed = true;
        this._canvas.removeEventListener('paint', this._paint);
        if (this._probe && this._probe.parentNode) {
            this._probe.parentNode.removeChild(this._probe);
        }
        this._probe = null;
        own(this._canvas, -1);
        this._paint = null;
        this._element = null;
        this._canvas = null;
        this.snapshotReady = false;
    }
}
