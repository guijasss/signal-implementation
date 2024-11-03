export function isJson(str: string): boolean {
	try {
		JSON.parse(str);
		return true; // A string é um JSON válido
	} catch (e) {
		return false; // A string não é um JSON válido
	}
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }
    return btoa(binary);
}
