import Storage from '../lib/Storage.js';
import Rect from '../lib/graphic/shape/Rect.js';
import { brushSingle } from '../lib/canvas/graphic.js';
import { validateHTMLCanvasScene } from '../lib/canvas/html/scenePolicy.js';
import { createHTMLHostLifecycle } from '../lib/dom/html/lifecycle.js';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const storage = new Storage();
// A Rect provides only the future HTML element's geometry and sort position.
const marker = new Rect({ shape: { x: 80, y: 40, width: 240, height: 60 }, z: 1 });
const cover = new Rect({ shape: { x: 80, y: 40, width: 240, height: 60 }, x: 400, z: 2,
    style: { fill: 'red' } });
storage.addRoot(marker);
storage.addRoot(cover);
const host = createHTMLHostLifecycle(canvas, { width: 240, height: 60 });
host.element.className = 'host';
host.element.setAttribute('drawable', '');
const input = document.createElement('input');
input.id = 'native-input';
input.setAttribute('aria-label', '原生场景拒绝测试');
input.value = 'retained';
host.element.append(input);
host.attach();
let snapshotReady = false;
const report = window.htmlSceneAdmissionReport = {
    userAgent: navigator.userAgent, devicePixelRatio, canvasPixelRatio: 1,
    scope: 'Independent prototype; not public createHTMLHost or Painter integration',
    state: 'pending', transitions: [], events: [], checks: {}
};
['focus', 'blur', 'input', 'change', 'pointerdown', 'click'].forEach(type => {
    input.addEventListener(type, event => report.events.push({ type, trusted: event.isTrusted, value: input.value }));
});
function show() {
    document.getElementById('report').textContent = JSON.stringify(report, null, 2);
}
function hit() {
    const rect = canvas.getBoundingClientRect();
    return document.elementFromPoint(rect.x + 101, rect.y + 56)?.id;
}
function render() {
    const list = storage.getDisplayList(true);
    let error = null;
    try { validateHTMLCanvasScene(marker, list); }
    catch (failure) { error = { code: failure.code, message: failure.message, context: failure.context }; }
    // Hiding invalidates the browser's cached paint record. Recovery must await
    // a new paint notification instead of drawing the pre-suspension snapshot.
    if (error) { snapshotReady = false; }
    host.setVisible(!error);
    if (error) { canvas.clearElementGeometry(host.element); }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const item of list) {
        ctx.save();
        if (item === marker) {
            if (!error && snapshotReady) {
                const transform = ctx.drawElementImage(host.element, marker.shape.x, marker.shape.y);
                host.element.style.transform = transform.toString();
                canvas.updateElementGeometry(host.element, { canvasTransform: transform });
            }
        }
        else { brushSingle(ctx, item); }
        ctx.restore();
    }
    const nextState = error ? 'suspended' : snapshotReady ? 'active' : 'pending';
    if (report.state !== nextState) { report.transitions.push(nextState); }
    report.state = nextState;
    report.error = error;
    report.inert = host.element.inert;
    report.value = input.value;
    report.hit = hit();
    show();
    return error;
}
function setScene(kind) {
    cover.attr({ x: kind === 'move' ? 400 : 0, z: kind === 'behind' ? 0 : 2,
        ignore: kind === 'hide' });
    render();
    canvas.requestPaint();
}
canvas.addEventListener('paint', () => { snapshotReady = true; render(); });
['overlap', 'move', 'behind', 'hide'].forEach(kind => {
    document.getElementById(kind).onclick = () => setScene(kind);
});
const frames = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
window.runHTMLSceneAdmissionVerification = async function () {
    setScene('move');
    await frames();
    const value = input.value;
    const element = host.element;
    input.focus();
    report.checks.initialFocus = document.activeElement === input;
    setScene('overlap');
    await frames();
    input.focus();
    report.checks.rejected = report.error?.code === 'HTML_UNSUPPORTED_SCENE';
    report.checks.hitRevoked = hit() === 'canvas';
    report.checks.focusBlocked = document.activeElement !== input && host.element.inert;
    for (const kind of ['move', 'behind', 'hide']) {
        setScene(kind);
        await frames();
        report.checks[kind] = report.state === 'active' && hit() === 'native-input'
            && host.element === element && input.value === value && document.activeElement !== input;
        setScene('overlap');
        await frames();
        report.checks[kind + 'RejectedAgain'] = report.state === 'suspended' && hit() === 'canvas';
    }
    setScene('move');
    await frames();
    report.passed = Object.values(report.checks).every(value => value === true);
    show();
    return report;
};
document.getElementById('verify').onclick = () => window.runHTMLSceneAdmissionVerification();
window.setHTMLAdmissionScene = setScene;
render();
canvas.requestPaint();
