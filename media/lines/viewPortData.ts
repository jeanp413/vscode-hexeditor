/**
 * Contains all data needed to render at a specific viewport.
 */
export class ViewportData {
    public readonly startLineNumber: number;
    public readonly endLineNumber: number;
    public readonly relativeVerticalOffset: number[];

    private readonly _byteData: Map<number, Uint8Array>;

    constructor(startLine: number, endLine: number, verticalOffsets : number[], byteData: Map<number, Uint8Array>) {
        this.startLineNumber = startLine;
        this.endLineNumber = endLine;
        this.relativeVerticalOffset = verticalOffsets;
        this._byteData = byteData;
    }

    public getViewLineRenderingData(lineNumber: number): string[] {
        if (lineNumber < this.startLineNumber) {
            lineNumber = this.startLineNumber;
        }

        if (lineNumber > this.endLineNumber) {
            lineNumber = this.endLineNumber;
        }

        const lineByteData = this._byteData.get(lineNumber)!;
		return Array.from(lineByteData, byte => ('0' + byte.toString(16).toUpperCase()).slice(-2));
	}
}
