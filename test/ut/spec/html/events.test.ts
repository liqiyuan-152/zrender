import env from '../../../../src/core/env';
import HandlerDomProxy from '../../../../src/dom/HandlerProxy';
import { createHTMLHostLifecycle } from '../../../../src/dom/html/lifecycle';

const JSDOM = require('jsdom').JSDOM;

jest.mock('../../../../src/core/env', () => ({
    __esModule: true,
    default: { browser: {}, domSupported: true, pointerEventsSupported: false, touchEventsSupported: false }
}));

describe('native HTML event isolation', function () {
    let dom: any;
    let root: HTMLCanvasElement;
    let proxy: HandlerDomProxy;
    let host: ReturnType<typeof createHTMLHostLifecycle>;
    let input: HTMLInputElement;
    let originalDocument: Document;

    beforeEach(function () {
        dom = new JSDOM('<canvas></canvas>');
        originalDocument = (global as any).document;
        (global as any).document = dom.window.document;
        root = dom.window.document.querySelector('canvas');
        (root as any).domBelongToZr = true;
        root.getBoundingClientRect = () => ({ left: 10, top: 20 } as DOMRect);
        Object.defineProperty(dom.window.HTMLElement.prototype, 'inert', { value: false });
        host = createHTMLHostLifecycle(root, { width: 240, height: 80 });
        input = dom.window.document.createElement('input');
        host.element.appendChild(input);
        host.attach();
        env.pointerEventsSupported = env.touchEventsSupported = false;
    });

    afterEach(function () {
        proxy && proxy.dispose();
        host.dispose();
        dom.window.close();
        (global as any).document = originalDocument;
        env.pointerEventsSupported = env.touchEventsSupported = false;
    });

    function fire(target: Element, type: string, x = 100, y = 60) {
        const event = new dom.window.MouseEvent(type, {
            bubbles: true, cancelable: true, clientX: x, clientY: y
        });
        Object.defineProperty(event, 'targetTouches', { value: [{ clientX: x, clientY: y }] });
        Object.defineProperty(event, 'changedTouches', { value: [{ clientX: x, clientY: y }] });
        target.dispatchEvent(event);
        return event;
    }

    it.each(['mouse', 'pointer', 'touch'])(
        'keeps %s interaction in HTML without blocking application bubbling', function (mode) {
            env.pointerEventsSupported = mode === 'pointer';
            env.touchEventsSupported = mode === 'touch';
            proxy = new HandlerDomProxy(root, root);
            const canvas = jest.fn();
            const application = jest.fn();
            const inputClick = jest.fn();
            input.addEventListener('click', inputClick);
            root.addEventListener('click', application);
            ['mousedown', 'mouseup', 'mousemove', 'click', 'dblclick', 'contextmenu', 'mousewheel', 'pinch']
                .forEach(type => proxy.on(type as any, canvas));
            const names = mode === 'pointer' ? ['pointerdown', 'pointermove', 'pointerup']
                : mode === 'touch' ? ['touchstart', 'touchmove', 'touchend']
                    : ['mousedown', 'mousemove', 'mouseup'];
            names.concat(['click', 'dblclick', 'contextmenu', 'wheel']).forEach(type => fire(input, type));
            expect(inputClick).toHaveBeenCalledTimes(1);
            expect(application).toHaveBeenCalledTimes(1);
            expect(canvas).not.toHaveBeenCalled();
            expect(proxy.__pointerCapturing).toBe(false);
            // An HTML touch must not suppress a subsequent independent Canvas click.
            fire(root, 'click');
            expect(canvas).toHaveBeenCalledTimes(1);
        }
    );

    it.each(['mouse', 'pointer'])('finishes a %s Canvas drag over HTML using Canvas coordinates', function (mode) {
        env.pointerEventsSupported = mode === 'pointer';
        proxy = new HandlerDomProxy(root, root);
        const moved = jest.fn();
        const released = jest.fn();
        proxy.on('mousemove', moved);
        proxy.on('mouseup', released);
        const prefix = mode === 'pointer' ? 'pointer' : 'mouse';
        fire(root, prefix + 'down', 20, 30);
        fire(input, prefix + 'move', 110, 80);
        expect(proxy.__pointerCapturing).toBe(true);
        expect(moved).toHaveBeenCalledTimes(1);
        expect(moved.mock.calls[0][0]).toMatchObject({ zrX: 100, zrY: 60 });
        fire(input, prefix + 'up', 120, 90);
        expect(released).toHaveBeenCalledTimes(1);
        expect(released.mock.calls[0][0]).toMatchObject({ zrX: 110, zrY: 70 });
        expect(proxy.__pointerCapturing).toBe(false);
    });

    it('recognizes controls in a shadow tree and preserves ordinary Canvas interaction', function () {
        proxy = new HandlerDomProxy(root, root);
        const clicked = jest.fn();
        proxy.on('click', clicked);
        const shadow = host.element.attachShadow({ mode: 'open' });
        shadow.appendChild(input);
        fire(input, 'click');
        expect(clicked).not.toHaveBeenCalled();
        fire(root, 'click');
        expect(clicked).toHaveBeenCalledTimes(1);
    });
});
