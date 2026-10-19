import CanvasPainter from '../Painter';
import Displayable from '../../graphic/Displayable';
import HTML from '../../graphic/HTML';
import { ZRenderType } from '../../zrender';
import { HTMLHost, HTMLHostOptions, HTMLHostState } from '../../dom/html/types';
import { createHTMLHostLifecycle } from '../../dom/html/lifecycle';
import { validateHTMLHostLayout } from '../../dom/html/createHTMLHost';
import { checkHTMLCanvasSupport } from '../../dom/html/capabilities';
import { createHTMLHostError, HTMLHostError, HTMLHostErrorCode } from '../../dom/html/diagnostics';
import { validateHTMLCanvasScene } from './scenePolicy';
import { NativeHTMLCanvas } from './native';
import { indexOf } from '../../core/util';

export interface CanvasHTMLHost extends HTMLHost {
    prepare(list: Displayable[]): void
    pause(): void
}

interface MutableCanvasHTMLHost extends CanvasHTMLHost {
    state: HTMLHostState
}

function call<T>(callback: (value: T) => void, value: T) {
    if (callback) {
        try {
            callback(value);
        }
        catch (error) {
            if (typeof console !== 'undefined') {
                console.error('HTML host callback failed', error);
            }
        }
    }
}

export function createCanvasHTMLHost(
    painter: CanvasPainter, zr: ZRenderType, options: HTMLHostOptions, registry: CanvasHTMLHost[]
): HTMLHost {
    const canvas = painter.getHTMLHostCanvas(options.zlevel || 0);
    const support = checkHTMLCanvasSupport(canvas.ownerDocument);
    if (!support.featuresPresent || support.candidate !== 'layout-subtree' || typeof Promise === 'undefined') {
        throw createHTMLHostError(HTMLHostErrorCode.CAPABILITY_MISSING,
            'HTML host requires native inert, Promise and the validated layoutsubtree profile',
            { missingCapabilities: support.missingCapabilities });
    }
    const sceneElement = new HTML({ x: options.x || 0, y: options.y || 0,
        width: options.width, height: options.height || 0,
        zlevel: options.zlevel || 0, z: options.z || 0, z2: options.z2 || 0 });
    const originalZlevel = sceneElement.zlevel;
    let native: NativeHTMLCanvas;
    let disposed = false;
    let initialized = false;
    let settled = false;
    let fault = '';
    let resolveReady: () => void;
    let rejectReady: (error: HTMLHostError) => void;
    let timer: number;
    const ready = new Promise<void>((resolve, reject) => {
        resolveReady = resolve;
        rejectReady = reject;
    });
    const lifecycle = createHTMLHostLifecycle(canvas, {
        width: options.width, height: options.height,
        onResize(width, height) {
            if (disposed) {
                return;
            }
            sceneElement.setLayoutSize(width, height);
            native && native.invalidate();
        },
        onInvalidate() {
            if (!disposed) {
                sceneElement.markRedraw();
            }
        }
    });
    lifecycle.setVisible(false);
    // Scene admission uses the host border box. Keep descendants, including
    // positioned content, inside that same paint/hit boundary.
    lifecycle.element.style.contain = 'paint';
    lifecycle.element.style.overflow = 'hidden';
    native = new NativeHTMLCanvas(canvas, lifecycle.element);
    const view = canvas.ownerDocument.defaultView;

    function state(value: HTMLHostState) {
        if (host.state !== value) {
            host.state = value;
            call(options.onStateChange, value);
        }
    }
    function settle(error?: HTMLHostError) {
        if (settled) {
            return;
        }
        settled = true;
        view.clearTimeout(timer);
        error ? rejectReady(error) : resolveReady();
    }
    function pause() {
        native.setVisible(false);
        native.clear();
        lifecycle.setVisible(false);
        if (!disposed) {
            state(initialized ? 'suspended' : 'pending');
        }
    }
    function fail(error: unknown) {
        if (disposed) {
            return;
        }
        const failure = error && (error as HTMLHostError).code ? error as HTMLHostError
            : createHTMLHostError(initialized ? HTMLHostErrorCode.RENDER_FAILED
                : HTMLHostErrorCode.INITIALIZATION_FAILED, String(error), { hostId: sceneElement.id });
        if (!settled) {
            settle(failure);
            host.dispose();
            return;
        }
        pause();
        if (disposed) {
            return;
        }
        const key = failure.code + ':' + (failure.context && failure.context.targetId) + ':' + failure.message;
        if (fault !== key) {
            fault = key;
            call(options.onError, failure);
        }
    }
    const host: MutableCanvasHTMLHost = {
        element: lifecycle.element,
        sceneElement,
        state: 'pending',
        ready,
        pause,
        prepare(list) {
            if (disposed) {
                return;
            }
            if (indexOf(list, sceneElement) < 0
                || sceneElement.width <= 0 || sceneElement.height <= 0
                || !sceneElement.shouldBePainted(painter.getWidth(), painter.getHeight(), true, true)) {
                pause();
                return;
            }
            try {
                if (sceneElement.zlevel !== originalZlevel
                    || painter.getHTMLHostCanvas(originalZlevel) !== canvas) {
                    throw createHTMLHostError(HTMLHostErrorCode.UNSUPPORTED_LAYER_MIGRATION,
                        'HTML Canvas ownership is fixed for the lifetime of the host');
                }
                validateHTMLCanvasScene(sceneElement, list);
                const style = view.getComputedStyle(lifecycle.element);
                if (style.contain.indexOf('paint') < 0 || style.overflow !== 'hidden'
                    || Math.abs(parseFloat(style.width) - lifecycle.width) > 0.001
                    || sceneElement.style.shadowBlur || sceneElement.style.shadowOffsetX
                    || sceneElement.style.shadowOffsetY) {
                    throw createHTMLHostError(HTMLHostErrorCode.UNSUPPORTED_SCENE,
                        'HTML hosts require their owned width/paint containment and do not support scene shadows');
                }
                if (!initialized) {
                    return;
                }
                const visible = sceneElement.width > 0 && sceneElement.height > 0;
                lifecycle.setVisible(visible);
                if (disposed) {
                    return;
                }
                native.setVisible(visible);
                fault = '';
                state(visible ? 'active' : 'suspended');
            }
            catch (error) {
                fail(error);
            }
        },
        updateLayout(config) {
            if (disposed) {
                throw createHTMLHostError(HTMLHostErrorCode.DISPOSED, 'Disposed HTML hosts cannot be updated');
            }
            validateHTMLHostLayout(config);
            lifecycle.setSize(config.width, config.height);
            if (disposed) {
                return;
            }
            sceneElement.setLayoutSize(lifecycle.width, lifecycle.height);
            sceneElement.attr({ x: config.x == null ? sceneElement.x : config.x,
                y: config.y == null ? sceneElement.y : config.y });
            native.invalidate();
        },
        dispose() {
            if (disposed) {
                return;
            }
            disposed = true;
            settle(createHTMLHostError(HTMLHostErrorCode.DISPOSED, 'HTML host disposed during initialization'));
            native.dispose();
            lifecycle.dispose();
            const idx = indexOf(registry, host);
            if (idx >= 0) {
                registry.splice(idx, 1);
            }
            if (sceneElement.parent) {
                sceneElement.parent.remove(sceneElement);
            }
            else if (sceneElement.__zr && zr.storage) {
                zr.remove(sceneElement);
            }
            state('disposed');
        }
    };
    sceneElement.__htmlHost = {
        add(owner) {
            if (disposed || owner !== zr) {
                throw createHTMLHostError(disposed ? HTMLHostErrorCode.DISPOSED : HTMLHostErrorCode.INVALID_TARGET,
                    'HTML host can only be attached to its original live zrender instance');
            }
            lifecycle.attach();
            native.invalidate();
        },
        remove() {
            pause();
            if (!disposed) {
                lifecycle.detach();
            }
        },
        draw(ctx) {
            if (disposed || host.state !== 'active') {
                return;
            }
            try {
                native.draw(ctx);
            }
            catch (error) {
                fail(error);
            }
        }
    };
    registry.push(host);
    try {
        zr.add(sceneElement);
        timer = view.setTimeout(() => fail(createHTMLHostError(HTMLHostErrorCode.INITIALIZATION_TIMEOUT,
            'HTML host initialization timed out; background scheduling may delay paint')),
        options.initializationTimeoutMs == null ? 10000 : options.initializationTimeoutMs);
        native.start(() => {
            if (disposed) {
                return;
            }
            initialized = true;
            host.prepare(zr.storage.getDisplayList(true));
            if (disposed) {
                return;
            }
            settle();
            sceneElement.markRedraw();
        }, () => {
            if (!disposed) {
                sceneElement.markRedraw();
            }
        }, fail);
    }
    catch (error) {
        // Synchronous creation errors are thrown, so consume the private ready rejection.
        ready.catch(() => {});
        host.dispose();
        throw error;
    }
    return host;
}
