(function () {
    const mount = document.getElementById('mount');
    const output = document.getElementById('report');
    const waitFor = async function (predicate) {
        const until = performance.now() + 4000;
        while (!predicate()) {
            if (performance.now() > until) { throw new Error('Timed out waiting for host state/paint'); }
            await new Promise(resolve => requestAnimationFrame(resolve));
        }
    };
    function make(direct, dpr) {
        const root = document.createElement(direct ? 'canvas' : 'div');
        root.className = 'surface';
        mount.appendChild(root);
        const zr = zrender.init(root, { renderer: 'canvas', width: 640, height: 240, devicePixelRatio: dpr });
        const background = new zrender.Rect({ shape: { x: 0, y: 0, width: 640, height: 240 },
            style: { fill: 'white' } });
        zr.add(background);
        const errors = [];
        const host = zrender.createHTMLHost(zr, { x: 80, y: 40, width: 240, z: 1,
            onError: error => errors.push(error.code) });
        host.element.style.background = 'green';
        const content = document.createElement('div');
        content.style.height = '40px';
        const input = document.createElement('input');
        input.setAttribute('aria-label', '公共 HTMLHost 输入');
        input.value = 'application-owned';
        input.style.cssText = 'box-sizing:border-box;width:220px;height:32px';
        input.tabIndex = 3;
        const events = [];
        ['input', 'change', 'focus', 'blur'].forEach(type => {
            input.addEventListener(type, event => events.push({ type, trusted: event.isTrusted, value: input.value }));
        });
        content.appendChild(input);
        host.element.appendChild(content);
        const canvas = host.element.parentNode;
        function hit() {
            const rect = canvas.getBoundingClientRect();
            return document.elementFromPoint(rect.left + host.sceneElement.x + 10,
                rect.top + host.sceneElement.y + 10) === input;
        }
        return { root, zr, host, input, content, canvas, hit, errors, events, dpr };
    }
    window.runHTMLHostFoundationVerification = async function () {
        const report = window.htmlHostFoundationReport = { userAgent: navigator.userAgent, cases: [] };
        for (const config of [{ direct: true, dpr: 1 }, { direct: false, dpr: 2 }]) {
            const f = make(config.direct, config.dpr);
            const { zr, host, input, content, canvas, hit } = f;
            const result = { ...config, checks: {}, errors: f.errors, businessEvents: f.events };
            report.cases.push(result);
            const element = host.element;
            try {
                await host.ready;
                await waitFor(() => host.state === 'active' && host.sceneElement.height === 40 && hit());
                result.checks.mountBeforeReady = input.parentNode === content && host.element === element;
                result.checks.nativeOwnership = canvas.tagName === 'CANVAS';
                result.checks.cssGeometry = input.getBoundingClientRect().width === 220
                    && host.element.getBoundingClientRect().width === 240;
                result.checks.initialHeight = host.sceneElement.height === 40;
                const pixel = canvas.getContext('2d').getImageData(310 * f.dpr, 75 * f.dpr, 1, 1).data;
                result.checks.nativePixels = pixel[0] === 0 && pixel[1] === 128 && pixel[2] === 0;
                content.style.height = '60px';
                await waitFor(() => host.sceneElement.height === 60 && hit());
                result.checks.contentResize = true;
                host.sceneElement.hide();
                await waitFor(() => host.state === 'suspended');
                input.focus();
                result.checks.hidden = host.element.inert && document.activeElement !== input && !hit();
                host.sceneElement.show();
                await waitFor(() => host.state === 'active' && hit());
                result.checks.noFocusRestore = document.activeElement !== input;
                zr.remove(host.sceneElement);
                result.checks.removed = host.state === 'suspended' && !element.isConnected;
                zr.add(host.sceneElement);
                await waitFor(() => host.state === 'active' && hit());
                result.checks.readded = host.element === element && input.value === 'application-owned';
                host.updateLayout({ x: 100, y: 50, width: 300, height: 80 });
                await waitFor(() => host.sceneElement.width === 300 && host.sceneElement.height === 80 && hit());
                result.checks.explicitSize = element.style.width === '300px' && element.style.height === '80px';
                const cover = new zrender.Rect({ shape: { x: 100, y: 50, width: 300, height: 80 },
                    z: 2, style: { fill: 'red' } });
                zr.add(cover);
                await waitFor(() => host.state === 'suspended');
                result.checks.overlapRejected = !hit() && element.inert
                    && f.errors.indexOf('HTML_UNSUPPORTED_SCENE') >= 0;
                cover.attr('x', 500);
                await waitFor(() => host.state === 'active' && hit());
                result.checks.moveRecovers = input.value === 'application-owned';
                cover.attr({ x: 0, z: 0 });
                await waitFor(() => host.state === 'active' && hit());
                result.checks.backgroundAllowed = true;
                zr.remove(cover);
                try { zr.painter.getRenderedCanvas(); }
                catch (error) { result.checks.exportRejected = error.code === 'UNSUPPORTED_EXPORT'; }
                host.sceneElement.hide();
                try { zr.painter.getRenderedCanvas({ pixelRatio: 3 }); }
                catch (error) { result.checks.ignoredExportRejected = error.code === 'UNSUPPORTED_EXPORT'; }
                host.sceneElement.show();
                zr.clear();
                result.checks.cleared = !element.isConnected && host.state === 'suspended';
                zr.add(host.sceneElement);
                await waitFor(() => host.state === 'active' && hit());
                result.checks.identityAfterClear = host.element === element && input.tabIndex === 3 && !input.disabled;
                // Application owns unmounting descendants; zrender only releases its host resources.
                element.removeChild(content);
                host.dispose();
                host.dispose();
                result.checks.disposed = host.state === 'disposed' && !element.isConnected;
                try { zr.add(host.sceneElement); }
                catch (error) { result.checks.noResurrection = error.code === 'HTML_DISPOSED'; }
                result.checks.noSceneResurrection = zr.storage.getRoots().length === 0;
                zr.add(new zrender.Rect({ shape: { width: 10, height: 10 }, style: { fill: 'blue' } }));
                zr.refreshImmediately();
                const ordinary = zr.painter.getRenderedCanvas().getContext('2d').getImageData(2, 2, 1, 1).data;
                result.checks.ordinaryExportRestored = ordinary[0] === 0 && ordinary[2] === 255;
                const empty = zrender.createHTMLHost(zr, { width: 100, height: 40, x: 300 });
                await empty.ready;
                result.checks.emptyReady = empty.state === 'active';
                zr.dispose();
                result.checks.ownerDispose = empty.state === 'disposed' && !empty.element.isConnected;
                result.checks.noSyntheticBusinessEvents = !f.events.some(event => event.type === 'input'
                    || event.type === 'change');
                result.passed = Object.values(result.checks).every(value => value === true)
                    && f.errors.every(code => code === 'HTML_UNSUPPORTED_SCENE');
            }
            catch (error) { result.failure = String(error); result.passed = false; }
            finally {
                if (content.parentNode) { content.parentNode.removeChild(content); }
                host.dispose();
                await host.ready.catch(() => {});
                zr.dispose();
                f.root.remove();
            }
        }
        report.passed = report.cases.every(result => result.passed);
        output.textContent = JSON.stringify(report, null, 2);
        return report;
    };
    window.mountManualHTMLHost = async function () {
        const f = make(false, 2);
        await f.host.ready;
        await waitFor(() => f.host.state === 'active' && f.hit());
        window.manualHTMLHost = f;
        return { ready: true, state: f.host.state };
    };
    document.getElementById('verify').onclick = () => window.runHTMLHostFoundationVerification();
}());
