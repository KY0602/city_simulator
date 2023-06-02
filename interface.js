async function start_sim_city() {
    cur_status = 0;
    if (agentmap.agents) reset_city();
    let num_of_healthy_residents = parseInt(document.getElementById("num_of_healthy_residents").value);
    let num_of_infected_residents = parseInt(document.getElementById("num_of_infected_residents").value);
    let num_of_vehicles = parseInt(document.getElementById("num_of_vehicles").value);
    let num_of_police = parseInt(document.getElementById("num_of_police").value);
    let num_of_tow = parseInt(document.getElementById("num_of_tow").value);
    let num_of_ambulance = parseInt(document.getElementById("num_of_ambulance").value);
    if ((num_of_infected_residents >= 0) && (num_of_infected_residents >= 0) && (num_of_vehicles >= 0)
        && (num_of_police >= 0) && (num_of_tow >= 0) && (num_of_ambulance >= 0)) {
        // Add buses (1 running, 1 backup)
        start_station_id = 0;
        running = true;
        agentmap.iconagentify(1, busAgentMaker);
        running = false;
        agentmap.iconagentify(1, busAgentMaker);

        healthy_count = Math.floor(num_of_healthy_residents / 2);
        healthy_residents.innerText = healthy_count.toString();
        infected_count = num_of_infected_residents;
        infected_residents.innerText = infected_count.toString();
        quarantined_count = 0;
        quarantined_residents.innerText = quarantined_count.toString();
        recovered_count = Math.ceil(num_of_healthy_residents / 2);
        recovered_residents.innerText = recovered_count.toString();

        // Add vehicles
        for (let i = 0; i < Math.floor(num_of_vehicles / 2); i++) {
            agentmap.iconagentify(1, vehicleAgentMaker);
        }
        isValid = false;
        for (let i = 0; i < Math.ceil(num_of_vehicles / 2); i++) {
            agentmap.iconagentify(1, vehicleAgentMaker);
        }
        isValid = true;

        // Add police cars
        isPolice = true;
        for (let i = 0; i < num_of_police; i++) {
            agentmap.iconagentify(1, vehicleAgentMaker);
        }
        isPolice = false;

        // Add garage and tow trucks
        isTow = true;
        var rand = findRandomUnitNotStation();
        var random_unit = rand.unit;
        var random_unit_id = rand.id;
        random_unit.setStyle({"color": "black", "opacity": 3});
        garage["id"] = random_unit_id;
        garage["center"] = random_unit.getBounds().getCenter();
        for (let i = 0; i < num_of_tow; i++) {
            agentmap.iconagentify(1, vehicleAgentMaker);
        }
        isTow = false;

        // Set fixed location for Hospitals
        numHospital = Math.ceil((num_of_healthy_residents + num_of_infected_residents) / 100);
        for (let i = 0; i < numHospital; i++) {
            var rand = findRandomUnitNotStation();
            var random_unit = rand.unit;
            var random_unit_id = rand.id;
            let tmp = {};
            random_unit.setStyle({"color": "blue", "opacity": 3});
            tmp["id"] = random_unit_id;
            tmp["center"] = random_unit.getBounds().getCenter();
            tmp["amount"] = 0;
            hospital.push(tmp);
            // Add hospital to database
            await addHospital(random_unit_id);
            blockchain.innerHTML += "Hospital " + random_unit_id + " is added to blockchain.<br>";
        }

        // Generate Ambulances
        isAmbulance = true;
        for (let i = 0; i < num_of_ambulance; i++) {
            agentmap.iconagentify(1, vehicleAgentMaker);
        }
        isAmbulance = false;

        // Add healthy residents (not-immune)
        for (let i = 0; i < Math.floor(num_of_healthy_residents / 2); i++) {
            agentmap.agentify(1, residentAgentMaker);
        }
        // Add healthy residents (immune)
        isImmune = true;
        for (let i = 0; i < Math.ceil(num_of_healthy_residents / 2); i++) {
            agentmap.agentify(1, residentAgentMaker);
        }
        isImmune = false;
        // Add infected residents
        isInfected = true;
        for (let i = 0; i < num_of_infected_residents; i++) {
            agentmap.agentify(1, residentAgentMaker);
        }
        isInfected = false;

        agentmap.agents.bindPopup(agentPopupMaker);
        setup();
        agentmap.run();
    } else {
        alert("Please enter number of residents/vehicles/police cars/tow trucks/ambulances!");
    }
}

function stop_sim() {
    agentmap.pause();
}

function resume_sim() {
    agentmap.run();
}

function reset_sim_city() {
    reset_city();
}

function reset_city() {
    if (agentmap.agents) agentmap.clear();
    infected_count = 0;
    healthy_count = 0;
    quarantined_count = 0;
    recovered_count = 0;
    healthy_residents.innerText = healthy_count.toString();
    infected_residents.innerText = infected_count.toString();
    quarantined_residents.innerText = quarantined_count.toString();
    recovered_residents.innerText = recovered_count.toString();
    clock.innerText = 0;
    running = true;
    start_station_id = 0;
    isInfected = false;
    isImmune = false;
    isValid = true;
    isPolice = false;
    isTow = false;
    isAmbulance = false;
    garage = {id: -1, center: null};
    towTruckDest = [];
    numHospital = 0;
    hospital = [];
    ambulanceDest = [];
    buses = [];
    susAgent.clear();
    arv_txt = "";
    exc_txt = "";
    spe_txt = "";
    pol_txt = "";
    gar_txt = "";
    bus_txt = "";
    res_txt = "";
    acc_txt = "";
    jam_txt = "";
    hos_txt = "";
    updateDisplay();
    initialize();
}
