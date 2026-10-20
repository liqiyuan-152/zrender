import { init, registerPainter, ZRenderType } from '../../../../src/zrender';
import Storage from '../../../../src/Storage';
import { createHTMLHost } from '../../../../src/dom/html/createHTMLHost';
import { createCanvasHTMLHost, CanvasHTMLHost } from '../../../../src/canvas/html/host';
import HTML from '../../../../src/graphic/HTML';
import Rect from '../../../../src/graphic/shape/Rect';

const JSDOM = require('jsdom').JSDOM;

// Explicitly mocked experimental APIs. Browser pixels, focus and trusted inputs
// are verified separately in html-host-foundation.html, never by these events.
describe('public HTML host ownership and cancellation', function () {
    let dom: any;
    let doc: Document;
    let zr: ZRenderType;
    let painter: FixturePainter;

    class FixturePainter {
        type = 'html-fixture'
        root: HTMLElement
        canvas: HTMLCanvasElement
        registry: CanvasHTMLHost[] = []
        storage: Storage
        constructor(root: HTMLElement, storage: Storage) {
            this.root = root;
            this.storage = storage;
            this.canvas = doc.createElement('canvas');
            root.appendChild(this.canvas);
            painter = this;
        }
        getType() { return this.type; }
        getViewportRoot() { return this.root; }
        getWidth() { return 640; }
        getHeight() { return 240; }
        getHTMLHostCanvas() { return this.canvas; }
        createHTMLHost(owner: ZRenderType, options: any) {
            return createCanvasHTMLHost(this as any, owner, options, this.registry);
        }
        refresh() {
            const list = this.storage.getDisplayList(true);
            this.registry.slice().forEach(host => host.prepare(list));
        }
        clear() { this.registry.slice().forEach(host => host.pause()); }
        resize() {}
        dispose() { this.registry.slice().forEach(host => host.dispose()); }
        paint() { this.canvas.dispatchEvent(new dom.window.Event('paint')); }
    }

    beforeEach(function () {
        jest.useFakeTimers();
        dom = new JSDOM('<main></main>');
        doc = dom.window.document;
        Object.defineProperty(dom.window.HTMLElement.prototype, 'inert', {
            configurable: true,
            get() { return this.hasAttribute('inert'); },
            set(value: boolean) { value ? this.setAttribute('inert', '') : this.removeAttribute('inert'); }
        });
        const proto = dom.window.HTMLCanvasElement.prototype;
        proto.layoutSubtree = false;
        proto.onpaint = null;
        proto.requestPaint = jest.fn();
        proto.clearElementGeometry = jest.fn();
        proto.updateElementGeometry = jest.fn();
        proto.getContext = () => ({
            save() {}, restore() {}, setTransform() {}, scale() {},
            drawElementImage() { return {
                a: 1, b: 0, c: 0, d: 1, e: 0, f: 0,
                toFloat64Array(): number[] { return []; },
                toString() { return 'matrix(1,0,0,1,0,0)'; }
            }; }
        });
        registerPainter('html-fixture', FixturePainter as any);
        zr = init(doc.querySelector('main'), { renderer: 'html-fixture', ssr: true });
    });
    afterEach(function () {
        zr.dispose();
        dom.window.close();
        jest.useRealTimers();
    });

    it('returns a stable mount before ready, then removes/readds and clears without replacing children', async function () {
        const host = createHTMLHost(zr, { width: 200, height: 40 });
        const child = doc.createElement('input');
        host.element.appendChild(child);
        expect(host.state).toBe('pending');
        painter.paint();
        await host.ready;
        expect(host.state).toBe('active');
        zr.remove(host.sceneElement);
        expect(host.state).toBe('suspended');
        expect(host.element.parentNode).toBe(null);
        zr.add(host.sceneElement);
        painter.refresh();
        expect(host.element.firstChild).toBe(child);
        expect(host.state).toBe('active');
        zr.clear();
        expect(host.sceneElement.__zr).toBe(null);
        expect(host.element.parentNode).toBe(null);
        host.dispose();
        host.dispose();
    });

    it('cancels pending readiness, clears probes/listeners and ignores late paint', async function () {
        const states = jest.fn();
        const host = createHTMLHost(zr, { width: 200, height: 40, onStateChange: states });
        const rejected = expect(host.ready).rejects.toMatchObject({ code: 'HTML_DISPOSED' });
        host.dispose();
        await rejected;
        painter.paint();
        jest.runOnlyPendingTimers();
        expect(host.state).toBe('disposed');
        expect(states).toHaveBeenCalledTimes(1);
        expect(painter.canvas.children.length).toBe(0);
        expect(painter.registry.length).toBe(0);
        expect(painter.canvas.hasAttribute('layoutsubtree')).toBe(false);
        expect(() => host.updateLayout({ width: 300 })).toThrow('[HTML_DISPOSED]');
        expect(() => zr.add(host.sceneElement)).toThrow('[HTML_DISPOSED]');
        expect(zr.storage.getRoots().length).toBe(0);
    });

    it('times out once and does not diagnose background scheduling as permanently missing capability', async function () {
        const host = createHTMLHost(zr, { width: 200, height: 40, initializationTimeoutMs: 10 });
        const rejected = expect(host.ready).rejects.toMatchObject({ code: 'HTML_INITIALIZATION_TIMEOUT' });
        jest.advanceTimersByTime(10);
        await rejected;
        expect(host.state).toBe('disposed');
        expect(painter.registry.length).toBe(0);
        painter.paint();
        expect(host.state).toBe('disposed');
    });

    it('disposes detached hosts when the owning zrender instance is disposed', async function () {
        const host = createHTMLHost(zr, { width: 200, height: 40 });
        painter.paint();
        await host.ready;
        zr.remove(host.sceneElement);
        zr.dispose();
        expect(host.state).toBe('disposed');
        expect(host.element.parentNode).toBe(null);
    });

    it('isolates callback errors and deduplicates a continuous overlap fault', async function () {
        const log = jest.spyOn(console, 'error').mockImplementation(() => {});
        const onError = jest.fn(() => { throw new Error('application callback'); });
        const first = createHTMLHost(zr, { width: 100, height: 40, z: 1, onError });
        const second = createHTMLHost(zr, { x: 300, width: 100, height: 40, z: 1 });
        painter.paint();
        painter.paint();
        await Promise.all([first.ready, second.ready]);
        const cover = new Rect({ shape: { width: 100, height: 40 }, z: 2 });
        zr.add(cover);
        expect(() => painter.refresh()).not.toThrow();
        painter.refresh();
        expect(first.state).toBe('suspended');
        expect(second.state).toBe('active');
        expect(onError).toHaveBeenCalledTimes(1);
        expect(log).toHaveBeenCalledTimes(1);
        zr.remove(cover);
        painter.refresh();
        zr.add(cover);
        painter.refresh();
        expect(onError).toHaveBeenCalledTimes(2);
        first.dispose();
        second.dispose();
        log.mockRestore();
    });

    it('rejects invalid configuration and unowned scene elements before retaining a scene root', function () {
        expect(() => createHTMLHost(zr, { width: -1 })).toThrow('[HTML_INVALID_OPTIONS]');
        expect(() => createHTMLHost(zr, { width: 100, initializationTimeoutMs: Infinity }))
            .toThrow('[HTML_INVALID_OPTIONS]');
        expect(() => createHTMLHost(zr, { width: 100, layout: {} } as any)).toThrow('[HTML_UNSUPPORTED_SCENE]');
        expect(() => zr.add(new HTML({ width: 100 }))).toThrow('createHTMLHost');
        expect(zr.storage.getRoots().length).toBe(0);
    });

    it('handles disposal from the first active-state callback before resolving readiness', async function () {
        let host: ReturnType<typeof createHTMLHost>;
        host = createHTMLHost(zr, { width: 100, height: 40, onStateChange(state) {
            if (state === 'active') { host.dispose(); }
        } });
        const rejected = expect(host.ready).rejects.toMatchObject({ code: 'HTML_DISPOSED' });
        painter.paint();
        await rejected;
        expect(host.state).toBe('disposed');
        expect(painter.registry.length).toBe(0);
        expect(painter.canvas.children.length).toBe(0);
    });

    it('initializes zero-area hosts as suspended without admitting hit geometry', async function () {
        const host = createHTMLHost(zr, { width: 0, height: 40 });
        zr.add(new Rect({ shape: { width: 100, height: 100 }, z: 2 }));
        painter.paint();
        await host.ready;
        expect(host.state).toBe('suspended');
        expect(host.element.hasAttribute('inert')).toBe(true);
        host.dispose();
    });

    it.each([
        ['Windows', 'Google Chrome', '1.0.0.0'],
        ['macOS', 'Google Chrome', '999.0.0.0'],
        ['Linux', 'Chromium', '155.0.0.1']
    ])('does not gate native compatibility on %s %s %s', async function (platform, brand, version) {
        const readVersion = jest.fn(() => Promise.resolve({ fullVersionList: [{ brand, version }] }));
        Object.defineProperty(dom.window.navigator, 'userAgentData', { value: {
            platform, getHighEntropyValues: readVersion
        } });
        const host = createHTMLHost(zr, { width: 100, height: 40 });
        painter.paint();
        await host.ready;
        expect(host.state).toBe('active');
        expect(readVersion).not.toHaveBeenCalled();
    });

    it('accepts the native matrix interface on macOS without UA Client Hints', async function () {
        Object.defineProperty(dom.window.navigator, 'platform', { value: 'MacIntel' });
        Object.defineProperty(dom.window.navigator, 'userAgentData', { value: undefined });
        const host = createHTMLHost(zr, { width: 100, height: 40 });
        painter.paint();
        await host.ready;
        expect(host.state).toBe('active');
    });

    it.each([undefined, { toFloat64Array() {}, a: 1, b: 0, c: 0, d: 1, e: NaN, f: 0 },
        { toFloat64Array() {}, a: 1, b: 0, c: 0, d: 1, e: 0, f: 0, is2D: false }])(
    'rejects an incompatible native draw result and releases its resources (%p)', async function (result) {
        const ctx = painter.canvas.getContext('2d') as any;
        ctx.drawElementImage = () => result;
        painter.canvas.getContext = () => ctx;
        const host = createHTMLHost(zr, { width: 100, height: 40 });
        const rejected = expect(host.ready).rejects.toMatchObject({ code: 'HTML_CAPABILITY_MISSING' });
        painter.paint();
        await rejected;
        expect(host.state).toBe('disposed');
        expect(painter.canvas.children.length).toBe(0);
    });

    it('rejects cross-instance attachment without retaining a foreign root or losing the original host', async function () {
        const originalPainter = painter;
        const host = createHTMLHost(zr, { width: 100, height: 40 });
        originalPainter.paint();
        await host.ready;
        zr.remove(host.sceneElement);
        const other = init(doc.createElement('main'), { renderer: 'html-fixture', ssr: true });
        expect(() => other.add(host.sceneElement)).toThrow('[HTML_INVALID_TARGET]');
        expect(other.storage.getRoots().length).toBe(0);
        expect(host.sceneElement.__zr).toBe(null);
        zr.add(host.sceneElement);
        originalPainter.refresh();
        expect(host.state).toBe('active');
        other.dispose();
        painter = originalPainter;
    });
});
