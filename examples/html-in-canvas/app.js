const zr = zrender.init(document.getElementById('scene'), {
    renderer: 'canvas', width: 1120, height: 650
});
const model = { title: '品牌官网焕新', owner: '林小夏', date: '2026-11-06',
    stage: '设计进行中', progress: 64, note: '让品牌表达更清晰，让每一次访问都有收获。' };
const artwork = new zrender.Group();
zr.add(artwork);
let host;
let form;
let moved = false;
let closed = false;

function text(value, x, y, size = 14, fill = '#243e45', weight = 400) {
    artwork.add(new zrender.Text({ silent: true, style: {
        text: value, x, y, fill, font: `${weight} ${size}px system-ui, sans-serif`
    } }));
}

function rect(x, y, width, height, fill, radius = 10) {
    artwork.add(new zrender.Rect({ silent: true,
        shape: { x, y, width, height, r: radius }, style: { fill } }));
}

function render() {
    artwork.removeAll();
    rect(0, 0, 1120, 650, '#ffffff', 0);
    text('01 / 项目计划', 34, 32, 11, '#7b8c92', 600);
    rect(34, 72, 94, 27, '#eaf4ef', 14);
    text(model.stage, 46, 78, 11, '#33765e', 600);
    text(model.title, 34, 124, 30, '#203c42', 700);
    text('以更好的设计，迎接下一次发布', 36, 174, 13, '#829197');
    text('项目负责人', 36, 226, 11, '#829197');
    text(model.owner, 36, 250, 16, '#203c42', 600);
    text('预计交付', 272, 226, 11, '#829197');
    text(model.date.replaceAll('-', ' / '), 272, 250, 16, '#203c42', 600);
    rect(34, 300, 570, 118, '#f4f8f6');
    text('整体进度', 54, 320, 12, '#71857c');
    text(`${model.progress}%`, 506, 316, 24, '#276e59', 700);
    rect(54, 366, 530, 9, '#dfe9e3', 5);
    if (model.progress > 0) {
        rect(54, 366, 530 * model.progress / 100, 9, '#39866d', 5);
    }
    text('发布路线', 36, 453, 14, '#203c42', 600);
    const steps = ['需求梳理', '视觉设计', '开发交付'];
    steps.forEach((label, index) => {
        const x = 44 + index * 210;
        if (index < 2) { rect(x + 14, 500, 198, 2, '#dce7e0', 0); }
        artwork.add(new zrender.Circle({ silent: true, shape: { cx: x, cy: 501, r: 7 },
            style: { fill: model.progress >= [0, 35, 80][index] ? '#3c846c' : '#d8e1dd' } }));
        text(label, x - 8, 526, 12, '#6a8076');
    });
    text(model.note, 36, 592, 12, '#81928a');
    // Every painted element is behind the HTML host (z: 10).
    rect(650, 28, 438, 594, '#f7faf9', 14);
    text('项目编辑器', 680, 66, 22, '#2c5144', 600);
    text('连接原生 HTML 表单后，在这里编辑计划。', 680, 110, 13, '#7b9388');
    text('修改项目名称、负责人及进度，\n保存后会同步更新左侧画布。', 680, 153, 13, '#7b9388');
    zr.refresh();
}

function unavailable(error) {
    document.getElementById('status').textContent = '编辑器暂不可用';
    const notice = document.getElementById('notice');
    notice.hidden = false;
    notice.replaceChildren();
    const title = document.createElement('strong');
    title.textContent = '当前浏览器无法启用画布内表单';
    const detail = document.createElement('span');
    const support = zrender.checkHTMLCanvasSupport();
    if (!support.featuresPresent) {
        detail.textContent = '当前打开页面的浏览器缺少接口：' + support.missingCapabilities.join('、')
            + '。请在已开启实验功能并重启的 Chrome 中直接打开 http://127.0.0.1:8081/。'
            + '外部 Chrome 的开关不会应用到 Codex 内置浏览器。';
    }
    else if (support.candidate !== 'layout-subtree') {
        detail.textContent = '浏览器已提供实验接口，但接口版本与当前封装要求的 layoutsubtree 不兼容。';
    }
    else {
        detail.textContent = '实验接口已提供，但编辑器初始化或运行失败：' + error.message;
    }
    const requirement = document.createElement('p');
    requirement.textContent = '请在 Chrome 中开启 chrome://flags/#canvas-draw-element 并重启。'
        + '编辑器要求原生 layoutsubtree 接口，以及返回二维 DOMMatrix 的 drawElementImage。';
    notice.append(title, detail);
    notice.appendChild(requirement);
    console.info('HTML in Canvas:', error.code, error.message);
    document.getElementById('toggle').disabled = true;
    document.getElementById('move').disabled = true;
}

async function mountEditor() {
    try {
        host = zrender.createHTMLHost(zr, {
            x: 650, y: 28, width: 438, height: 594, z: 10,
            onStateChange(state) {
                document.getElementById('status').textContent = {
                    pending: '正在连接编辑器…', active: '● 编辑器已连接',
                    suspended: '编辑器已收起', disposed: '编辑器已关闭'
                }[state];
            },
            onError: unavailable
        });
        form = document.createElement('form');
        form.className = 'project-form';
        form.innerHTML = `
            <span class="eyebrow">LIVE EDITOR</span><h2>编辑项目计划</h2>
            <p>每一个好项目，都从清晰的计划开始。</p>
            <label>项目名称<input name="title" required maxlength="16"></label>
            <div class="pair"><label>负责人<input name="owner" required maxlength="10"></label>
            <label>交付日期<input name="date" type="date" required min="2020-01-01" max="2099-12-31"></label></div>
            <label>当前阶段<select name="stage"><option>需求梳理中</option><option>设计进行中</option>
            <option>开发进行中</option><option>已完成</option></select></label>
            <label>项目进度 <output id="progress-value">64%</output>
            <input name="progress" type="range" min="0" max="100"></label>
            <label>项目备注<textarea name="note" maxlength="32"></textarea></label>
            <button type="submit">保存计划 ↗</button>`;
        Object.keys(model).forEach(key => { form.elements.namedItem(key).value = model[key]; });
        form.elements.namedItem('progress').addEventListener('input', event => {
            form.querySelector('output').value = `${event.target.value}%`;
        });
        form.addEventListener('submit', event => {
            event.preventDefault();
            const values = Object.fromEntries(new FormData(form));
            Object.assign(model, values, { progress: Number(values.progress) });
            render();
            document.getElementById('saved').textContent = '已保存 · ' + new Date().toLocaleTimeString('zh-CN');
        });
        host.element.appendChild(form);
        await host.ready;
        document.getElementById('toggle').disabled = false;
        document.getElementById('move').disabled = false;
    }
    catch (error) {
        if (closed) { return; }
        if (form) { form.remove(); }
        if (host) { host.dispose(); }
        unavailable(error);
    }
}

document.getElementById('toggle').addEventListener('click', event => {
    const hidden = !host.sceneElement.ignore;
    hidden ? host.sceneElement.hide() : host.sceneElement.show();
    event.currentTarget.textContent = hidden ? '展开编辑器' : '收起编辑器';
});
document.getElementById('move').addEventListener('click', () => {
    moved = !moved;
    host.updateLayout({ x: moved ? 666 : 650, y: moved ? 44 : 28, width: 438, height: 594 });
});
window.addEventListener('pagehide', event => {
    if (event.persisted) { return; }
    closed = true;
    if (form) { form.remove(); }
    if (host) { host.dispose(); }
    zr.dispose();
});
render();
mountEditor();
