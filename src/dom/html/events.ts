interface HTMLHostNode extends Node {
    __zrHTMLHost?: boolean
    host?: Node
}

/** Internal ownership marker; application event propagation is left untouched. */
export function markHTMLHost(element: HTMLElement, owned: boolean) {
    if (owned) {
        (element as HTMLHostNode).__zrHTMLHost = true;
    }
    else {
        delete (element as HTMLHostNode).__zrHTMLHost;
    }
}

export function isHTMLHostTarget(target: EventTarget, root: Node): boolean {
    let node = target as HTMLHostNode;
    while (node && node !== root) {
        if (node.__zrHTMLHost) {
            return true;
        }
        // Also handle controls inside a ShadowRoot when the original target is available.
        node = (node.parentNode || node.host) as HTMLHostNode;
    }
    return false;
}
