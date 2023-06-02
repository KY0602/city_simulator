import * as utils from './utils.js';

export function generateVC(plateNum, issuerPublic, issuerPrivate, valid) {
    const vehicle_id = utils.hash(plateNum);
    const random_name = Math.random().toString(36).slice(2, 12);
    const owner_id = utils.hash(random_name);

    // Set random issuance date
    const random_year = Math.floor(Math.random() * 10) + 2010;
    const random_month = Math.floor(Math.random() * 12);
    const random_day = Math.floor(Math.random() * 28);
    const issuanceDate = new Date(random_year, random_month, random_day).toISOString();

    // Get current year
    const currentYear = new Date().getFullYear();
    let expiryDate = new Date(currentYear + 5, random_month, random_day).toISOString();

    // Get current time
    const currentTime = new Date().toISOString();

    // Type of invalid VC
    let prob = Math.random();

    // VC already expired
    if (!valid && prob < 0.5) {
        expiryDate = new Date(currentYear - 1, random_month, random_day).toISOString();
    }

    // Payload of VC
    const vcData = {
        '@context': [
            'https://www.w3.org/2018/credentials/v1',
        ],
        'id': vehicle_id,
        'type': [
            'VerifiableCredential',
            'VehicleCredential'
        ],
        'issuer': issuerPublic,
        'issuanceDate': issuanceDate,
        'expirationDate': expiryDate,
        'credentialSubject': {
            'id': vehicle_id,
            'plateNum': plateNum,
            'year': random_year,
            'owner': {
                'id': owner_id,
                'name': random_name
            }
        },
    };

    const signature = utils.sign(JSON.stringify(vcData), issuerPrivate);
    const proof = {
        'type': 'Ed25519Signature2018',
        'created': currentTime,
        'verificationMethod': issuerPublic,
        'proofPurpose': 'assertionMethod',
        'jws': signature
    };
    vcData.proof = proof;

    // VC altered
    if (!valid && prob >= 0.5) {
        vcData.credentialSubject.owner.id = utils.hash('ABCDE');
    }

    return vcData;
}

export function generateMileageVC(plate_num, issuerPublic, issuerPrivate, mileage, time) {
    const vehicle_id = utils.hash(plate_num);
    const random_name = Math.random().toString(36).slice(2, 12);

    // Get Current Date
    let currentDate = new Date().toISOString();

    const vcData = {
        '@context': [
            'https://www.w3.org/2018/credentials/v1',
        ],
        'id': vehicle_id,
        'type': [
            'VerifiableCredential',
            'MileageCredential'
        ],
        'issuer': issuerPublic,
        'issuanceDate': currentDate,
        'credentialSubject': {
            'id': vehicle_id,
            'name': random_name,
            'plateNum': plate_num,
            'mileage': mileage,
            'time': time
        },
    };

    const signature = utils.sign(JSON.stringify(vcData), issuerPrivate);
    const proof = {
        'type': 'Ed25519Signature2018',
        'created': currentDate,
        'verificationMethod': issuerPublic,
        'proofPurpose': 'assertionMethod',
        'jws': signature
    };
    vcData.proof = proof;

    return vcData;
}

export function generateFineVC(plate_num, issuerPublic, issuerPrivate, deducted_points, time) {
    const vehicle_id = utils.hash(plate_num);
    const random_name = Math.random().toString(36).slice(2, 12);

    // Get Current Date
    let currentDate = new Date().toISOString();

    const vcData = {
        '@context': [
            'https://www.w3.org/2018/credentials/v1',
        ],
        'id': vehicle_id,
        'type': [
            'VerifiableCredential',
            'FineCredential'
        ],
        'issuer': issuerPublic,
        'issuanceDate': currentDate,
        'credentialSubject': {
            'id': vehicle_id,
            'name': random_name,
            'plateNum': plate_num,
            'deductedPoints': deducted_points,
            'time': time
        },
    };

    const signature = utils.sign(JSON.stringify(vcData), issuerPrivate);
    const proof = {
        'type': 'Ed25519Signature2018',
        'created': currentDate,
        'verificationMethod': issuerPublic,
        'proofPurpose': 'assertionMethod',
        'jws': signature
    };
    vcData.proof = proof;

    return vcData;
}

export function generateServiceVC(plate_num, issuerPublic, issuerPrivate, time) {
    const vehicle_id = utils.hash(plate_num);
    const random_name = Math.random().toString(36).slice(2, 12);

    // Get Current Date
    let currentDate = new Date().toISOString();

    const vcData = {
        '@context': [
            'https://www.w3.org/2018/credentials/v1',
        ],
        'id': vehicle_id,
        'type': [
            'VerifiableCredential',
            'ServiceCredential'
        ],
        'issuer': issuerPublic,
        'issuanceDate': currentDate,
        'credentialSubject': {
            'id': vehicle_id,
            'name': random_name,
            'plateNum': plate_num,
            'time': time
        },
    };

    const signature = utils.sign(JSON.stringify(vcData), issuerPrivate);
    const proof = {
        'type': 'Ed25519Signature2018',
        'created': currentDate,
        'verificationMethod': issuerPublic,
        'proofPurpose': 'assertionMethod',
        'jws': signature
    };
    vcData.proof = proof;

    return vcData;
}

export function generateAccidentVC(id, issuerPublic, issuerPrivate, vehicle_1, vehicle_2, time, location, responsible) {
    // Get Current Date
    let currentDate = new Date().toISOString();

    const vcData = {
        '@context': [
            'https://www.w3.org/2018/credentials/v1',
        ],
        'id': id,
        'type': [
            'VerifiableCredential',
            'AccidentCredential'
        ],
        'issuer': issuerPublic,
        'issuanceDate': currentDate,
        'credentialSubject': {
            'id': id,
            'vehicle_1': vehicle_1,
            'vehicle_2': vehicle_2,
            'time': time,
            'location': location,
            'responsible': responsible
        },
    };

    const signature = utils.sign(JSON.stringify(vcData), issuerPrivate);
    const proof = {
        'type': 'Ed25519Signature2018',
        'created': currentDate,
        'verificationMethod': issuerPublic,
        'proofPurpose': 'assertionMethod',
        'jws': signature
    };
    vcData.proof = proof;

    return vcData;
}

export function generateBusVC(num, issuerPublic, issuerPrivate, bus_num, time, on_station, off_station) {
    const id = utils.hash(num);
    const random_name = Math.random().toString(36).slice(2, 12);

    // Get Current Date
    let currentDate = new Date().toISOString();

    const vcData = {
        '@context': [
            'https://www.w3.org/2018/credentials/v1',
        ],
        'id': id,
        'type': [
            'VerifiableCredential',
            'BusTravelCredential'
        ],
        'issuer': issuerPublic,
        'issuanceDate': currentDate,
        'credentialSubject': {
            'id': id,
            'name': random_name,
            'num': num,
            'bus': bus_num,
            'boarding_station': on_station,
            'leaving_station': off_station,
            'time': time
        },
    };

    const signature = utils.sign(JSON.stringify(vcData), issuerPrivate);
    const proof = {
        'type': 'Ed25519Signature2018',
        'created': currentDate,
        'verificationMethod': issuerPublic,
        'proofPurpose': 'assertionMethod',
        'jws': signature
    };
    vcData.proof = proof;

    return vcData;
}

export function generateImmuneVC(num, hospital, recover_time, issuerPublic, issuerPrivate) {
    const resident_id = utils.hash(num);
    const resident_name = Math.random().toString(36).slice(2, 12);

    // Get current date
    let currentDate = new Date().toISOString();

    // Payload of VC
    const vcData = {
        "@context": [
            "https://www.w3.org/2018/credentials/v1",
        ],
        "id": resident_id,
        "type": [
            "VerifiableCredential",
            "ImmuneCredential"
        ],
        "issuer": issuerPublic,
        "issuanceDate": currentDate,
        "credentialSubject": {
            "id": resident_id,
            "name": resident_name,
            "hospital": hospital,
            "recover_time": recover_time
        },
    };

    const signature = utils.sign(JSON.stringify(vcData), issuerPrivate);
    const proof = {
        "type": "Ed25519Signature2018",
        "created": currentDate,
        "verificationMethod": issuerPublic,
        "proofPurpose": "assertionMethod",
        "jws": signature
    };
    vcData.proof = proof;

    return vcData;
}