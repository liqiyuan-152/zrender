import { checkHTMLCanvasSupport } from '../../../../src/dom/html/capabilities';
import { createHTMLHostError, HTMLHostErrorCode } from '../../../../src/dom/html/diagnostics';

// These tests validate negative paths and feature screening, not browser behavior.
function fixture(modern: boolean) {
    const canvas: any = {
        onpaint: null,
        requestPaint: function () {},
        clearElementGeometry: function () {},
        updateElementGeometry: function () {},
        getContext: function () { return { drawElementImage: function () {} }; }
    };
    canvas[modern ? 'content' : 'layoutSubtree'] = modern ? 'fallback' : false;
    const element: any = { inert: false };
    const doc = {
        createElement: function (name: string) { return name === 'canvas' ? canvas : element; },
        defaultView: { navigator: { userAgent: 'fixture, not a verified browser' } }
    } as unknown as Document;
    return { canvas, element, doc };
}

describe('HTML canvas feature screening', function () {
    it('imports and reports DOM absence in Node without global browser objects', function () {
        expect(checkHTMLCanvasSupport().missingCapabilities).toEqual(['DOM']);
    });

    it('distinguishes candidates without claiming automatic geometry support', function () {
        const modern = checkHTMLCanvasSupport(fixture(true).doc);
        const legacy = checkHTMLCanvasSupport(fixture(false).doc);
        expect(modern.featuresPresent).toBe(true);
        expect(modern.candidate).toBe('drawable');
        expect(legacy.candidate).toBe('layout-subtree');
        expect(modern.features).not.toContain('autoGeometrySync');
    });

    it('requires native inert independently of canvas API presence', function () {
        const f = fixture(true);
        delete f.element.inert;
        const result = checkHTMLCanvasSupport(f.doc);
        expect(result.featuresPresent).toBe(false);
        expect(result.missingCapabilities).toEqual(['inert']);
        expect(result.reason).toContain('inert');
    });

    it('handles null and throwing contexts without breaking ordinary imports', function () {
        const f = fixture(true);
        f.canvas.getContext = function (): CanvasRenderingContext2D { return null; };
        expect(checkHTMLCanvasSupport(f.doc).missingCapabilities).toContain('drawElementImage');
        f.canvas.getContext = function () { throw new Error('disabled'); };
        expect(checkHTMLCanvasSupport(f.doc).featuresPresent).toBe(false);
    });

    it('requires paint subscription, scheduling, geometry clearing and opt-in', function () {
        const f = fixture(true);
        delete f.canvas.onpaint;
        f.canvas.clearElementGeometry = null;
        delete f.canvas.content;
        const result = checkHTMLCanvasSupport(f.doc);
        expect(result.missingCapabilities).toEqual([
            'paint/requestPaint', 'content/layoutSubtree', 'clearElementGeometry'
        ]);
        expect(result.featuresPresent).toBe(false);
    });
});

describe('HTML host diagnostics', function () {
    it('keeps native Error identity, code and structured context on the ES3 target', function () {
        const context = { failedOperation: 'create', missingCapabilities: ['inert'] };
        const error = createHTMLHostError(HTMLHostErrorCode.CAPABILITY_MISSING, 'Native inert required', context);
        expect(error instanceof Error).toBe(true);
        expect(error.name).toBe('HTMLHostError');
        expect(error.code).toBe('HTML_CAPABILITY_MISSING');
        expect(error.message).toBe('[HTML_CAPABILITY_MISSING] Native inert required');
        expect(error.context).toBe(context);
        expect(error.stack).toBeTruthy();
    });
});
