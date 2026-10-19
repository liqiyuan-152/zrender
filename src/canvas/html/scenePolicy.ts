import Displayable from '../../graphic/Displayable';
import BoundingRect from '../../core/BoundingRect';
import { createHTMLHostError, HTMLHostErrorCode } from '../../dom/html/diagnostics';

function reject(host: Displayable, reason: string, target?: Displayable): never {
    throw createHTMLHostError(HTMLHostErrorCode.UNSUPPORTED_SCENE, reason, {
        hostId: host.id,
        targetId: target && target.id,
        failedOperation: 'validateScene'
    });
}

function validRect(rect: BoundingRect) {
    return isFinite(rect.x) && isFinite(rect.y) && isFinite(rect.width) && isFinite(rect.height)
        && rect.width >= 0 && rect.height >= 0;
}

/**
 * Checks the CURRENT, updated and sorted display list before committing native
 * geometry or painting. This check alone neither pauses DOM nor installs a backend.
 * Conservative paint bounds can reject non-overlapping pixels inside those bounds.
 */
export function validateHTMLCanvasScene(host: Displayable, displayList: Displayable[]): void {
    let hostIndex = -1;
    for (let i = 0; i < displayList.length; i++) {
        if (displayList[i] === host) {
            hostIndex = i;
            break;
        }
    }
    if (hostIndex < 0) {
        reject(host, 'HTML host must belong to the current display list');
    }
    const hostRect = host.getPaintRect();
    if (!validRect(hostRect)) {
        reject(host, 'HTML host paint bounds must be finite');
    }
    for (let i = 0; i < displayList.length; i++) {
        const item = displayList[i];
        if (item.ignore || item.invisible || item.style.opacity === 0) {
            continue;
        }
        // These paths can paint outside normal ordering/bounds or change ownership.
        if (item.zlevel !== host.zlevel || item.incremental || item.__inHover
            || (item.__clipPaths && item.__clipPaths.length)) {
            reject(host, 'Native HTML scene requires one normal layer without hover, incremental or clipping', item);
        }
        if (item.style.blend && item.style.blend !== 'source-over') {
            reject(host, 'Native HTML scene requires source-over compositing', item);
        }
        if (item.beforeBrush !== Displayable.prototype.beforeBrush
            || item.afterBrush !== Displayable.prototype.afterBrush) {
            reject(host, 'Custom brush callbacks are unsupported in native HTML scenes', item);
        }
        if (i <= hostIndex) {
            continue;
        }
        const rect = item.getPaintRect();
        if (!validRect(rect)) {
            reject(host, 'Foreground paint bounds must be finite for native HTML', item);
        }
        if (hostRect.intersect(rect)) {
            reject(host,
                'Foreground paint bounds overlap native HTML; native occlusion hit testing is unsupported', item);
        }
    }
}
