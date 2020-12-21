import { StringBuilder } from "../common/stringBuilder";
import { ViewportData } from "./viewPortData";
import { CharCode } from "../common/charCode";

/**
 * Represents a visible line
 */
export interface IVisibleLine {
    getDomNode(): HTMLElement | undefined;
    setDomNode(domNode: HTMLElement): void;

    renderLine(lineNumber: number, deltaTop: number, viewportData: ViewportData, sb: StringBuilder): void;
    layoutLine(lineNumber: number, deltaTop: number): void;
}

export class ViewLine implements IVisibleLine {

    public static readonly CLASS_NAME = 'view-line';

    private _domNode: HTMLElement | undefined;
    private _lineDataString: string | undefined;

    constructor() {
    }

    public getDomNode(): HTMLElement | undefined {
        return this._domNode;
    }

    public setDomNode(domNode: HTMLElement): void {
        this._domNode = domNode;
    }

    private _getReadingTarget(domNode: HTMLElement): HTMLElement {
		return <HTMLSpanElement>domNode.firstChild;
	}

    public getWidth(): number {
		if (!this._domNode) {
			return 0;
		}
		return this._getReadingTarget(this._domNode).offsetWidth;
	}

    public renderLine(lineNumber: number, deltaTop: number, viewportData: ViewportData, sb: StringBuilder): boolean {
        const lineData = viewportData.getViewLineRenderingData(lineNumber);

        const lineDataString = lineData.join('');
        if (lineDataString === this._lineDataString) {
            return false;
        }

        this._lineDataString = lineDataString;

        sb.appendASCIIString('<div style="top:');
        sb.appendASCIIString(String(deltaTop));
        sb.appendASCIIString('px;" class="');
        sb.appendASCIIString(ViewLine.CLASS_NAME);
        sb.appendASCIIString('">');

        renderViewLine(lineData, sb);

        sb.appendASCIIString('</div>');

        return true;
    }

    public layoutLine(lineNumber: number, deltaTop: number): void {
        if (this._domNode) {
            this._domNode.style.top = deltaTop + 'px';
        }
    }
}

function renderViewLine(lineData: string[], sb: StringBuilder): void {
    sb.appendASCIIString('<div>');

    for (const str of lineData) {
        sb.appendASCIIString('<div class="byte-cell">');

        for (let i = 0; i < str.length; i++) {
            const charCode = str.charCodeAt(i);

            switch (charCode) {
                case CharCode.Space:
                    sb.write1(0xA0); // &nbsp;
                    break;

                case CharCode.LessThan:
                    sb.appendASCIIString('&lt;');
                    break;

                case CharCode.GreaterThan:
                    sb.appendASCIIString('&gt;');
                    break;

                case CharCode.Ampersand:
                    sb.appendASCIIString('&amp;');
                    break;

                default:
                    sb.write1(charCode);
            }
        }

        sb.appendASCIIString('</div>');
    }

    sb.appendASCIIString('</div>');
}
