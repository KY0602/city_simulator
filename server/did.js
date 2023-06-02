import crypto from "crypto";
import multibase from "multibase";
import {ab2str} from "./utils.js";

export function generateDIDDocKey(did, multibase) {
    const didDoc = {
        "@context": [
            "https://www.w3.org/ns/did/v1",
            "https://w3id.org/security/suites/ed25519-2020/v1"
        ],
        "_id": did,
        "verificationMethod": [{
            "id": did + "#" + multibase,
            "type": "Ed25519VerificationKey2020",
            "controller": did,
            "publicKeyMultibase": multibase
        }],
        "authentication": [did + "#" + multibase],
        "assertionMethod": [did + "#" + multibase],
        "capabilityDelegation": [did + "#" + multibase],
        "capabilityInvocation": [did + "#" + multibase],
    }

    return didDoc;
}

export function generateKeys() {
    // Generate key pairs
    const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
    // Encode using Multibase base58-btc encoding, and generate DID
    const key_bytes = Buffer.from(publicKey.export({format: 'pem', type: 'spki'}));
    const multibase_publicKey = ab2str(multibase.encode('base58btc', key_bytes));
    const did_publicKey = "did:key:" + multibase_publicKey;
    const did_doc_publicKey = generateDIDDocKey(did_publicKey, multibase_publicKey);

    return {privateKey, did_publicKey, did_doc_publicKey};
}