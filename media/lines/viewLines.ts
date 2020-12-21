import { StringBuilder } from "../common/stringBuilder";
import { ViewLine } from "./viewLine";
import { ViewportData } from "./viewPortData";
import { Position } from "../common/position";
import { Range } from "../common/range";

interface IRendererContext {
	rendLineNumberStart: number;
	lines: ViewLine[];
	linesLength: number;
}

export class RenderedLinesCollection {
	private _lines!: ViewLine[];
	private _rendLineNumberStart!: number;

	constructor() {
		this._set(1, []);
	}

	public flush(): void {
		this._set(1, []);
	}

	_set(rendLineNumberStart: number, lines: ViewLine[]): void {
		this._lines = lines;
		this._rendLineNumberStart = rendLineNumberStart;
	}

	_get(): { rendLineNumberStart: number; lines: ViewLine[]; } {
		return {
			rendLineNumberStart: this._rendLineNumberStart,
			lines: this._lines
		};
	}

	/**
	 * @returns Inclusive line number that is inside this collection
	 */
	public getStartLineNumber(): number {
		return this._rendLineNumberStart;
	}

	/**
	 * @returns Inclusive line number that is inside this collection
	 */
	public getEndLineNumber(): number {
		return this._rendLineNumberStart + this._lines.length - 1;
	}

	public getCount(): number {
		return this._lines.length;
	}

	public getLine(lineNumber: number): ViewLine {
		const lineIndex = lineNumber - this._rendLineNumberStart;
		if (lineIndex < 0 || lineIndex >= this._lines.length) {
			throw new Error('Illegal value for lineNumber');
		}
		return this._lines[lineIndex];
	}

	/**
	 * @returns Lines that were removed from this collection
	 */
	public onLinesDeleted(deleteFromLineNumber: number, deleteToLineNumber: number): ViewLine[] | null {
		if (this.getCount() === 0) {
			// no lines
			return null;
		}

		const startLineNumber = this.getStartLineNumber();
		const endLineNumber = this.getEndLineNumber();

		if (deleteToLineNumber < startLineNumber) {
			// deleting above the viewport
			const deleteCnt = deleteToLineNumber - deleteFromLineNumber + 1;
			this._rendLineNumberStart -= deleteCnt;
			return null;
		}

		if (deleteFromLineNumber > endLineNumber) {
			// deleted below the viewport
			return null;
		}

		// Record what needs to be deleted
		const deleteStartLineNumber = Math.max(deleteFromLineNumber, startLineNumber);
		const deleteEndLineNumber = Math.min(deleteToLineNumber, endLineNumber);
		const deleteStartIndex = deleteStartLineNumber - startLineNumber;
		const deleteCount = deleteEndLineNumber - deleteStartLineNumber + 1;

		// Adjust this._rendLineNumberStart for lines deleted above
		if (deleteFromLineNumber < startLineNumber) {
			// Something was deleted above
			let deleteAboveCount = startLineNumber - deleteFromLineNumber;
			this._rendLineNumberStart -= deleteAboveCount;
		}

		const deleted = this._lines.splice(deleteStartIndex, deleteCount);
		return deleted;
	}

	public onLinesInserted(insertFromLineNumber: number, insertToLineNumber: number): ViewLine[] | null {
		if (this.getCount() === 0) {
			// no lines
			return null;
		}

		const startLineNumber = this.getStartLineNumber();
		const endLineNumber = this.getEndLineNumber();

		if (insertToLineNumber <= startLineNumber) {
			// inserting above the viewport
			this._rendLineNumberStart += insertToLineNumber - insertFromLineNumber + 1;
			return null;
		}

		if (insertFromLineNumber > endLineNumber) {
			// inserting below the viewport
			return null;
		}

		const insertStartLineNumber = Math.max(insertFromLineNumber, startLineNumber);
		const insertEndLineNumber = Math.min(insertToLineNumber, endLineNumber);
		const insertStartIndex = insertStartLineNumber - startLineNumber;
		const insertCnt = insertEndLineNumber - insertStartLineNumber + 1;

		// insert inside the viewport
		const newLines: ViewLine[] = [];
		for (let i = 0; i < insertCnt; i++) {
			newLines[i] = new ViewLine();
		}

		const beforeLines = this._lines.slice(0, insertStartIndex);
		const afterLines = this._lines.slice(insertStartIndex, insertStartIndex + (endLineNumber - insertEndLineNumber));
		const deletedLines = this._lines.slice(insertStartIndex + (endLineNumber - insertEndLineNumber));

		this._lines = beforeLines.concat(newLines).concat(afterLines);

		// Adjust this._rendLineNumberStart for lines inserted above
		if (insertFromLineNumber < startLineNumber) {
			let insertAboveCount = startLineNumber - insertFromLineNumber;
			this._rendLineNumberStart += insertAboveCount;
		}

		return deletedLines;
	}
}

export class VisibleLinesCollection {
	public readonly domNode: HTMLElement;
	private readonly _linesCollection: RenderedLinesCollection;

	constructor() {
		this.domNode = this._createDomNode();
		this._linesCollection = new RenderedLinesCollection();
	}

	private _createDomNode(): HTMLElement {
		const domNode = document.createElement('div');
		domNode.className = 'view-layer';
		domNode.style.position = 'absolute';
		domNode.setAttribute('role', 'presentation');
		domNode.setAttribute('aria-hidden', 'true');
		return domNode;
	}

	// ---- begin view event handlers


	// public onFlushed(e: viewEvents.ViewFlushedEvent): boolean {
	// 	this._linesCollection.flush();
	// 	// No need to clear the dom node because a full .innerHTML will occur in ViewLinesRenderer._render
	// 	return true;
	// }

	// public onLinesDeleted(e: viewEvents.ViewLinesDeletedEvent): boolean {
	// 	const deleted = this._linesCollection.onLinesDeleted(e.fromLineNumber, e.toLineNumber);
	// 	if (deleted) {
	// 		// Remove from DOM
	// 		for (let i = 0, len = deleted.length; i < len; i++) {
	// 			const lineDomNode = deleted[i].getDomNode();
	// 			if (lineDomNode) {
	// 				this.domNode.removeChild(lineDomNode);
	// 			}
	// 		}
	// 	}

	// 	return true;
	// }

	// public onLinesInserted(e: viewEvents.ViewLinesInsertedEvent): boolean {
	// 	const deleted = this._linesCollection.onLinesInserted(e.fromLineNumber, e.toLineNumber);
	// 	if (deleted) {
	// 		// Remove from DOM
	// 		for (let i = 0, len = deleted.length; i < len; i++) {
	// 			const lineDomNode = deleted[i].getDomNode();
	// 			if (lineDomNode) {
	// 				this.domNode.removeChild(lineDomNode);
	// 			}
	// 		}
	// 	}

	// 	return true;
	// }

	// ---- end view event handlers

	public getStartLineNumber(): number {
		return this._linesCollection.getStartLineNumber();
	}

	public getEndLineNumber(): number {
		return this._linesCollection.getEndLineNumber();
	}

	public getVisibleLine(lineNumber: number): ViewLine {
		return this._linesCollection.getLine(lineNumber);
	}

	public renderLines(viewportData: ViewportData): void {
		const inp = this._linesCollection._get();

		const renderer = new ViewLinesRenderer(this.domNode, viewportData);

		const ctx: IRendererContext = {
			rendLineNumberStart: inp.rendLineNumberStart,
			lines: inp.lines,
			linesLength: inp.lines.length
		};

		// Decide if this render will do a single update (single large .innerHTML) or many updates (inserting/removing dom nodes)
		const resCtx = renderer.render(ctx, viewportData.startLineNumber, viewportData.endLineNumber, viewportData.relativeVerticalOffset);

		this._linesCollection._set(resCtx.rendLineNumberStart, resCtx.lines);
	}
}

class ViewLinesRenderer {
	readonly domNode: HTMLElement;
	readonly viewportData: ViewportData;

	constructor(domNode: HTMLElement, viewportData: ViewportData) {
		this.domNode = domNode;
		this.viewportData = viewportData;
	}

	public render(inContext: IRendererContext, startLineNumber: number, stopLineNumber: number, deltaTop: number[]): IRendererContext {

		const ctx: IRendererContext = {
			rendLineNumberStart: inContext.rendLineNumberStart,
			lines: inContext.lines.slice(0),
			linesLength: inContext.linesLength
		};

		if ((startLineNumber > ctx.rendLineNumberStart + ctx.linesLength - 1) || (stopLineNumber < ctx.rendLineNumberStart)) {
			// There is no overlap whatsoever
			const lines = [];
			const linesLength = stopLineNumber - startLineNumber + 1;
			for (let i = 0; i < linesLength; i++) {
				lines[i] = new ViewLine();
            }

            ctx.rendLineNumberStart = startLineNumber;
            ctx.lines = lines;
            ctx.linesLength = linesLength;

			this._finishRendering(ctx, true, deltaTop);
			return ctx;
		}

		// Update lines which will remain untouched
		this._renderUntouchedLines(
			ctx,
			Math.max(startLineNumber, ctx.rendLineNumberStart),
			Math.min(stopLineNumber, ctx.rendLineNumberStart + ctx.linesLength - 1),
			deltaTop,
			startLineNumber
		);

		if (startLineNumber < ctx.rendLineNumberStart) {
			// Insert lines before
			const insertCnt = Math.min(ctx.rendLineNumberStart - startLineNumber, stopLineNumber - startLineNumber + 1);
			if (insertCnt > 0) {
				this._insertLinesBefore(ctx, insertCnt);
			}
		} else if (startLineNumber > ctx.rendLineNumberStart) {
			// Remove lines before
			const removeCnt = Math.min(startLineNumber - ctx.rendLineNumberStart, ctx.linesLength);
			if (removeCnt > 0) {
				this._removeLinesBefore(ctx, removeCnt);
			}
		}

		ctx.rendLineNumberStart = startLineNumber;

		if (stopLineNumber > ctx.rendLineNumberStart + ctx.linesLength - 1) {
			// Insert lines after
			const insertCnt = Math.min(stopLineNumber - (ctx.rendLineNumberStart + ctx.linesLength - 1), stopLineNumber - startLineNumber + 1);
			if (insertCnt) {
				this._insertLinesAfter(ctx, insertCnt);
			}
		} else if (stopLineNumber < ctx.rendLineNumberStart + ctx.linesLength - 1) {
			// Remove lines after
			const removeCnt = Math.min((ctx.rendLineNumberStart + ctx.linesLength - 1) - stopLineNumber, ctx.linesLength);
			if (removeCnt > 0) {
				this._removeLinesAfter(ctx, removeCnt);
			}
		}

		this._finishRendering(ctx, false, deltaTop);

		return ctx;
	}

	private _renderUntouchedLines(ctx: IRendererContext, startLineNumber: number, endLineNumber: number, deltaTop: number[], deltaLN: number): void {
		const {rendLineNumberStart, lines} = ctx;
		for (let lineNumber = startLineNumber; lineNumber <= endLineNumber; lineNumber++) {
            const lineIdx = lineNumber - rendLineNumberStart;
            const deltaTopIdx = lineNumber - deltaLN;
			lines[lineIdx].layoutLine(lineNumber, deltaTop[deltaTopIdx]);
		}
	}

	private _insertLinesBefore(ctx: IRendererContext, insertCount: number): void {
		const newLines: ViewLine[] = [];
		for (let i = 0; i < insertCount; i++) {
			newLines[i] = new ViewLine();
		}
		ctx.lines = newLines.concat(ctx.lines);
		ctx.linesLength += insertCount;
	}

	private _removeLinesBefore(ctx: IRendererContext, removeCount: number): void {
		for (let i = 0; i < removeCount; i++) {
			const lineDomNode = ctx.lines[i].getDomNode();
			if (lineDomNode) {
				this.domNode.removeChild(lineDomNode);
			}
		}
		ctx.lines.splice(0, removeCount);
		ctx.linesLength -= removeCount;
	}

	private _insertLinesAfter(ctx: IRendererContext, insertCount: number): void {
		const newLines: ViewLine[] = [];
		for (let i = 0; i < insertCount; i++) {
			newLines[i] = new ViewLine();
		}
		ctx.lines = ctx.lines.concat(newLines);
		ctx.linesLength += insertCount;
	}

	private _removeLinesAfter(ctx: IRendererContext, removeCount: number): void {
		const removeIndex = ctx.linesLength - removeCount;
		for (let i = 0; i < removeCount; i++) {
			const lineDomNode = ctx.lines[removeIndex + i].getDomNode();
			if (lineDomNode) {
				this.domNode.removeChild(lineDomNode);
			}
		}
		ctx.lines.splice(removeIndex, removeCount);
		ctx.linesLength -= removeCount;
	}

	private _finishRenderingNewLines(ctx: IRendererContext, domNodeIsEmpty: boolean, newLinesHTML: string, wasNew: boolean[]): void {
		const lastChild = <HTMLElement>this.domNode.lastChild;
		if (domNodeIsEmpty || !lastChild) {
			this.domNode.innerHTML = newLinesHTML;
		} else {
			lastChild.insertAdjacentHTML('afterend', newLinesHTML);
		}

        let currChild = <HTMLElement>this.domNode.lastChild;
        const {lines, linesLength} = ctx;
		for (let i = linesLength - 1; i >= 0; i--) {
            const line = lines[i];
			if (wasNew[i]) {
				line.setDomNode(currChild);
				currChild = <HTMLElement>currChild.previousSibling;
			}
		}
	}

	private _finishRenderingInvalidLines(ctx: IRendererContext, invalidLinesHTML: string, wasInvalid: boolean[]): void {
		const hugeDomNode = document.createElement('div');
        hugeDomNode.innerHTML = invalidLinesHTML;

        const {lines, linesLength} = ctx;
		for (let i = 0; i < linesLength; i++) {
			const line = lines[i];
			if (wasInvalid[i]) {
				const source = <HTMLElement>hugeDomNode.firstChild;
				const lineDomNode = line.getDomNode()!;
				lineDomNode.parentNode!.replaceChild(source, lineDomNode);
				line.setDomNode(source);
			}
		}
	}

	private static readonly _sb = new StringBuilder();

	private _finishRendering(ctx: IRendererContext, domNodeIsEmpty: boolean, deltaTop: number[]): void {

		const sb = ViewLinesRenderer._sb;
		const {lines, linesLength, rendLineNumberStart} = ctx;

		const wasNew: boolean[] = [];
		{
			sb.reset();
			let hadNewLine = false;

			for (let i = 0; i < linesLength; i++) {
				const line = lines[i];
				wasNew[i] = false;

				const lineDomNode = line.getDomNode();
				if (lineDomNode) {
					// line is not new
					continue;
				}

				const renderResult = line.renderLine(i + rendLineNumberStart, deltaTop[i], this.viewportData, sb);
				if (!renderResult) {
					// line does not need rendering
					continue;
				}

				wasNew[i] = true;
				hadNewLine = true;
			}

			if (hadNewLine) {
				this._finishRenderingNewLines(ctx, domNodeIsEmpty, sb.build(), wasNew);
			}
		}

		{
			sb.reset();

			let hadInvalidLine = false;
			const wasInvalid: boolean[] = [];

			for (let i = 0; i < linesLength; i++) {
				const line = lines[i];
				wasInvalid[i] = false;

				if (wasNew[i]) {
					// line was new
					continue;
				}

				const renderResult = line.renderLine(i + rendLineNumberStart, deltaTop[i], this.viewportData, sb);
				if (!renderResult) {
					// line does not need rendering
					continue;
				}

				wasInvalid[i] = true;
				hadInvalidLine = true;
			}

			if (hadInvalidLine) {
				this._finishRenderingInvalidLines(ctx, sb.build(), wasInvalid);
			}
		}
	}
}

export class ViewLines {
	/**
	 * Adds this amount of pixels to the right of lines (no-one wants to type near the edge of the viewport)
	 */
	private static readonly HORIZONTAL_EXTRA_PX = 30;

	public static readonly CLASS_NAME = 'view-lines';

	private _context: ViewContext;

	private readonly _linesContent: HTMLElement;
	private readonly _visibleLines: VisibleLinesCollection;
	private readonly domNode: HTMLElement;

	// --- config
	private _lineHeight: number;

	constructor(context: ViewContext, linesContent: HTMLElement) {
		this._context = context;
		this._linesContent = linesContent;
		this._visibleLines = new VisibleLinesCollection();
		this.domNode = this._visibleLines.domNode;

		this._lineHeight = 14;

		this.domNode.className = ViewLines.CLASS_NAME;
	}

	public getDomNode(): HTMLElement {
		return this.domNode;
	}

	// ---- begin view event handlers

	// public onFlushed(e: viewEvents.ViewFlushedEvent): boolean {
	// 	const shouldRender = this._visibleLines.onFlushed(e);
	// 	this._maxLineWidth = 0;
	// 	return shouldRender;
	// }
	// public onLinesChanged(e: viewEvents.ViewLinesChangedEvent): boolean {
	// 	return this._visibleLines.onLinesChanged(e);
	// }
	// public onLinesDeleted(e: viewEvents.ViewLinesDeletedEvent): boolean {
	// 	return this._visibleLines.onLinesDeleted(e);
	// }
	// public onLinesInserted(e: viewEvents.ViewLinesInsertedEvent): boolean {
	// 	return this._visibleLines.onLinesInserted(e);
	// }

	// ---- end view event handlers

	// ----------- HELPERS FOR OTHERS


	public getLineWidth(lineNumber: number): number {
		const rendStartLineNumber = this._visibleLines.getStartLineNumber();
		const rendEndLineNumber = this._visibleLines.getEndLineNumber();
		if (lineNumber < rendStartLineNumber || lineNumber > rendEndLineNumber) {
			// Couldn't find line
			return -1;
		}

		return this._visibleLines.getVisibleLine(lineNumber).getWidth();
	}


	public renderText(viewportData: ViewportData): void {
		// (1) render lines - ensures lines are in the DOM
		this._visibleLines.renderLines(viewportData);
		this.domNode.style.width = this._context.viewLayout.getScrollWidth() + 'px';
		this.domNode.style.height = Math.min(this._context.viewLayout.getScrollHeight(), 1000000) + 'px';

		// (3) handle scrolling
		this._linesContent.style.transform = 'translate3d(0px, 0px, 0px)';
		(<any>this._linesContent.style).contain = ('strict');
		const adjustedScrollTop = this._context.viewLayout.getCurrentScrollTop();
		this._linesContent.style.top = (-adjustedScrollTop) + 'px';
		// this._linesContent.style.left = (-this._context.viewLayout.getCurrentScrollLeft()) + 'px';
	}
}
