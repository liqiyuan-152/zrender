import { RectLike } from '../../core/BoundingRect';
import { MatrixArray } from '../../core/matrix';

// Structural types only. Experimental browser interfaces must not augment lib.dom.
export interface HTMLCanvasFeatureSurface {
    content?: string
    layoutSubtree?: boolean
    onpaint?: unknown
    requestPaint?: unknown
    updateElementGeometry?: unknown
    clearElementGeometry?: unknown
}

export interface HTMLCanvasContextFeatureSurface {
    drawElementImage?: unknown
}

export type HTMLCanvasAPICandidate = 'drawable' | 'layout-subtree' | 'unknown';

export interface HTMLLayoutGeometry {
    rect: RectLike
    transform: MatrixArray
}

// M3 owns sequence allocation and snapshot commits. This is not a version manager.
export interface LayoutVersion {
    sequence: number
    geometry: HTMLLayoutGeometry
    committedAt: number | null
    snapshotReady: boolean
}
