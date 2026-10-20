import { createHTMLHostError, HTMLHostErrorCode } from './diagnostics';
import { markHTMLHost } from './events';

interface SizeObserver {
    observe(target: Element, options?: { box: string }): void
    disconnect(): void
}

interface SizeEntry {
    target: Element
    contentRect: { height: number }
    borderBoxSize?: ObservedSize | ObservedSize[]
}

interface ObservedSize {
    blockSize: number
    inlineSize?: number
}

interface SizeObserverConstructor {
    new(callback: (entries: SizeEntry[]) => void): SizeObserver
}

export interface HTMLHostLifecycleOptions {
    width: number
    height?: number
    onResize?: (width: number, height: number) => void
    onInvalidate?: () => void
}

export interface HTMLHostLifecycle {
    readonly element: HTMLElement
    readonly width: number
    readonly height: number
    readonly attached: boolean
    readonly disposed: boolean
    attach(): void
    detach(): void
    setVisible(visible: boolean): void
    setSize(width: number, height?: number): void
    dispose(): void
}

interface MutableHTMLHostLifecycle extends HTMLHostLifecycle {
    width: number
    height: number
    attached: boolean
    disposed: boolean
}

function validateSize(width: number, height?: number) {
    if (typeof width !== 'number' || !isFinite(width) || width < 0
        || (height != null && (typeof height !== 'number' || !isFinite(height) || height < 0))) {
        throw createHTMLHostError(HTMLHostErrorCode.INVALID_OPTIONS,
            'HTML host dimensions must be finite non-negative numbers', { failedOperation: 'setSize' });
    }
}

/**
 * Renderer-neutral ownership only. The backend supplies the legal DOM parent.
 * This does not create a Canvas/SVG backend or certify native painting support.
 */
export function createHTMLHostLifecycle(
    parent: HTMLElement,
    options: HTMLHostLifecycleOptions
): HTMLHostLifecycle {
    validateSize(options.width, options.height);
    const doc = parent.ownerDocument;
    const element = doc.createElement('div');
    markHTMLHost(element, true);
    if (!('inert' in element)) {
        throw createHTMLHostError(HTMLHostErrorCode.CAPABILITY_MISSING,
            'Native inert is required for HTML hosts', { failedOperation: 'create', missingCapabilities: ['inert'] });
    }
    const view = doc.defaultView;
    const Observer = view && (view as unknown as { ResizeObserver?: SizeObserverConstructor }).ResizeObserver;
    if (options.height == null && !Observer) {
        throw createHTMLHostError(HTMLHostErrorCode.CAPABILITY_MISSING,
            'ResizeObserver is required for automatic HTML height', { failedOperation: 'create' });
    }
    let observer: SizeObserver;
    let generation = 0;
    let visible = true;
    let explicitHeight = options.height;
    // Detached auto-height content has no valid layout measurement yet.
    let width = options.width;
    let height = explicitHeight == null ? 0 : explicitHeight;
    let attached = false;
    let disposed = false;
    element.style.boxSizing = 'border-box';
    element.style.width = width + 'px';
    element.style.height = explicitHeight == null ? 'auto' : height + 'px';

    function invalidate() {
        if (!disposed && attached && options.onInvalidate) {
            options.onInvalidate();
        }
    }

    function syncInteraction() {
        lifecycle.width = width;
        lifecycle.height = height;
        lifecycle.attached = attached;
        lifecycle.disposed = disposed;
        const active = !disposed && attached && visible && width > 0 && height > 0;
        if (active) {
            element.removeAttribute('inert');
            element.style.visibility = '';
        }
        else {
            element.setAttribute('inert', '');
            element.style.visibility = 'hidden';
            const focused = doc.activeElement as HTMLElement;
            if (focused && element.contains(focused) && focused.blur) {
                focused.blur();
            }
        }
    }

    function notifyResize() {
        if (disposed) {
            return;
        }
        if (options.onResize) {
            options.onResize(width, height);
        }
        invalidate();
    }

    function stopObserving() {
        generation++;
        if (observer) {
            observer.disconnect();
            observer = null;
        }
    }

    function startObserving() {
        if (explicitHeight != null || !Observer || !attached || disposed) {
            return;
        }
        const observedGeneration = ++generation;
        observer = new Observer(entries => {
            if (disposed || !attached || observedGeneration !== generation || explicitHeight != null) {
                return;
            }
            for (let i = 0; i < entries.length; i++) {
                if (disposed || !attached || observedGeneration !== generation || explicitHeight != null) {
                    return;
                }
                const entry = entries[i];
                if (entry.target !== element) {
                    continue;
                }
                const box = entry.borderBoxSize;
                const borderBox = box && ((box as ObservedSize[])[0] || box) as ObservedSize;
                const style = view.getComputedStyle(element);
                const vertical = /^(vertical|sideways)-/.test(style.writingMode);
                let nextHeight = borderBox && (vertical ? borderBox.inlineSize : borderBox.blockSize);
                if (nextHeight == null) {
                    // getBoundingClientRect includes Canvas/SVG transforms; never
                    // use it for logical content height. ResizeObserver does not.
                    nextHeight = entry.contentRect.height
                        + (parseFloat(style.paddingTop) || 0) + (parseFloat(style.paddingBottom) || 0)
                        + (parseFloat(style.borderTopWidth) || 0) + (parseFloat(style.borderBottomWidth) || 0);
                }
                if (!isFinite(nextHeight) || nextHeight < 0 || height === nextHeight) {
                    continue;
                }
                height = nextHeight;
                syncInteraction();
                if (!disposed && attached && observedGeneration === generation && explicitHeight == null) {
                    notifyResize();
                }
            }
        });
        try {
            observer.observe(element, { box: 'border-box' });
        }
        catch (error) {
            stopObserving();
            throw error;
        }
    }

    const lifecycle: MutableHTMLHostLifecycle = {
        element,
        width,
        height,
        attached,
        disposed,
        attach() {
            if (disposed) {
                throw createHTMLHostError(HTMLHostErrorCode.DISPOSED,
                    'Disposed HTML hosts cannot be reattached', { failedOperation: 'attach' });
            }
            if (attached) {
                return;
            }
            parent.appendChild(element);
            attached = true;
            try {
                startObserving();
                syncInteraction();
            }
            catch (error) {
                lifecycle.detach();
                throw error;
            }
            invalidate();
        },
        detach() {
            if (!attached || disposed) {
                return;
            }
            attached = false;
            stopObserving();
            const detachedGeneration = generation;
            if (explicitHeight == null) {
                height = 0;
            }
            syncInteraction();
            if (!disposed && !attached && generation === detachedGeneration && element.parentNode) {
                element.parentNode.removeChild(element);
            }
            // A backend must invalidate its old painted area separately.
        },
        setVisible(value) {
            if (disposed || visible === value) {
                return;
            }
            visible = value;
            syncInteraction();
            invalidate();
        },
        setSize(nextWidth, nextExplicitHeight) {
            if (disposed) {
                throw createHTMLHostError(HTMLHostErrorCode.DISPOSED,
                    'Disposed HTML hosts cannot be resized', { failedOperation: 'setSize' });
            }
            validateSize(nextWidth, nextExplicitHeight);
            if (nextExplicitHeight == null && !Observer) {
                throw createHTMLHostError(HTMLHostErrorCode.CAPABILITY_MISSING,
                    'ResizeObserver is required for automatic HTML height', { failedOperation: 'setSize' });
            }
            if (width === nextWidth && explicitHeight === nextExplicitHeight) {
                return;
            }
            const modeChanged = explicitHeight !== nextExplicitHeight;
            const previousWidth = width;
            const previousHeight = height;
            const previousExplicitHeight = explicitHeight;
            width = nextWidth;
            explicitHeight = nextExplicitHeight;
            if (element.style.width !== width + 'px') {
                element.style.width = width + 'px';
            }
            element.style.height = explicitHeight == null ? 'auto' : explicitHeight + 'px';
            height = explicitHeight == null ? 0 : explicitHeight;
            if (modeChanged) {
                stopObserving();
                try {
                    startObserving();
                }
                catch (error) {
                    width = previousWidth;
                    height = previousHeight;
                    explicitHeight = previousExplicitHeight;
                    element.style.width = width + 'px';
                    element.style.height = explicitHeight == null ? 'auto' : explicitHeight + 'px';
                    syncInteraction();
                    throw error;
                }
            }
            syncInteraction();
            if (!disposed) {
                notifyResize();
            }
        },
        dispose() {
            if (disposed) {
                return;
            }
            disposed = true;
            attached = false;
            stopObserving();
            syncInteraction();
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
            markHTMLHost(element, false);
            // The application still owns the descendants and their listeners.
        }
    };
    syncInteraction();
    return lifecycle;
}
