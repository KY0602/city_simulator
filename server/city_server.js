import express from 'express';
import events from 'events';
const app = express();
import bodyParser from 'body-parser';
import cors from 'cors';
import * as IPFS from 'ipfs';
import OrbitDB from 'orbit-db';
import multibase from 'multibase';
import * as DID from './did.js';
import * as utils from './utils.js';
import * as vc from './traffic_vc.js';
const port = 8000;

let privateKey, did_publicKey, did_doc_publicKey;
let privateKey_insurance, did_publicKey_insurance, did_doc_publicKey_insurance;
let privateKey_garage, did_publicKey_garage, did_doc_publicKey_garage;
let db_keys, db_bus, db_vehicle, db_resident, db_police, db_accident, db_hospital, db_resident_hospital;

let bus_keys = [];
let police_keys = [];
let hospital_keys = [];

app.use(bodyParser.json());       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({extended: true}));   // to support URL-encoded bodies
app.use(cors());
events.EventEmitter.defaultMaxListeners = 10000;

// Check if server working
app.get('/', (req, res)=>{
    res.send("Welcome to your server");
})

// Start server on a specified port
app.listen(port, ()=>{
    console.log(`Server is running on port ${port}`);
})

app.post('/generate-vc', (req, res)=>{
    const plate_num = req.body.plateNum.toString();
    const valid = req.body.valid;
    const vc_new = vc.generateVC(plate_num, did_publicKey, privateKey, valid);
    res.send(vc_new);
})

app.post('/generate-immune-vc', (req, res)=> {
    const num = req.body.num.toString();
    const hospital = req.body.hospital.toString();

    // Get Hospital's keys from hospital_keys
    let hospital_did_publicKey = "";
    let hospital_privateKey = "";
    for (var i = 0; i < hospital_keys.length; i++) {
        if (hospital_keys[i].num == hospital) {
            hospital_did_publicKey = hospital_keys[i].public_key;
            hospital_privateKey = hospital_keys[i].private_key;
            break;
        }
    }

    const vc_new = vc.generateImmuneVC(num, hospital, 0, hospital_did_publicKey, hospital_privateKey);
    res.send(vc_new);
})

app.post('/verify-identity-vc', (req, res)=>{
    let payload = req.body.vc;
    // Remove proof from payload
    delete payload.proof;
    const signature = req.body.signature;
    const issuer_did = payload.issuer;
    verify_vc(payload, signature, issuer_did).then(r => {
        if (r) {
            res.send(true);
        } else {
            res.send(false);
        }
    })
})

app.post('/verify-vc', (req, res)=>{
    let payload = req.body.vc;
    // Remove proof from payload
    delete payload.proof;
    const signature = req.body.signature;
    const issuer_did = payload.issuer;
    verify_vc2(payload, signature, issuer_did).then(r => {
        if (r) {
            res.send(true);
        } else {
            res.send(false);
        }
    });
})

app.post('/search-bus', (req, res)=>{
    const plate_num = req.body.plateNum.toString();
    let bus = db_bus.get(plate_num)[0];

    res.send(bus);
})

app.post('/search-vehicle', (req, res)=>{
    const plate_num = req.body.plateNum.toString();
    let vehicle = db_vehicle.get(plate_num)[0];

    res.send(vehicle);
})

app.post('/search-police', (req, res)=>{
    const num = req.body.num.toString();
    let police = db_police.get(num)[0];

    res.send(police);
})

app.post('/search-resident', (req, res)=>{
    const num = req.body.num.toString();
    let resident = db_resident.get(num)[0];

    res.send(resident);
})

app.post('/search-accident', (req, res)=>{
    const plate_num = req.body.plateNum.toString();
    const accidents = db_accident.query((doc) => (doc.vehicle_plate_num1 == plate_num || doc.vehicle_plate_num2 == plate_num));

    res.send(accidents);
})

app.post('/search-hospital', async (req, res)=>{
    const num = req.body.num.toString();
    const hospital = db_hospital.get(num)[0];
    if (hospital) {
        // Search in db_resident_hospital, residents in this hospital
        const residents_in_hospital = db_resident_hospital.query((doc) => (doc.quarantine_loc === parseInt(num)));
        // Get _id of residents_in_hospital
        var residents_in_hospital_id = [];
        for (var i = 0; i < residents_in_hospital.length; i++) {
            residents_in_hospital_id.push(residents_in_hospital[i]._id);
        }
        hospital.patients = residents_in_hospital_id;
        res.send(hospital);
    }
})

app.post('/add-bus', async (req, res)=> {
    const plate_num = req.body.plateNum.toString();
    db_bus.put({_id: plate_num, mileage: 0, history: []});

    // Generate and store key for bus
    let res_gen = DID.generateKeys();
    let tmp = {};
    tmp["num"] = plate_num;
    tmp["private_key"] = res_gen.privateKey;
    tmp["public_key"] = res_gen.did_publicKey;
    tmp["did_doc"] = res_gen.did_doc_publicKey;
    bus_keys.push(tmp);

    await db_keys.put({
        _id: res_gen.did_publicKey,
        doc: res_gen.did_doc_publicKey,
    });

    res.send("Bus added!");
})

app.post('/update-bus-mileage', (req, res)=>{
    const plate_num = req.body.plateNum.toString();
    const mileage = req.body.mileage;
    const history = req.body.history;
    const time = req.body.time;

    db_bus.put({_id: plate_num, mileage: mileage, history: history});

    const vc_new = vc.generateMileageVC(plate_num, did_publicKey, privateKey, mileage, time);
    res.send(vc_new);
})

app.post('/update-vehicle-mileage', (req, res)=>{
    const plate_num = req.body.plateNum.toString();
    const mileage = req.body.mileage;
    const deducted_points = req.body.deductedPoints;
    const history = req.body.history;
    const time = req.body.time;

    db_vehicle.put({_id: plate_num, mileage: mileage, deducted_points: deducted_points, history: history});

    const vc_new = vc.generateMileageVC(plate_num, did_publicKey, privateKey, mileage, time);
    res.send(vc_new);
})

app.post('/update-resident-travel', (req, res)=>{
    const num = req.body.num.toString();
    const infection_status = req.body.infectionStatus;
    const quarantine_loc = req.body.quarantineLoc;
    const history = req.body.history;
    const recover_time = req.body.recoverTime;
    const time = req.body.time;
    const bus_num = req.body.busNum;
    const on_station = req.body.onStation;
    const off_station = req.body.offStation;

    db_resident.put({_id: num, infection_status: infection_status, quarantine_loc: quarantine_loc,
        history: history, recover_time: recover_time});

    // Get bus key from bus_keys
    let bus_did_publicKey = "";
    let bus_privateKey = "";
    for (let i = 0; i < bus_keys.length; i++) {
        if (bus_keys[i].num === bus_num) {
            bus_did_publicKey = bus_keys[i].public_key;
            bus_privateKey = bus_keys[i].private_key;
            break;
        }
    }

    if (bus_privateKey == "") return;

    const vc_new = vc.generateBusVC(num, bus_did_publicKey, bus_privateKey, bus_num, time, on_station, off_station);
    res.send(vc_new);
})

app.post('/modify-resident-infection-status', async (req, res)=>{
    const num = req.body.num.toString();
    const infection_status = req.body.infection_status;
    const quarantine_loc = req.body.quarantine_loc;
    const history = req.body.history;
    const recover_time = req.body.recover_time;
    // If recovered, generate Immune VC
    if (infection_status == 2) {
        // Get Hospital's keys from hospital_keys
        let hospital_did_publicKey = "";
        let hospital_privateKey = "";
        for (var i = 0; i < hospital_keys.length; i++) {
            if (hospital_keys[i].num == quarantine_loc) {
                hospital_did_publicKey = hospital_keys[i].public_key;
                hospital_privateKey = hospital_keys[i].private_key;
                break;
            }
        }

        db_resident.put({_id: num, infection_status: infection_status,
            quarantine_loc: -1, history: history, recover_time: recover_time});
        const vc_new = vc.generateImmuneVC(num, quarantine_loc, recover_time, hospital_did_publicKey, hospital_privateKey);
        res.send(vc_new);
    } else {
        db_resident.put({_id: num, infection_status: infection_status,
            quarantine_loc: quarantine_loc, history: history, recover_time: recover_time});
        res.send("Resident modified!");
    }
})

app.post('/add-police', async (req, res)=> {
    const plate_num = req.body.plateNum.toString();

    // Generate and store Police Car's public key
    let res_gen = DID.generateKeys();
    let tmp = {};
    tmp["plate_num"] = plate_num;
    tmp["private_key"] = res_gen.privateKey;
    tmp["public_key"] = res_gen.did_publicKey;
    tmp["did_doc"] = res_gen.did_doc_publicKey;
    police_keys.push(tmp);

    await db_keys.put({
        _id: res_gen.did_publicKey,
        doc: res_gen.did_doc_publicKey
    });

    res.send("Police car added!");
})

app.post('/update-police-mileage', (req, res)=>{
    const plate_num = req.body.plateNum.toString();
    const mileage = req.body.mileage;
    const history = req.body.history;
    const time = req.body.time;

    db_police.put({_id: plate_num, mileage: mileage, history: history});

    const vc_new = vc.generateMileageVC(plate_num, did_publicKey, privateKey, mileage, time);
    res.send(vc_new);
})

app.post('/fine-vehicle', (req, res)=> {
    const plate_num = req.body.plateNum.toString();
    const mileage = req.body.mileage;
    const deducted_points = req.body.deductedPoints;
    const history = req.body.history;
    const fine = req.body.fine;
    const time = req.body.time;
    const police_num = req.body.policeNum.toString();

    db_vehicle.put({_id: plate_num, mileage: mileage, deducted_points: deducted_points + fine, history: history});

    // Get police's key from police_keys
    let police_did_publicKey = "";
    let police_privateKey = "";
    for (let i = 0; i < police_keys.length; i++) {
        if (police_keys[i].plate_num == police_num) {
            police_did_publicKey = police_keys[i].public_key;
            police_privateKey = police_keys[i].private_key;
        }
    }

    const vc_new = vc.generateFineVC(plate_num, police_did_publicKey, police_privateKey, deducted_points + fine, time);
    res.send(vc_new);
})

app.post('/vehicle-serviced', (req, res)=>{
    const plate_num = req.body.plateNum;
    const mileage = req.body.mileage;
    const deducted_points = req.body.deductedPoints;
    const history = req.body.history;
    const time = req.body.time;

    db_vehicle.put({_id: plate_num, mileage: mileage, deducted_points: deducted_points, history: history});

    const vc_new = vc.generateServiceVC(plate_num.toString(), did_publicKey_garage, privateKey_garage, time);
    res.send(vc_new);
})

app.post('/bus-serviced', (req, res)=>{
    const plate_num = req.body.plateNum;
    const mileage = req.body.mileage;
    const history = req.body.history;
    const time = req.body.time;

    db_bus.put({_id: plate_num, mileage: mileage, history: history});

    const vc_new = vc.generateServiceVC(plate_num.toString(), did_publicKey_garage, privateKey_garage, time);
    res.send(vc_new);
})

app.post('/add-accident', async (req, res)=>{
    const vehicle_plate_num1 = req.body.plateNum1.toString();
    const vehicle_plate_num2 = req.body.plateNum2.toString();
    const time = req.body.time;
    const location = req.body.location;
    const responsible = req.body.responsible;
    // Random ID
    const id = utils.hash(vehicle_plate_num1 + vehicle_plate_num2 + time);
    db_accident.put({_id: id, vehicle_plate_num1: vehicle_plate_num1, vehicle_plate_num2: vehicle_plate_num2,
        time: time, location: location, responsible: responsible});

    const vc_new = vc.generateAccidentVC(id, did_publicKey_insurance, privateKey_insurance, vehicle_plate_num1,
        vehicle_plate_num2, time, location, responsible);
    res.send(vc_new);
})

app.post('/add-hospital', async (req, res)=>{
    const num = req.body.num.toString();
    db_hospital.put({_id: num, no_of_patients: 0});
    // Generate and store Hospital's public keys
    let res_gen = DID.generateKeys();
    let tmp = {};
    tmp["num"] = parseInt(num);
    tmp["private_key"] = res_gen.privateKey;
    tmp["public_key"] = res_gen.did_publicKey;
    tmp["did_doc"] = res_gen.did_doc_publicKey;
    hospital_keys.push(tmp);

    await db_keys.put({
        _id: res_gen.did_publicKey,
        doc: res_gen.did_doc_publicKey,
    });

    res.send("Hospital added!");
})

app.post('/add-patients', async (req, res)=>{
    const num = req.body.num.toString();
    const num_of_patients = req.body.num_of_patients;

    db_hospital.put({_id: num, no_of_patients: num_of_patients});
    res.send("Patients added!");
})

app.post('/remove-patient', async (req, res)=>{
    const num = req.body.num.toString();
    const num_of_patients = req.body.num_of_patients;

    db_hospital.put({_id: num, no_of_patients: num_of_patients});
    res.send("Patients removed!");
})

async function verify_vc(payload, signature, issuer_did) {
    const retrievedDIDDocs = db_keys.get(issuer_did);
    const retrievedKey = retrievedDIDDocs[0].doc.verificationMethod[0].publicKeyMultibase;
    const retrievedKeyBytes = multibase.decode(retrievedKey);
    if (utils.verify(JSON.stringify(payload), signature, utils.ab2str(retrievedKeyBytes))) {
        return true;
    } else {
        return false;
    }
}

async function verify_vc2(payload, signature, issuer_did) {
    const retrievedDIDDocs = db_keys.get(issuer_did);
    if (retrievedDIDDocs[0]) {
        const retrievedKey = retrievedDIDDocs[0].doc.verificationMethod[0].publicKeyMultibase;
        const retrievedKeyBytes = multibase.decode(retrievedKey);
        if (utils.verify2(JSON.stringify(payload), signature, utils.ab2str(retrievedKeyBytes))) {
            return true;
        } else {
            return false;
        }
    }
    return false;
}

async function main() {
    // Create Keys peer
    const ipfs_keys_config = { repo: './ipfs_city_keys',  config: {
        Addresses: {
            Swarm: [
                '/ip4/0.0.0.0/tcp/4021',
                '/ip4/127.0.0.1/tcp/4022/ws'
            ],
            API: '/ip4/127.0.0.1/tcp/5012',
            Gateway: '/ip4/127.0.0.1/tcp/9191'
        }
    }};
    const ipfs_keys = await IPFS.create(ipfs_keys_config);
    // Create Keys Database
    const orbitdb_keys = await OrbitDB.createInstance(ipfs_keys, { directory: './orbitdb_city_keys' });
    db_keys = await orbitdb_keys.docs('keys');
    console.log("Keys database created!");

    // Generate and store public key for Vehicle Registration Authority
    let res_gen = DID.generateKeys();
    privateKey = res_gen.privateKey;
    did_publicKey = res_gen.did_publicKey;
    did_doc_publicKey = res_gen.did_doc_publicKey;

    await db_keys.put({
        _id: did_publicKey,
        doc: did_doc_publicKey,
    });

    // Generate and store public key for Insurance Company
    let res_gen2 = DID.generateKeys();
    privateKey_insurance = res_gen2.privateKey;
    did_publicKey_insurance = res_gen2.did_publicKey;
    did_doc_publicKey_insurance = res_gen2.did_doc_publicKey;

    await db_keys.put({
        _id: did_publicKey_insurance,
        doc: did_doc_publicKey_insurance,
    });

    // Generate and store public key for Garage
    let res_gen3 = DID.generateKeys();
    privateKey_garage = res_gen3.privateKey;
    did_publicKey_garage = res_gen3.did_publicKey;
    did_doc_publicKey_garage = res_gen3.did_doc_publicKey;

    await db_keys.put({
        _id: did_publicKey_garage,
        doc: did_doc_publicKey_garage,
    });

    // Create Bus's peer
    const ipfs_bus_config = { repo: './ipfs_city_bus',  config: {
        Addresses: {
            Swarm: [
                '/ip4/0.0.0.0/tcp/4022',
                '/ip4/127.0.0.1/tcp/4023/ws'
            ],
            API: '/ip4/127.0.0.1/tcp/5012',
            Gateway: '/ip4/127.0.0.1/tcp/9191'
        }
    }};
    const ipfs_bus = await IPFS.create(ipfs_bus_config);
    // Create Bus Database
    const orbitdb_bus = await OrbitDB.createInstance(ipfs_bus, { directory: './orbitdb_city_bus' });
    db_bus = await orbitdb_bus.docs('bus');
    console.log("Bus database created!");

    // Create vehicle's peer
    const ipfs_vehicle_config = { repo: './ipfs_city_vehicle',  config: {
        Addresses: {
            Swarm: [
                '/ip4/0.0.0.0/tcp/4023',
                '/ip4/127.0.0.1/tcp/4024/ws'
            ],
            API: '/ip4/127.0.0.1/tcp/5012',
            Gateway: '/ip4/127.0.0.1/tcp/9191'
        }
    }};
    const ipfs_vehicle = await IPFS.create(ipfs_vehicle_config);
    // Create vehicle Database
    const orbitdb_vehicle = await OrbitDB.createInstance(ipfs_vehicle, { directory: './orbitdb_city_vehicle' });
    db_vehicle = await orbitdb_vehicle.docs('vehicle');
    console.log("Vehicle database created!");

    // Create Resident's peer
    const ipfs_resident_config = { repo: './ipfs_city_resident',  config: {
        Addresses: {
            Swarm: [
                '/ip4/0.0.0.0/tcp/4024',
                '/ip4/127.0.0.1/tcp/4025/ws'
            ],
            API: '/ip4/127.0.0.1/tcp/5012',
            Gateway: '/ip4/127.0.0.1/tcp/9191'
        }
    }};
    const ipfs_resident = await IPFS.create(ipfs_resident_config);
    // Create resident Database
    const orbitdb_resident = await OrbitDB.createInstance(ipfs_resident, { directory: './orbitdb_city_resident' });
    db_resident = await orbitdb_resident.docs('resident');
    console.log("Resident database created!");

    // Create Police Cars peer
    const ipfs_config_police = { repo: './ipfs_city_police', config: {
        Addresses: {
          Swarm: [
            '/ip4/0.0.0.0/tcp/4025',
            '/ip4/127.0.0.1/tcp/4026/ws'
          ],
          API: '/ip4/127.0.0.1/tcp/5012',
          Gateway: '/ip4/127.0.0.1/tcp/9191'
        }
    }}
    const ipfs_police = await IPFS.create(ipfs_config_police);
    const orbitdb_police = await OrbitDB.createInstance(ipfs_police, { directory: './orbitdb_city_police' });
    // Create Police Cars' database
    db_police = await orbitdb_police.docs('policeCars');
    console.log("Police Cars' database created!");

    // Create Insurance peer
    const ipfs_config_insurance = { repo: './ipfs_city_insurance', config: {
        Addresses: {
          Swarm: [
            '/ip4/0.0.0.0/tcp/4026',
            '/ip4/127.0.0.1/tcp/4027/ws'
          ],
          API: '/ip4/127.0.0.1/tcp/5012',
          Gateway: '/ip4/127.0.0.1/tcp/9191'
        }
    }}
    const ipfs_insurance = await IPFS.create(ipfs_config_insurance);
    const orbitdb_insurance = await OrbitDB.createInstance(ipfs_insurance, { directory: './orbitdb_city_insurance' });
    // Create Accident History's database
    db_accident = await orbitdb_insurance.docs('accident');
    console.log("Accidents database created!");

    // Create Hospital's peer
    const ipfs_hospital_config = { repo: './ipfs_city_hospital', config: {
        Addresses: {
            Swarm: [
                '/ip4/0.0.0.0/tcp/4027',
                '/ip4/127.0.0.1/tcp/4028/ws'
            ],
            API: '/ip4/127.0.0.1/tcp/5012',
            Gateway: '/ip4/127.0.0.1/tcp/9191'
        }
    }};
    const ipfs_hospital = await IPFS.create(ipfs_hospital_config);
    // Create Hospital database
    const orbitdb_hospital = await OrbitDB.createInstance(ipfs_hospital, { directory: './orbitdb_city_hospital' });
    db_hospital = await orbitdb_hospital.docs('db-hospital');
    console.log("Hospital database created!");

    // Open Resident's database for Hospital peer,
    db_resident_hospital = await orbitdb_hospital.docs(db_resident.address.toString());
    console.log('Hospital peer replicated Resident database!');
}

main().then(r => {
    console.log("Initialized");
});