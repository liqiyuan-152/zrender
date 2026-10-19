import { createHTMLHostLifecycle } from '../lib/dom/html/lifecycle.js';

// This page exercises the real ResizeObserver/inert primitives, separately from
// Canvas painting and the not-yet-implemented public createHTMLHost factory.
const mount = document.getElementById('mount');
const output = document.getElementById('report');
const frames = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

window.runHTMLLifecycleVerification = async function () {
    let invalidations = 0;
    const measurements = [];
    const host = createHTMLHostLifecycle(mount, {
        width: 240,
        onResize: (width, height) => measurements.push({ width, height }),
        onInvalidate: () => invalidations++
    });
    const input = document.createElement('input');
    input.value = 'application-owned';
    input.tabIndex = 3;
    const content = document.createElement('div');
    content.style.height = '40px';
    content.appendChild(input);
    host.element.appendChild(content);
    const originalElement = host.element;
    const result = { userAgent: navigator.userAgent, devicePixelRatio, checks: {}, measurements };
    try {
        host.attach();
        await frames();
        result.checks.contentHeight = host.height === 40;
        content.style.height = '60px';
        await frames();
        result.checks.contentResize = host.height === 60;
        host.setSize(300, 80);
        result.checks.explicitSize = host.width === 300 && host.height === 80
            && host.element.style.width === '300px' && host.element.style.height === '80px';
        input.focus();
        const wasFocused = document.activeElement === input;
        host.setVisible(false);
        input.focus();
        const dynamic = document.createElement('input');
        host.element.appendChild(dynamic);
        dynamic.focus();
        result.checks.inert = wasFocused && !host.element.contains(document.activeElement);
        host.setVisible(true);
        result.checks.noFocusRestore = !host.element.contains(document.activeElement);
        result.checks.attributesPreserved = input.tabIndex === 3 && input.disabled === false;
        host.detach();
        result.checks.removed = !host.element.isConnected && host.attached === false;
        host.attach();
        result.checks.identity = host.element === originalElement && input.parentNode === content
            && input.value === 'application-owned';
        // Application unmounts its subtree before final disposal.
        host.element.removeChild(content);
        host.element.removeChild(dynamic);
        host.dispose();
        host.dispose();
        const before = invalidations;
        await frames();
        result.checks.disposed = host.disposed && !host.attached && !host.element.isConnected;
        result.checks.noLateInvalidation = invalidations === before;
        try { host.attach(); }
        catch (error) { result.checks.noResurrection = error.code === 'HTML_DISPOSED'; }
        result.passed = Object.values(result.checks).every(value => value === true);
    }
    finally {
        host.dispose();
        window.htmlLifecycleReport = result;
        output.textContent = JSON.stringify(result, null, 2);
    }
    return result;
};
document.getElementById('verify').onclick = () => window.runHTMLLifecycleVerification();
