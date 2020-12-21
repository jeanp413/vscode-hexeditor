/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export class StringBuilder {

	private _pieces: string[];
	private _piecesLen: number;

	constructor() {
		this._pieces = [];
		this._piecesLen = 0;
	}

	public reset(): void {
		this._pieces = [];
		this._piecesLen = 0;
	}

	public build(): string {
        let ret = '';
        for (const s of this._pieces) {
            ret += s;
        }
		return ret;
	}

	public write1(charCode: number): void {
		this._pieces[this._piecesLen++] = String.fromCharCode(charCode);
	}

	public appendASCII(charCode: number): void {
		this._pieces[this._piecesLen++] = String.fromCharCode(charCode);
	}

	public appendASCIIString(str: string): void {
		this._pieces[this._piecesLen++] = str;
	}
}
