import Storage from '../../../../src/Storage';
import Group from '../../../../src/graphic/Group';
import Rect from '../../../../src/graphic/shape/Rect';
import { validateHTMLCanvasScene } from '../../../../src/canvas/html/scenePolicy';

describe('native HTML conservative scene admission', function () {
    let storage: Storage;
    let host: Rect;
    let foreground: Rect;

    function check() {
        validateHTMLCanvasScene(host, storage.getDisplayList(true));
    }

    beforeEach(function () {
        storage = new Storage();
        // A normal Displayable stands in for the future HTML scene element.
        // This suite proves scene admission, not native browser behavior.
        host = new Rect({ shape: { x: 80, y: 40, width: 240, height: 60 }, z: 1 });
        foreground = new Rect({ shape: { x: 80, y: 40, width: 240, height: 60 }, z: 2 });
        storage.addRoot(host);
        storage.addRoot(foreground);
    });

    it('rejects overlapping foreground with structured host and target context', function () {
        try {
            check();
            throw new Error('expected rejection');
        }
        catch (error) {
            expect(error.code).toBe('HTML_UNSUPPORTED_SCENE');
            expect(error.context.hostId).toBe(host.id);
            expect(error.context.targetId).toBe(foreground.id);
            expect(error.context.failedOperation).toBe('validateScene');
        }
    });

    it('reevaluates movement and stacking order rather than caching admission', function () {
        expect(check).toThrow('overlap');
        foreground.attr('x', 400);
        expect(check).not.toThrow();
        foreground.attr('x', 0);
        expect(check).toThrow('overlap');
        foreground.attr('z', 0);
        expect(check).not.toThrow();
        foreground.attr('z', 2);
        expect(check).toThrow('overlap');
    });

    it('reevaluates ignore, invisible, opacity and removal', function () {
        foreground.hide();
        expect(check).not.toThrow();
        foreground.show();
        expect(check).toThrow();
        foreground.attr('invisible', true);
        expect(check).not.toThrow();
        foreground.attr('invisible', false);
        foreground.setStyle('opacity', 0);
        expect(check).not.toThrow();
        foreground.setStyle('opacity', 1);
        expect(check).toThrow();
        storage.delRoot(foreground);
        expect(check).not.toThrow();
    });

    it('uses parent transforms and visual shadow bounds even for silent shapes', function () {
        foreground.attr({ x: 400, silent: true });
        const group = new Group({ x: -400 });
        storage.delRoot(foreground);
        group.add(foreground);
        storage.addRoot(group);
        expect(check).toThrow('overlap');
        group.attr('x', 0);
        expect(check).not.toThrow();
        foreground.setStyle({ shadowOffsetX: -400, shadowBlur: 5 });
        expect(check).toThrow('overlap');
    });

    it('rejects unsupported layer, clipping and compositing without relying on intersection', function () {
        foreground.attr('x', 400);
        foreground.attr('zlevel', 1);
        expect(check).toThrow('one normal layer');
        foreground.attr('zlevel', 0);
        foreground.setClipPath(new Rect({ shape: { x: 0, y: 0, width: 10, height: 10 } }));
        expect(check).toThrow('clipping');
        foreground.removeClipPath();
        foreground.setStyle('blend', 'destination-in');
        expect(check).toThrow('source-over');
    });

    it('rejects callbacks that could invalidate checked bounds during painting', function () {
        foreground.attr('x', 400);
        const callback = jest.fn(() => foreground.attr('x', 0));
        foreground.beforeBrush = callback;
        expect(check).toThrow('Custom brush callbacks');
        expect(callback).not.toHaveBeenCalled();
    });

    it('rejects invalid geometry and absent hosts', function () {
        foreground.setShape('x', Infinity);
        expect(check).toThrow('finite');
        storage.delRoot(host);
        expect(check).toThrow('current display list');
    });
});
