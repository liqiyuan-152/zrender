import { createHTMLHostLifecycle } from '../../../../src/dom/html/lifecycle';

// jsdom has neither native inert nor ResizeObserver. These tests verify resource
// ownership/measurements, not browser focus blocking, paint, or hit testing.
const JSDOM = require('jsdom').JSDOM;

describe('HTML host container lifecycle', function () {
    let dom: any;
    let doc: Document;
    let parent: HTMLElement;
    let observers: StubResizeObserver[];

    class StubResizeObserver {
        target: Element
        disconnected = false
        callback: (entries: any[]) => void
        constructor(callback: (entries: any[]) => void) {
            this.callback = callback;
            observers.push(this);
        }
        observe(target: Element) { this.target = target; }
        disconnect() { this.disconnected = true; }
        emit(height: number, borderBox: boolean = true) {
            this.callback([{
                target: this.target,
                contentRect: { height },
                borderBoxSize: borderBox ? [{ blockSize: height }] : undefined
            }]);
        }
    }

    beforeEach(function () {
        dom = new JSDOM('<main></main>');
        doc = dom.window.document;
        parent = doc.querySelector('main');
        observers = [];
        Object.defineProperty(dom.window.HTMLElement.prototype, 'inert', { configurable: true, value: false });
        dom.window.ResizeObserver = StubResizeObserver;
    });

    afterEach(function () { dom.window.close(); });

    it('preserves the container and application subtree across size updates and reattachment', function () {
        const invalidate = jest.fn();
        const host = createHTMLHostLifecycle(parent, { width: 200, height: 40, onInvalidate: invalidate });
        const element = host.element;
        const input = doc.createElement('input');
        input.value = 'application-owned';
        input.disabled = true;
        input.tabIndex = 3;
        element.appendChild(input);
        expect(host.attached).toBe(false);
        expect(element.hasAttribute('inert')).toBe(true);
        host.attach();
        host.attach();
        expect(parent.children.length).toBe(1);
        expect(invalidate).toHaveBeenCalledTimes(1);
        host.setSize(300, 50);
        expect(element.style.width).toBe('300px');
        expect(element.style.height).toBe('50px');
        expect(host.width).toBe(300);
        expect(host.height).toBe(50);
        host.detach();
        expect(parent.children.length).toBe(0);
        expect(host.attached).toBe(false);
        host.attach();
        expect(host.element).toBe(element);
        expect(element.firstChild).toBe(input);
        expect(input.value).toBe('application-owned');
        expect(input.disabled).toBe(true);
        expect(input.tabIndex).toBe(3);
        host.dispose();
    });

    it('observes logical border height without rewriting automatic CSS height', function () {
        const resize = jest.fn();
        const invalidate = jest.fn();
        const host = createHTMLHostLifecycle(parent, { width: 200, onResize: resize, onInvalidate: invalidate });
        host.attach();
        expect(host.height).toBe(0);
        expect(host.element.hasAttribute('inert')).toBe(true);
        observers[0].emit(42.5);
        expect(host.height).toBe(42.5);
        expect(resize).toHaveBeenLastCalledWith(200, 42.5);
        expect(host.element.style.height).toBe('auto');
        expect(host.element.hasAttribute('inert')).toBe(false);
        observers[0].emit(42.5);
        expect(resize).toHaveBeenCalledTimes(1);
        expect(invalidate).toHaveBeenCalledTimes(2);
        host.dispose();
        expect(observers[0].disconnected).toBe(true);
    });

    it('falls back to untransformed content height plus padding and border', function () {
        const host = createHTMLHostLifecycle(parent, { width: 200 });
        host.element.style.padding = '2px 0 3px';
        host.element.style.borderTop = '1px solid black';
        host.element.style.borderBottom = '4px solid black';
        host.element.style.transform = 'scale(3)';
        host.attach();
        observers[0].emit(25.5, false);
        expect(host.height).toBe(35.5);
        host.dispose();
    });

    it('drops observations from removed and superseded observation generations', function () {
        const resize = jest.fn();
        const host = createHTMLHostLifecycle(parent, { width: 200, onResize: resize });
        host.attach();
        const old = observers[0];
        host.detach();
        old.emit(999);
        expect(resize).not.toHaveBeenCalled();
        host.attach();
        old.emit(999);
        expect(resize).not.toHaveBeenCalled();
        observers[1].emit(60);
        expect(host.height).toBe(60);
        host.setSize(300, 80);
        expect(observers[1].disconnected).toBe(true);
        observers[1].emit(999);
        expect(host.height).toBe(80);
        host.setSize(300);
        expect(observers.length).toBe(3);
        observers[2].emit(90);
        expect(host.height).toBe(90);
        host.dispose();
    });

    it('suspends its own subtree without modifying application interaction attributes', function () {
        const host = createHTMLHostLifecycle(parent, { width: 200, height: 40 });
        const input = doc.createElement('input');
        input.tabIndex = 4;
        host.element.appendChild(input);
        host.attach();
        input.focus();
        expect(doc.activeElement).toBe(input);
        host.setVisible(false);
        expect(doc.activeElement).not.toBe(input);
        expect(host.element.hasAttribute('inert')).toBe(true);
        expect(input.tabIndex).toBe(4);
        host.setVisible(true);
        expect(doc.activeElement).not.toBe(input);
        host.setSize(0, 40);
        expect(host.element.hasAttribute('inert')).toBe(true);
        host.dispose();
    });

    it('releases idempotently and cannot resurrect from stale callbacks or attach', function () {
        const invalidate = jest.fn();
        const resize = jest.fn();
        const host = createHTMLHostLifecycle(parent, { width: 200, onResize: resize, onInvalidate: invalidate });
        const child = doc.createElement('input');
        host.element.appendChild(child);
        host.attach();
        host.dispose();
        host.dispose();
        observers[0].emit(999);
        host.setVisible(true);
        host.detach();
        expect(host.disposed).toBe(true);
        expect(host.attached).toBe(false);
        expect(parent.children.length).toBe(0);
        expect(host.element.firstChild).toBe(child);
        expect(invalidate).toHaveBeenCalledTimes(1);
        expect(resize).not.toHaveBeenCalled();
        expect(() => host.attach()).toThrow('[HTML_DISPOSED]');
        expect(() => host.setSize(200, 50)).toThrow('[HTML_DISPOSED]');
    });

    it('does not invalidate after disposal from a size callback', function () {
        const invalidate = jest.fn();
        const host = createHTMLHostLifecycle(parent, {
            width: 200, onInvalidate: invalidate, onResize: () => host.dispose()
        });
        host.attach();
        observers[0].emit(40);
        expect(host.disposed).toBe(true);
        expect(invalidate).toHaveBeenCalledTimes(1);
        observers[0].emit(50);
        expect(host.height).toBe(40);
    });

    it('rejects invalid sizes transactionally and skips unchanged updates', function () {
        const resize = jest.fn();
        const host = createHTMLHostLifecycle(parent, { width: 200, height: 40, onResize: resize });
        host.attach();
        host.setSize(200, 40);
        expect(resize).not.toHaveBeenCalled();
        [NaN, Infinity, -1].forEach(value => {
            expect(() => host.setSize(value, 40)).toThrow('[HTML_INVALID_OPTIONS]');
            expect(() => host.setSize(200, value)).toThrow('[HTML_INVALID_OPTIONS]');
        });
        expect(host.width).toBe(200);
        expect(host.height).toBe(40);
        host.dispose();
    });

    it('requires native inert and requires ResizeObserver only for automatic height', function () {
        delete dom.window.HTMLElement.prototype.inert;
        expect(() => createHTMLHostLifecycle(parent, { width: 200, height: 40 }))
            .toThrow('[HTML_CAPABILITY_MISSING]');
        Object.defineProperty(dom.window.HTMLElement.prototype, 'inert', { configurable: true, value: false });
        delete dom.window.ResizeObserver;
        expect(() => createHTMLHostLifecycle(parent, { width: 200 })).toThrow('ResizeObserver');
        const host = createHTMLHostLifecycle(parent, { width: 200, height: 40 });
        host.attach();
        expect(() => host.setSize(200)).toThrow('ResizeObserver');
        expect(host.height).toBe(40);
        host.dispose();
    });

    it('does not remove a freshly reattached container from a reentrant blur handler', function () {
        const host = createHTMLHostLifecycle(parent, { width: 200, height: 40 });
        const input = doc.createElement('input');
        host.element.appendChild(input);
        host.attach();
        input.addEventListener('blur', () => host.attach());
        input.focus();
        host.detach();
        expect(host.attached).toBe(true);
        expect(host.element.parentNode).toBe(parent);
        host.dispose();
    });

    it('uses physical height rather than block size in vertical writing mode', function () {
        const host = createHTMLHostLifecycle(parent, { width: 200 });
        host.element.style.writingMode = 'vertical-rl';
        host.attach();
        observers[0].callback([{
            target: host.element,
            contentRect: { height: 60 },
            borderBoxSize: [{ inlineSize: 60, blockSize: 200 }]
        }]);
        expect(host.height).toBe(60);
        host.dispose();
    });

    it('preserves explicit dimensions when switching to automatic observation fails', function () {
        const host = createHTMLHostLifecycle(parent, { width: 200, height: 40 });
        host.attach();
        const observe = jest.spyOn(StubResizeObserver.prototype, 'observe').mockImplementation(() => {
            throw new Error('observer setup failed');
        });
        expect(() => host.setSize(300)).toThrow('observer setup failed');
        expect(host.width).toBe(200);
        expect(host.height).toBe(40);
        expect(host.element.style.width).toBe('200px');
        expect(host.element.style.height).toBe('40px');
        expect(host.attached).toBe(true);
        expect(observers[0].disconnected).toBe(true);
        observe.mockRestore();
        host.setSize(300);
        observers[1].emit(60);
        expect(host.width).toBe(300);
        expect(host.height).toBe(60);
        host.dispose();
    });

    it('rolls back the mounted node and observer if observation setup fails', function () {
        const disconnect = jest.spyOn(StubResizeObserver.prototype, 'disconnect');
        const observe = jest.spyOn(StubResizeObserver.prototype, 'observe').mockImplementation(() => {
            throw new Error('observer setup failed');
        });
        const host = createHTMLHostLifecycle(parent, { width: 200 });
        expect(() => host.attach()).toThrow('observer setup failed');
        expect(host.attached).toBe(false);
        expect(host.element.parentNode).toBe(null);
        expect(disconnect).toHaveBeenCalledTimes(1);
        observe.mockRestore();
        disconnect.mockRestore();
        host.attach();
        host.dispose();
    });
});
