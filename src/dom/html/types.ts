import HTML from '../../graphic/HTML';
import { HTMLHostError } from './diagnostics';

export type HTMLHostState = 'pending' | 'active' | 'suspended' | 'disposed';

/** M1 standalone geometry. Target binding is introduced by M2. */
export interface HTMLHostLayout {
    x?: number
    y?: number
    width: number
    height?: number
}

export interface HTMLHostOptions extends HTMLHostLayout {
    zlevel?: number
    z?: number
    z2?: number
    initializationTimeoutMs?: number
    onError?: (error: HTMLHostError) => void
    onStateChange?: (state: HTMLHostState) => void
}

export interface HTMLHost {
    readonly element: HTMLElement
    readonly sceneElement: HTML
    readonly state: HTMLHostState
    readonly ready: Promise<void>
    updateLayout(config: HTMLHostLayout): void
    dispose(): void
}
