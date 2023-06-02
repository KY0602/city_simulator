import crypto from "crypto";

// Convert array buffer to string
const decoder = new TextDecoder('utf-8');
export function ab2str(buf) {
    return decoder.decode(new Uint8Array(buf));
}

export function hash(string) {
    return crypto.createHash('sha256').update(string).digest('hex');
}

export function sign(payload, privateKey) {
    const data = Buffer.from(payload);
    const sign = crypto.sign(null, data, privateKey);
    return sign.toString('base64');
}

export function verify(payload, signature, publicKey) {
    // Check if signature is valid
    const data = Buffer.from(payload);
    const verified_integrity = crypto.verify(null, data, publicKey, Buffer.from(signature, 'base64'));

    // Check if VC expired
    const vcData = JSON.parse(payload);
    let issuanceDate = vcData.issuanceDate;
    let expirationDate = vcData.expirationDate;
    let currentTime = new Date().toISOString();
    let verified_expiry = (currentTime > issuanceDate && currentTime < expirationDate);

    return verified_integrity && verified_expiry;
}

export function verify2(payload, signature, publicKey) {
    // Check if signature is valid
    const data = Buffer.from(payload);
    const verified_integrity = crypto.verify(null, data, publicKey, Buffer.from(signature, 'base64'));

    return verified_integrity;
}
