(async function () {
    'use strict';
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const host = document.createElement('div');
    const input = document.createElement('input');
    host.className = 'host';
    host.id = 'native-host';
    input.id = 'native-input';
    input.setAttribute('aria-label', 'Canvas 原生输入框');
    input.value = 'native';
    host.appendChild(input);
    const report = window.htmlCapabilityReport = {
        userAgent: navigator.userAgent,
        flags: '未读取浏览器配置；记录运行进程未发现显式 feature 开关，不推断默认设置',
        devicePixelRatio: devicePixelRatio,
        support: zrender.checkHTMLCanvasSupport(),
        signature: null,
        paintCount: 0,
        firstPaintMs: null,
        automaticGeometry: null,
        cssGeometry: null,
        ownership: null,
        inert: null,
        events: [],
        errors: [],
        ime: '未验证；必须使用真实 OS 输入法，不以 typeText/dispatchEvent 代替'
    };
    const startedAt = performance.now();
    let covered = false;
    let moved = false;
    let disposed = false;
    let wrongCanvas = null;
    let nativeTransform = null;
    function show() {
        document.getElementById('report').textContent = JSON.stringify(report, null, 2);
    }
    function hitAt(x, y) {
        const rect = canvas.getBoundingClientRect();
        const hit = document.elementFromPoint(rect.left + 1 + x, rect.top + 1 + y);
        return hit && (hit.id || hit.tagName);
    }
    function draw() {
        if (disposed) { return; }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (host.parentNode !== canvas || host.inert) {
            canvas.clearElementGeometry(host);
            return;
        }
        const x = moved ? 320 : 80;
        const result = ctx.drawElementImage(host, x, 40);
        report.signature = result && typeof result.toFloat64Array === 'function'
            ? 'drawElementImage(element, dx, dy) -> DOMMatrix; CSS transform required'
            : 'drawElementImage(element, dx, dy) -> void; geometry behavior requires verification';
        if (result && typeof result.toFloat64Array === 'function') {
            nativeTransform = result;
            const transform = result.toString();
            if (host.style.transform !== transform) { host.style.transform = transform; }
            // Observed legacy profile needs BOTH CSS placement and hit registration.
            // A successful call alone does not prove the options dictionary is honored.
            canvas.updateElementGeometry(host, { canvasTransform: result });
        }
        if (covered) {
            ctx.fillStyle = 'rgb(255,0,0)';
            ctx.fillRect(x, 40, 240, 60);
        }
        report.covered = covered;
        report.pixel = Array.from(ctx.getImageData(x + 5, 90, 1, 1).data);
        report.hit = hitAt(x + 20, 55);
        show();
    }
    function onPaint(event) {
        if (disposed) { return; }
        report.paintCount++;
        if (report.firstPaintMs === null) {
            report.firstPaintMs = performance.now() - startedAt;
            report.changedElementsPresent = !!event.changedElements;
            try {
                const result = ctx.drawElementImage(host, 80, 40);
                report.automaticGeometry = {
                    rect: host.getBoundingClientRect().toJSON(), hit: hitAt(100, 55)
                };
                if (result) { host.style.transform = result.toString(); }
                wrongCanvas = document.createElement('canvas');
                wrongCanvas.setAttribute('layoutsubtree', '');
                wrongCanvas.setAttribute('content', 'drawable');
                try {
                    wrongCanvas.getContext('2d').drawElementImage(host, 0, 0);
                    report.ownership = 'FAIL: other canvas accepted';
                }
                catch (error) { report.ownership = String(error); }
            }
            catch (error) { report.errors.push(String(error)); }
        }
        try { draw(); }
        catch (error) { report.errors.push(String(error)); show(); }
    }
    function record(event) {
        report.events.push({
            type: event.type, trusted: event.isTrusted, value: input.value, covered: covered
        });
        show();
    }
    const eventNames = ['pointerdown', 'click', 'input', 'change', 'focus', 'blur',
        'compositionstart', 'compositionupdate', 'compositionend'];
    eventNames.forEach(type => input.addEventListener(type, record));
    document.getElementById('cover').onclick = function () { covered = !covered; draw(); };
    document.getElementById('move').onclick = function () { moved = !moved; draw(); };
    document.getElementById('pause').onclick = function () {
        host.inert = !host.inert;
        if (host.inert && host.contains(document.activeElement)) { document.activeElement.blur(); }
        draw();
    };
    document.getElementById('remove').onclick = function () {
        if (host.parentNode) { host.remove(); }
        else { canvas.appendChild(host); }
        draw();
        canvas.requestPaint();
    };
    document.getElementById('stop').onclick = function () {
        if (disposed) { return; }
        disposed = true;
        canvas.removeEventListener('paint', onPaint);
        eventNames.forEach(type => input.removeEventListener(type, record));
        host.inert = true;
        canvas.clearElementGeometry(host);
        host.remove();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        report.disposed = true;
        show();
    };
    // No fabricated paint or business events: wait for the browser's first snapshot.
    if (report.support.candidate === 'drawable') {
        canvas.setAttribute('content', 'drawable');
        host.setAttribute('drawable', '');
    }
    else if (report.support.candidate === 'layout-subtree') {
        canvas.setAttribute('layoutsubtree', '');
        host.setAttribute('drawable', '');
    }
    if (report.support.featuresPresent) {
        canvas.addEventListener('paint', onPaint);
        canvas.appendChild(host);
        canvas.requestPaint();
    }
    if (navigator.userAgentData) {
        report.version = await navigator.userAgentData.getHighEntropyValues(['fullVersionList', 'platformVersion']);
    }
    // This separate probe verifies focus() blocking; trusted Tab is tested manually.
    window.verifyHTMLInert = function () {
        input.focus();
        host.inert = true;
        input.blur();
        input.focus();
        const blocked = document.activeElement !== input;
        const dynamic = document.createElement('input');
        host.appendChild(dynamic);
        dynamic.focus();
        const dynamicBlocked = document.activeElement !== dynamic;
        host.inert = false;
        report.inert = {
            blocked: blocked, dynamicBlocked: dynamicBlocked,
            noAutoFocus: !host.contains(document.activeElement),
            disabled: input.disabled, tabIndex: input.tabIndex
        };
        dynamic.remove();
        show();
        return report.inert;
    };
    window.readHTMLGeometry = function () {
        report.cssGeometry = {
            rect: input.getBoundingClientRect().toJSON(), hit: hitAt(moved ? 340 : 100, 55),
            transform: nativeTransform && nativeTransform.toString()
        };
        show();
        return report.cssGeometry;
    };
    show();
}());
