import { createHTMLHostError, HTMLHostErrorCode } from '../../dom/html/diagnostics';

interface VersionData {
    fullVersionList: { brand: string; version: string }[]
}
interface ProfileNavigator extends Navigator {
    userAgentData?: {
        platform: string
        getHighEntropyValues(hints: string[]): Promise<VersionData>
    }
}

/** Interaction evidence is tied to this exact OS/browser profile, not its major version. */
export function verifyHTMLCanvasProfile(navigator: Navigator): Promise<void> {
    const data = (navigator as ProfileNavigator).userAgentData;
    const error = createHTMLHostError(HTMLHostErrorCode.CAPABILITY_MISSING,
        'Native HTML M1 is validated only on Windows Google Chrome 155.0.8059.85 with canvas-draw-element enabled');
    if (!data || data.platform !== 'Windows' || typeof data.getHighEntropyValues !== 'function') {
        return Promise.reject(error);
    }
    return data.getHighEntropyValues(['fullVersionList']).then(result => {
        const versions = result.fullVersionList || [];
        for (let i = 0; i < versions.length; i++) {
            if (versions[i].brand === 'Google Chrome' && versions[i].version === '155.0.8059.85') {
                return;
            }
        }
        throw error;
    });
}
