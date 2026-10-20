import CanvasPainter from '../../../../src/canvas/Painter';
import { brush, brushLoopFinalize, BrushScope } from '../../../../src/canvas/graphic';
import Rect from '../../../../src/graphic/shape/Rect';
import HTML from '../../../../src/graphic/HTML';
import TSpan from '../../../../src/graphic/TSpan';
import ZRImage from '../../../../src/graphic/Image';
import Displayable from '../../../../src/graphic/Displayable';

describe('HTML Canvas painting integration', function () {
    it.each(['path', 'text', 'image'])('rebinds %s styles after drawing HTML', function (kind) {
        function make(x: number, shadowColor?: string): Displayable {
            const style = { shadowBlur: 5, ...(shadowColor ? { shadowColor } : {}) };
            if (kind === 'text') {
                return new TSpan({ style: { ...style, text: 'test', x, y: 0, fill: 'blue' } });
            }
            if (kind === 'image') {
                return new ZRImage({ style: { ...style, image: { width: 20, height: 20 } as any,
                    x, y: 0, width: 20, height: 20 } });
            }
            return new Rect({ shape: { x, y: 0, width: 20, height: 20 }, style: { ...style, fill: 'blue' } });
        }
        const first = make(0, 'red');
        const last = make(100);
        const html = new HTML({ x: 50, width: 20, height: 20 });
        html.__htmlHost = { add() {}, remove() {}, draw() {} };
        const values: any = { dpr: 1 };
        const ctx = new Proxy(values, {
            get(target, key) { return key in target ? target[key] : () => {}; },
            set(target, key, value) { target[key] = value; return true; }
        });
        const scope: BrushScope = { inHover: false, viewWidth: 400, viewHeight: 200, beforeBrushParam: {} };
        [first, html, last].forEach(el => { el.update(); brush(ctx, el, scope); });
        brushLoopFinalize(ctx, scope);
        expect(values.shadowColor).toBe(last.style.shadowColor);
        expect(values.shadowBlur).toBe(5);
        expect(values.globalAlpha).toBe(1);
    });

    function painterFixture(hosts: any[]) {
        const painter: any = Object.create(CanvasPainter.prototype);
        const list: Displayable[] = [];
        painter._htmlHosts = hosts;
        painter._i = { layerStack: [], layers: {} };
        painter._opts = {};
        painter.storage = { getDisplayList: jest.fn(() => list) };
        painter._updateLayerStatus = jest.fn();
        painter._paintList = jest.fn();
        painter._paintHoverList = jest.fn();
        return { painter, list };
    }

    it('validates hosts and repaints their normal layer on a hover-only refresh', function () {
        const prepare = jest.fn();
        const { painter, list } = painterFixture([{ prepare }]);
        painter.refresh({ refresh: false, refreshHover: true });
        expect(painter.storage.getDisplayList).toHaveBeenCalledWith(true);
        expect(prepare).toHaveBeenCalledWith(list);
        expect(painter._updateLayerStatus).toHaveBeenCalledWith(list, undefined);
        expect(painter._paintList).toHaveBeenCalledTimes(1);
    });

    it('keeps hover-only refresh lightweight when there are no HTML hosts', function () {
        const { painter, list } = painterFixture([]);
        painter.refresh({ refresh: false, refreshHover: true });
        expect(painter.storage.getDisplayList).toHaveBeenCalledWith(false);
        expect(painter._paintHoverList).toHaveBeenCalledWith(list);
        expect(painter._paintList).not.toHaveBeenCalled();
    });

    it('does not repaint HTML when neither normal nor hover refresh is requested', function () {
        const prepare = jest.fn();
        const { painter } = painterFixture([{ prepare }]);
        painter.refresh({ refresh: false, refreshHover: false });
        expect(prepare).not.toHaveBeenCalled();
        expect(painter._paintList).not.toHaveBeenCalled();
    });
});
