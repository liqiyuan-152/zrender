import Displayable, { DisplayableProps } from './Displayable';
import BoundingRect from '../core/BoundingRect';
import { ZRenderType } from '../zrender';
import { createHTMLHostError, HTMLHostErrorCode } from '../dom/html/diagnostics';

export interface HTMLProps extends DisplayableProps {
    width?: number
    height?: number
}

export interface HTMLHostBridge {
    add(zr: ZRenderType): void
    remove(): void
    draw(ctx: CanvasRenderingContext2D): void
}

/** Created and owned by createHTMLHost. Application children belong to its DOM element. */
export default class HTML extends Displayable<HTMLProps> {
    width: number
    height: number
    /** @internal */
    __htmlHost: HTMLHostBridge

    constructor(props?: HTMLProps) {
        super(props);
        this.width = props && props.width || 0;
        this.height = props && props.height || 0;
        this.silent = true;
    }

    /** @internal Sizes are synchronized with the DOM by the host controller. */
    setLayoutSize(width: number, height: number) {
        if (this.width !== width || this.height !== height) {
            this.width = width;
            this.height = height;
            this._rect = null;
            this.markRedraw();
        }
    }

    getBoundingRect() {
        return this._rect || (this._rect = new BoundingRect(0, 0, this.width, this.height));
    }

    addSelfToZr(zr: ZRenderType) {
        if (!this.__htmlHost) {
            throw createHTMLHostError(HTMLHostErrorCode.INVALID_OPTIONS,
                'HTML elements must be created with createHTMLHost', { hostId: this.id });
        }
        this.__htmlHost.add(zr);
        super.addSelfToZr(zr);
    }

    removeSelfFromZr(zr: ZRenderType) {
        super.removeSelfFromZr(zr);
        this.__htmlHost && this.__htmlHost.remove();
    }
}

HTML.prototype.type = 'html';
