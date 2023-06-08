let maps = document.getElementById("maps");
// let bounding_points = [[40.0254000, 116.9474000], [40.0479000, 116.9652000]];
let bounding_points = [[40.0265, 116.9441000], [40.0452000, 116.9665000]];
let map = L.map("demo_map", {
    fullscreenControl: true,
}).fitBounds(bounding_points);
L.tileLayer(
    "http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
        attribution: "Thanks to <a href=\"http://openstreetmap.org\">OpenStreetMap</a> community",
        maxZoom: 18
    }
).addTo(map);
map.setView([40.033, 116.956], 15);

// map.on("click", function (e) {
//     let coord = e.latlng;
//
//     let closest_unit = getUnitFromCoord(coord, false);
//     let unit = agentmap.units.getLayer(closest_unit.id);
//     console.log(unit.feature.properties.id);
// })

function initialize() {
    // agentmap.buildingify(bounding_points, test, undefined, {"color": "green", "weight": 1.5, "opacity": .6}, test_units_data, test_streets_data);
    agentmap.buildingify(bounding_points, sanhe, undefined, {"color": "green", "weight": 1.5, "opacity": .6}, units_data, streets_data);

    agentmap.bus_stations = getBusStations(agentmap);
    // Rearrange
    var tmp = [];
    var target = stations.slice();
    for (let i = 0; i < target.length; i++) {
        for (let j = 0; j < agentmap.bus_stations.length; j++) {
            if (agentmap.bus_stations[j].property_id == target[i]) {
                agentmap.bus_stations[j].stop_id = i;
                tmp.push(agentmap.bus_stations[j]);
                break;
            }
        }
    }
    agentmap.bus_stations = tmp;
}

function getBusStations(agentmap) {
    var bus_stations = [];
    var target = stations.slice();
    agentmap.units.eachLayer(function (unit) {
        unit.residents_num = [];
        unit.waiting = [];
        if (target.includes(unit.feature.properties.id)) {
            target.splice(target.indexOf(unit.feature.properties.id), 1);
            bus_stations.push({"id": unit._leaflet_id, "property_id": unit.feature.properties.id,
                "center": unit.getBounds().getCenter()});
            unit.setStyle({color: "orange", "opacity": 3});
        }
    });

    return bus_stations;
}

let agentmap = L.A.agentmap(map);
let clock = document.getElementById("clock");
let blockchain = document.getElementById("blockchain");
let server_url = "http://localhost:8000";
let healthy_residents = document.getElementById("healthy_residents");
let infected_residents = document.getElementById("infected_residents");
let quarantined_residents = document.getElementById("quarantined_residents");
let recovered_residents = document.getElementById("recovered_residents");
let infected_count = 0;
let healthy_count = 0;
let quarantined_count = 0;
let recovered_count = 0;
let arv_txt = "";
let exc_txt = "";
let spe_txt = "";
let pol_txt = "";
let gar_txt = "";
let bus_txt = "";
let res_txt = "";
let acc_txt = "";
let jam_txt = "";
let hos_txt = "";
let prob_home = 0.5;
let running = true;
let start_station_id = 0;
let isInfected = false;
let isImmune = false;
let isValid = true;
let isPolice = false;
let isTow = false;
let isAmbulance = false;
let susAgent = new Set();
let garage = {id: -1, center: null};
let towTruckDest = [];
let numHospital = 0;
let hospital = [];
let ambulanceDest = [];
let buses = [];
let stations = [147, 58, 1303, 1220, 1408, 744, 796, 562];
let intervals = [500, 500, 1000, 500, 1000, 1000, 500, 500, 500, 500];
initialize();

function residentAgentMaker(id) {
    let num = Math.floor(Math.random() * (9999 - 1000) + 1000);
    var color = "blue";
    var recover_time = -1;
    if (isInfected) {
        color = "red";
    } else if (isImmune) {
        color = "green";
        recover_time = 0;
    }

    var rand = findRandomUnitNotStation();
    var random_unit_id = rand.id;
    var random_unit = rand.unit;

    let feature = {
        "type": "Feature",
        "properties": {
            "place": {
                "type": "unit",
                "id": random_unit_id,
            },
            "layer_options": {
                "color": color,
                "radius": .5
            },
            "num": num,
            "type": "resident",
            "immune_vc": null,
            "isInfected": isInfected,
            "isImmune": isImmune,
            "recover_time": recover_time,
            "reported": false,
            "reached_hospital": false,
            "target_hospital": null,
            "home": {"id": random_unit_id, "center": random_unit.getBounds().getCenter()},
            "speed": 1,
            "reachedDest": false,
            "reachedFinalDest": false,
            "dest_id": -1,
            "travel_stops": {},
            "boarded_bus": -1,
            "arrivalTicks": 0,
            "history": [],
            "vc": []
        },
        "geometry": {
            "type": "Point",
            "coordinates": L.A.pointToCoordinateArray(random_unit.getBounds().getCenter()),
        },
    };

    return feature;
}

function vehicleAgentMaker(id) {
    let num = Math.floor(Math.random() * (9999 - 1000) + 1000);
    var speed = Math.random() * 5 + 1;
    var icon = black_icon_right;
    var type = "car";
    var reached_dest = false;

    var rand = findRandomUnitNotStation();
    var random_unit_id = rand.id;
    var random_unit = rand.unit;

    if (!isValid) icon = red_icon_right;
    if (isPolice) {
        num = "P" + num;
        icon = police_icon_right;
        type = "police";
    } else if (isTow) {
        num = "T" + num;
        icon = tow_truck_icon_right;
        type = "tow";
        random_unit_id = garage["id"];
        random_unit = agentmap.units.getLayer(garage["id"]);
        reached_dest = true;
        speed = 3;
    } else if (isAmbulance) {
        num = "A" + num;
        icon = ambulance_icon_right;
        type = "ambulance";
        random_unit_id = hospital[0]["id"];
        random_unit = agentmap.units.getLayer(hospital[0]["id"]);
        reached_dest = true;
        speed = 5;
    }
    else num = "V" + num;

    let feature = {
        "type": "Feature",
        "properties": {
            "place": {
                "type": "unit",
                "id": random_unit_id,
            },
            "icon": icon,
            "num": num,
            "type": type,
            "vc": null,
            "valid": isValid,
            "prev_vehicle": [],
            "offense": [],
            "isRegisteringVC": false,
            "mileage": 0,
            "mileage_vc": null,
            "deducted_points": 0,
            "fine_vc": null,
            "current_fining": -1,
            "speedingCaught": false,
            "movingToGarage": false,
            "home": {"id": random_unit_id, "center": random_unit.getBounds().getCenter()},
            "speed": speed,
            "reachedDest": reached_dest,
            "dest_id": -1,
            "arrivalTicks": 0,
            "collided": false,
            "collidedTicks": 0,
            "traffic_jam": false,
            "jammedAgents": [],
            "causeJamAgent": null,
            "history": [],
            "accident_vcs": [],
            "accidentAgents": [],
            "inGarage": false,
            "service_vcs": [],
            "currentTarget": null,
            "current_passengers": [],
            "target_hospital": hospital[0],
            "reached_hospital": true,
        },
        "geometry": {
            "type": "Point",
            "coordinates": L.A.pointToCoordinateArray(random_unit.getBounds().getCenter()),
        }
    };
    return feature;
}

function busAgentMaker(id) {
    let num = "B" + Math.floor(Math.random() * (9999 - 1000) + 1000);
    let feature = {
        "type": "Feature",
        "properties": {
            "place": {
                "type": "unit",
                "id": agentmap.bus_stations[start_station_id].id,
            },
            "icon": bus_icon,
            "num": num,
            "type": "bus",
            "vc": null,
            "prev_vehicle": [],
            "offense": [],
            "isRegisteringVC": false,
            "mileage": 0,
            "mileage_vc": null,
            "speed": 3,
            "reachedDest": true,
            "currentStation": start_station_id,
            "running": running,
            "cur_trip": 0,
            "direction": 1,
            "passengers_amount": 0,
            "passengers": [],
            "dest_id": -1,
            "arrivalTicks": 0,
            "waitTicks": 100,
            "collided": false,
            "collidedTicks": 0,
            "traffic_jam": false,
            "jammedAgents": [],
            "causeJamAgent": null,
            "history": [],
            "accident_vcs": [],
            "inGarage": false,
            "service_vcs": [],
        },
        "geometry": {
            "type": "Point",
            "coordinates": L.A.pointToCoordinateArray(agentmap.bus_stations[start_station_id].center),
        }
    };
    return feature;
}

function agentPopupMaker(agent) {
    var string = "ID: " + agent.num + "\n";
    if (agent.type == "resident") {
        if (agent.travel_stops["on"] != null && agent.travel_stops["off"] != null) {
            string += "First Stop: " + agent.travel_stops["on"]["stop_id"] + "\n";
            string += "Final Stop: " + agent.travel_stops["off"]["stop_id"] + "\n";
        }
    } else if (agent.type == "bus") {
        string += "Next stop: " + agent.currentStation + "\n";
        string += "Direction: " + (agent.direction > 1? "Forward":"Backward") + "\n";
    }
    string += "Destination: " + agent.dest_id + "\n";
    return string;
}

function findRandomUnitNotStation() {
    var random_unit, random_unit_id;
    while (true) {
        var random_unit_index = Math.floor(Math.random() * agentmap.units.count());
        random_unit = agentmap.units.getLayers()[random_unit_index];
        random_unit_id = agentmap.units.getLayerId(random_unit);
        let isStation = false;
        for (let i = 0; i < agentmap.bus_stations.length; i++) {
            if (random_unit_id == agentmap.bus_stations[i].id) {
                isStation = true;
                break;
            }
        }
        if (!isStation) {
            break;
        }
    }

    return {"unit": random_unit, "id": random_unit_id};
}

function findNextStation(agent) {
    var next_station_id = agent.currentStation + agent.direction;
    if (next_station_id < 0 || next_station_id >= agentmap.bus_stations.length) {
        agent.direction *= -1;
        next_station_id = agent.currentStation + agent.direction;
    }
    return next_station_id;
}

function findNearestStation(current_place_id) {
    var nearest_station = null;
    var nearest_distance = 0;
    for (let i = 0; i < agentmap.bus_stations.length; i++) {
        var station = agentmap.bus_stations[i];
        var distance = agentmap.units.getLayer(current_place_id).getBounds().getCenter().distanceTo(station.center);
        if (nearest_station == null || distance < nearest_distance) {
            nearest_station = station;
            nearest_distance = distance;
        }
    }
    return nearest_station;
}

function plan_trip(current_place_id, dest) {
    // Find nearest bus station from current place
    var nearest_station = findNearestStation(current_place_id);
    // Find nearest bus station from destination
    var nearest_dest_station = findNearestStation(dest.id);
    var direction = (nearest_dest_station["stop_id"] - nearest_station["stop_id"] >= 0 ? 1 : -1);
    return {"on": nearest_station, "off": nearest_dest_station, "direction": direction, "dest": dest};
}

function busTravel(agent) {
    // Bus travel to next station
    var next_station_id = findNextStation(agent);
    var next_station = agentmap.bus_stations[next_station_id];
    bus_txt += "Bus " + agent.num + " is travelling to Station " + next_station_id + " from Station " + agent.currentStation + ".<br>"
    + agent.num + "公交车从第" + agent.currentStation + "站开往第" + next_station_id + "站。<br>";
    agent.currentStation = next_station_id;
    agent.scheduleTrip(next_station["center"], {type: "unit", id: next_station["id"]}, agent.speed, false, true);
    agent.dest_id = next_station["id"];
    agent.reachedDest = false;
    agent.arrivalTicks = 0;
    updateDisplay();
}

function carTravel(agent) {
    // 50% probability travel to Home if not already at Home
    if (agent.place.id != agent.home.id && Math.random() < 0.5) {
        agent.scheduleTrip(agent.home.center, {type: "unit", id: agent.home.id}, agent.speed, false, true);
        agent.dest_id = agent.home.id;
    } else {
        // Travel to random unit
        let random_unit = getRandomUnit();
        agent.speed = Math.random() * 5 + 1;
        agent.scheduleTrip(random_unit.center, {type: "unit", id: random_unit.id}, agent.speed, false, true);
        agent.dest_id = random_unit.id;
    }
    agent.reachedDest = false;
    agent.arrivalTicks = 0;
}

function residentTravel(agent) {
    // Update unit's resident
    residentLeaveUnit(agent.place.id, agent._leaflet_id);
    // Certain probability travel to Home if not already at Home
    if (agent.place.id != agent.home.id && Math.random() < prob_home) {
        agent.travel_stops = plan_trip(agent.place.id, agent.home);
    } else {
        // Travel to random unit
        let random_unit = getRandomUnit();
        agent.travel_stops = plan_trip(agent.place.id, random_unit);
    }
    agent.reachedDest = false;
    agent.reachedFinalDest = false;
    agent.arrivalTicks = 0;
    if (agent.travel_stops["on"]["id"] == agent.travel_stops["off"]["id"]) {
        // If same station, travel to destination directly
        agent.speed = 1;
        agent.scheduleTrip(agent.travel_stops["dest"]["center"], {type: "unit", id: agent.travel_stops["dest"]["id"]}, agent.speed, false, true);
        agent.dest_id = agent.travel_stops["dest"]["id"];
    } else {
        // Travel to first stop
        agent.speed = 1;
        agent.scheduleTrip(agent.travel_stops["on"]["center"], {type: "unit", id: agent.travel_stops["on"]["id"]}, agent.speed, false, true);
        agent.dest_id = agent.travel_stops["on"]["id"];
    }
}

async function reachedDestination(agent) {
    blockchain.innerHTML += "Mileage of " + agent.num + " recorded in blockchain.<br>" +
        agent.num + "里程表数据已记录在区块链中。<br>";
    agent.mileage += agent.steps_made;

    agent.mileage_vc = await reached(agent, agent.steps_made, agentmap.state.ticks);
}

function residentReachedUnit(unit_id, agent) {
    let unit = agentmap.units.getLayer(unit_id);
    unit.residents_num.push(agent._leaflet_id);
}

function residentLeaveUnit(unit_id, resident_num) {
    let unit = agentmap.units.getLayer(unit_id);
    let index = unit.residents_num.indexOf(resident_num);
    if (index > -1) {
        unit.residents_num.splice(index, 1);
    }
}

function checkInfection(agent) {
    if (agent.place.type == "unit" && !agent.isInfected && !agent.isImmune) {
        var residents_num = agentmap.units.getLayer(agent.place.id).residents_num;
        for (let i = 0; i < residents_num.length; i++) {
            var resident = agentmap.agents.getLayer(residents_num[i]);
            if (resident.isInfected) {
                if (Math.random() < 0.5) {
                    res_txt += "Resident " + agent.num + " infected.<br>"
                    + agent.num + "居民被感染。<br>";
                    updateDisplay();

                    healthy_count--;
                    infected_count++;
                    healthy_residents.innerText = healthy_count.toString();
                    infected_residents.innerText = infected_count.toString();

                    agent.isInfected = true;
                    agent.setStyle({color: "red"});
                    break;
                }
            }
        }
    }
}

function setup() {
    agentmap.agents.eachLayer(async function(agent) {
        if (agent.type == "bus") {
            buses.push(agent);
            agent.vc = await generateVC(agent.num, true);
            await addBus(agent.num);
            // If running
            if (agent.running) {
                busTravel(agent);
            }
        } else if (agent.type == "car") {
            agent.vc = await generateVC(agent.num, agent.valid);
            carTravel(agent);
        } else if (agent.type == "police") {
            agent.vc = await generateVC(agent.num, true);
            await addPolice(agent.num);
            carTravel(agent);
        } else if (agent.type == "tow" || agent.type == "ambulance") {
            agent.vc = await generateVC(agent.num, true);
        } else if (agent.type == "resident") {
            if (agent.isImmune) agent.immune_vc = await generateImmuneVC(agent.num, hospital[0]["id"]);
            residentTravel(agent);
        }

        agent.controller = function() {
            agent.moveIt();
        }

        agent.fine_controller = async function () {
            clock.innerText = agentmap.state.ticks;

            if (agent.type == "bus") {
                if (!agent.running) return;
                // Bus arrived in destination
                if ((agent.place.id == agent.dest_id) && !agent.reachedDest) {
                    // If reached Station 0, next trip after intervals[cur_trip]
                    if (agent.currentStation == 0) {
                        agent.waitTicks = intervals[agent.cur_trip % intervals.length];
                        agent.cur_trip++;
                    }
                    agent.reachedDest = true;
                    agent.passengers_amount = 0;
                    bus_txt += "Bus " + agent.num + " has arrived at Station "
                        + agentmap.bus_stations[agent.currentStation].stop_id +
                        " after travelling for " +  agent.steps_made + " miles.<br>"
                        + agent.num + "公交车在第" + agentmap.bus_stations[agent.currentStation].stop_id
                        + "站停靠，行驶了" + agent.steps_made + "英里。<br>";
                    updateDisplay();
                    reachedDestination(agent);

                    // If travelling to garage
                    if (agent.movingToGarage) {
                        gar_txt += "Bus " + agent.num + " arrived at garage.<br>"
                        + agent.num + "公交车到达维修厂。<br>";
                        updateDisplay();
                        agent.inGarage = true;
                    }
                }

                // If bus has arrived in destination, wait for 100 ticks before moving again
                if (agent.reachedDest) {
                    agent.arrivalTicks++;

                    if (!agent.inGarage) {
                        if (agent.arrivalTicks > agent.waitTicks) {
                            if (agent.waitTicks == 500) agent.waitTicks = 100;
                            var next_station_id = findNextStation(agent);
                            var next_station = agentmap.bus_stations[next_station_id];
                            var current_station = agentmap.units.getLayer(agentmap.bus_stations[agent.currentStation].id);
                            var tmp = [];
                            // Residents in station move with bus
                            for (let i = 0; i < current_station.waiting.length; i++) {
                                var resident = current_station.waiting[i];
                                // If not same direction or bus exceed max capacity(50), skip
                                if ((resident.travel_stops["direction"] != agent.direction) || agent.passengers_amount > 50) {
                                    tmp.push(resident);
                                    continue;
                                }
                                // If no Immune VC, travel by foot to dest
                                if (!resident.immune_vc) {
                                    resident.reachedDest = false;
                                    resident.speed = 1;
                                    resident.scheduleTrip(resident.travel_stops["dest"]["center"], {type: "unit", id: resident.travel_stops["dest"]["id"]}, resident.speed, false, true);
                                    resident.dest_id = resident.travel_stops["dest"]["id"];
                                    continue;
                                } else {
                                    // Verify Immune VC, if not valid, travel by foot to dest
                                    const valid = await verifyImmuneVC(resident.immune_vc);
                                    if (!valid) {
                                        resident.reachedDest = false;
                                        resident.speed = 1;
                                        resident.scheduleTrip(resident.travel_stops["dest"]["center"], {type: "unit", id: resident.travel_stops["dest"]["id"]}, resident.speed, false, true);
                                        resident.dest_id = resident.travel_stops["dest"]["id"];
                                        continue;
                                    }
                                }
                                residentLeaveUnit(current_station._leaflet_id, resident._leaflet_id);
                                agent.passengers.push(resident);
                                agent.passengers_amount += 1;
                                resident.boarded_bus = agent.num;
                                resident.reachedDest = false;
                                resident.speed = agent.speed;
                                resident.scheduleTrip(next_station["center"], {type: "unit", id: next_station["id"]}, resident.speed, false, true);
                                resident.dest_id = next_station["id"];
                            }
                            current_station.waiting = tmp;

                            agent.reachedDest = false;
                            agent.arrivalTicks = 0;
                            if (agent.currentStation != next_station_id) {
                                bus_txt += "Bus " + agent.num + " is travelling to Station " + next_station_id + " from Station " + agent.currentStation + ".<br>"
                                + agent.num + "公交车从第" + agent.currentStation + "站开往第" + next_station_id + "站。<br>"
                            }
                            agent.currentStation = next_station_id;
                            agent.scheduleTrip(next_station["center"], {type: "unit", id: next_station["id"]}, agent.speed, false, true);
                            agent.dest_id = next_station["id"];
                            updateDisplay();
                        }
                    } else {
                        // Travel again after 500 ticks
                        if (agent.arrivalTicks >= 500) {
                            // Travel back to Station 0
                            agent.currentStation = -1;
                            agent.direction = 1;
                            // Check whether should start trip
                            var num_of_running_buses = 0;
                            for (let i = 0; i < buses.length; i++) {
                                if (buses[i]._leaflet_id == agent._leaflet_id) continue;
                                if (buses[i].running && !buses[i].inGarage) num_of_running_buses++;
                            }
                            if (num_of_running_buses > 0) agent.running = false;
                            busTravel(agent);

                            gar_txt += "Bus " + agent.num + " left garage.<br>";
                            blockchain.innerHTML += "Serviced history of bus " + agent.num + " recorded in blockchain.<br>"
                            + agent.num + "公交车的维修记录已被记录在区块链中。<br>";
                            updateDisplay();
                            agent.movingToGarage = false;
                            agent.inGarage = false;

                            const event = "Serviced at garage 在维修厂维修";
                            agent.history.push({time: agentmap.state.ticks, event: event, type: "serviced"});
                            const history = agent.history.slice(Math.max(agent.history.length - 5, 0));

                            agent.service_vcs.push(await vehicleServiced(agent, history, agentmap.state.ticks));
                        }
                    }
                }
            } else if ((agent.type == "car") || (agent.type == "police")) {
                // Car arrived in destination
                if ((agent.place.id == agent.dest_id) && !agent.reachedDest) {
                    agent.reachedDest = true;
                    arv_txt += "Car " + agent.num + " has arrived at destination, after travelling for "
                        + agent.steps_made + " miles.<br>"
                        + agent.num + "车辆已到达目的地，行驶了" + agent.steps_made + "英里。<br>";
                    updateDisplay();
                    reachedDestination(agent);

                    // If travelling to garage
                    if (agent.movingToGarage) {
                        gar_txt += "Car " + agent.num + " has arrived at garage.<br>"
                        + agent.num + "车辆已到达维修厂。<br>";
                        agent.inGarage = true;
                        updateDisplay();
                    }
                }

                // If car has arrived in destination, wait for 300 ticks before moving again
                if (agent.reachedDest) {
                    agent.arrivalTicks++;

                    // If not in garage, wait for 300 ticks before moving again
                    if (!agent.inGarage) {
                        if (agent.arrivalTicks >= 300) {
                            carTravel(agent);
                        }
                    } else {
                        // Travel again after 500 ticks
                        if (agent.arrivalTicks >= 500) {
                            carTravel(agent);

                            gar_txt += "Car " + agent.num + " left garage.<br>"
                            + agent.num + "车辆已离开维修厂。<br>";
                            blockchain.innerHTML += "Serviced history of car " + agent.num + " recorded in blockchain.<br>"
                            + agent.num + "车辆的维修记录已被记录在区块链中。<br>";
                            updateDisplay();
                            agent.movingToGarage = false;
                            agent.inGarage = false;

                            const event = "Serviced at garage 在维修厂维修";
                            agent.history.push({time: agentmap.state.ticks, event: event, type: "serviced"});
                            const history = agent.history.slice(Math.max(agent.history.length - 5, 0));

                            agent.service_vcs.push(await vehicleServiced(agent, history, agentmap.state.ticks));
                        }
                    }
                }

                // Camera report speeding, add to suspect list
                if ((agent.place.type == "street") && (agent.type == "car") &&
                    (agentmap.streets._layers[agent.place.id].feature.properties.id == "way/845918867")) {
                        if ((agent.trip.speed > 3) && !agent.speedingCaught && !agent.movingToGarage) {
                            var speed = (agent.trip.speed * 50).toFixed(2);
                            spe_txt += "Camera at Street " + agent.place.id + " caught Car " + agent.num + " speeding at " + speed + " km/h.<br>"
                            + agent.place.id + "街道上的摄像头拍到了" + agent.num + "车辆超速，时速为" + speed + "公里/小时。<br>";
                            agent.speedingCaught = true;
                            updateDisplay();
                            agent.offense.push("speeding");
                            susAgent.add(agent);
                            const event = "Speeding at Street " + agent.place.id + " at speed " + speed + " km/h 在"
                            + agent.place.id + "街道上超速，时速为" + speed + "公里/小时";
                            agent.history.push({time: agentmap.state.ticks, event: event, type: "speeding"});
                        }
                }
            } else if (agent.type == "tow") {
                // Travel to towTruckDest if not empty
                if (towTruckDest.length > 0 && agent.reachedDest) {
                    let dest_loc = towTruckDest.shift();
                    let closest_unit = getUnitFromCoord(dest_loc["center"], true);
                    agent.scheduleTrip(closest_unit["center"], {type: "unit", id: closest_unit["id"]}, agent.speed, false, true);
                    agent.reachedDest = false;
                    agent.dest_id = closest_unit["id"];
                    agent.accidentAgents = dest_loc["agents"];
                }

                // If tow truck arrived in destination, accidentAgents moved with tow truck to Garage
                if ((agent.place.id == agent.dest_id) && !agent.reachedDest) {
                    agent.reachedDest = true;
                    arv_txt += "Tow Truck " + agent.num + " has arrived at destination, after travelling for "
                        + agent.steps_made + " miles.<br>"
                        + agent.num + "拖车已到达目的地，行驶了" + agent.steps_made + "英里。<br>";
                    updateDisplay();
                    reachedDestination(agent);

                    // If reached garage
                    if (agent.place.id == garage["id"]) {
                        agent.reachedDest = true;
                        agent.dest_id = -1;
                    } else {
                        // Clear traffic jam
                        for (let i = 0; i < agent.accidentAgents.length; i++) {
                            var tmp = agent.accidentAgents[i];
                            for (let j = 0; j < tmp.jammedAgents.length; j++) {
                                tmp.jammedAgents[j].traffic_jam = false;
                                tmp.jammedAgents[j].causeJamAgent = null;
                                tmp.jammedAgents[j].setSpeed(tmp.jammedAgents[j].speed);
                            }

                            // If bus, all passengers on bus travel by foot to destination
                            if (tmp.type == "bus") {
                                for (let j = 0; j < tmp.passengers.length; j++) {
                                    var passenger = tmp.passengers[j];
                                    passenger.boarded_bus = -1;
                                    passenger.reachedDest = false;
                                    passenger.speed = 1;
                                    passenger.scheduleTrip(passenger.travel_stops["dest"]["center"], {type: "unit", id: passenger.travel_stops["dest"]["id"]}, passenger.speed, false, true);
                                    passenger.dest_id = passenger.travel_stops["dest"]["id"];
                                }
                                tmp.passengers = [];
                                tmp.passengers_amount = 0;

                                // Backup bus start travelling
                                for (let i = 0; i < buses.length; i++) {
                                    if (!buses[i].running) {
                                        buses[i].running = true;
                                        break;
                                    }
                                }
                            }

                            // Move agents to garage
                            tmp.scheduleTrip(garage["center"], {type: "unit", id: garage["id"]}, agent.speed, false, true);
                            tmp.speed = agent.speed;
                            tmp.dest_id = garage["id"];
                            tmp.reachedDest = false;
                            tmp.arrivalTicks = 0;
                            tmp.collided = false;
                            tmp.jammedAgents = [];
                            tmp.movingToGarage = true;
                        }
                        jam_txt += "Traffic jam at Street " + agent.place.id + " cleared.<br>"
                        + agent.place.id + "街道上的交通堵塞已清除。<br>";
                        updateDisplay();

                        // Move to garage
                        agent.scheduleTrip(garage["center"], {type: "unit", id: garage["id"]}, agent.speed, false, true);
                        agent.dest_id = garage["id"];
                        agent.reachedDest = false;
                    }
                }
            } else if (agent.type == "ambulance") {
                // Check if ambulanceDest empty, if not travel to destination
                if (ambulanceDest.length > 0 && agent.reachedDest) {
                    const dest_loc = ambulanceDest.shift();
                    const center = agentmap.units._layers[dest_loc["id"]]._bounds.getCenter();
                    agent.scheduleTrip(center, {type: "unit", id: dest_loc["id"]}, agent.speed, false, true);
                    agent.reachedDest = false;
                    agent.dest_id = dest_loc["id"];
                    agent.current_target = dest_loc["agents"];
                }

                // If ambulance arrived in hospital, update database
                if ((agent.place.id == agent.target_hospital["id"]) && !agent.reached_hospital && !agent.reachedDest) {
                    // All passengers arrived at hospital
                    for (var i = 0; i < agent.current_passengers.length; i++) {
                        var resident = agentmap.agents.getLayer(agent.current_passengers[i]._leaflet_id);
                        hos_txt += "Resident " + resident.num + " has arrived at Hospital " + agent.target_hospital["id"] + ".<br>"
                        + resident.num + "居民已到达医院" + agent.target_hospital["id"] + "。<br>";
                        quarantined_count++;
                        quarantined_residents.innerHTML = quarantined_count.toString();

                        agent.target_hospital["amount"]++;

                        // Modify resident's status in database
                        await residentToHospital(resident.num, 1, agent.target_hospital["id"], resident.history, -1);
                        blockchain.innerHTML += "Status of Resident " + resident.num + " updated in blockchain.<br>"
                        + resident.num + "居民的状态已在区块链中更新。<br>";

                        resident.reachedDest = true;
                        resident.reached_hospital = true;
                    }
                    // Add patients to hospital in database
                    await addPatients(agent.target_hospital["id"], agent.target_hospital["amount"]);

                    agent.current_passengers = [];
                    agent.reachedDest = true;
                    agent.reached_hospital = true;
                    agent.current_target = null;

                    updateDisplay();
                } else {
                    // If ambulance reached patient's location, patients moved with ambulance
                    if ((agent.place.id == agent.dest_id) && !agent.reachedDest) {
                        agent.reachedDest = true;

                        // Get all reported residents in unit
                        let infected_residents = agentmap.units.getLayer(agent.place.id).residents_num.filter(function(num) {
                            return agentmap.agents.getLayer(num).reported;
                        })

                        // Find hospital that has enough space
                        let vacant_hospital = null;
                        for (var i = 0; i < numHospital; i++) {
                            if (hospital[i]["amount"] + infected_residents.length <= 100) {
                                vacant_hospital = hospital[i];
                                break;
                            }
                        }

                        // Move infected residents to hospital
                        for (var i = 0; i < infected_residents.length; i++) {
                            let resident = agentmap.agents.getLayer(infected_residents[i]);

                            // Remove from ambulanceDest
                            let index = ambulanceDest.findIndex(function(dest) {
                                return dest["id"] == resident.place.id;
                            })
                            if (index > -1) {
                                ambulanceDest.splice(index, 1);
                            }

                            agent.current_passengers.push(resident);
                            residentLeaveUnit(resident.place.id, resident._leaflet_id);
                            resident.scheduleTrip(vacant_hospital["center"], {type: "unit", id: vacant_hospital["id"]}, agent.speed, false, true);
                            resident.speed = agent.speed;
                            resident.dest_id = vacant_hospital["id"];
                            resident.reachedDest = false;
                            resident.arrivalTicks = 0;
                            resident.target_hospital = vacant_hospital;
                        }

                        // Ambulance move to hospital
                        agent.scheduleTrip(vacant_hospital["center"], {type: "unit", id: vacant_hospital["id"]}, agent.speed, false, true);
                        agent.reachedDest = false;
                        agent.reached_hospital = false;
                        agent.dest_id = vacant_hospital["id"];
                        agent.target_hospital = vacant_hospital;
                    }
                }
            } else if (agent.type == "resident") {
                // Residents arrived in dest_id but not "off" station or "dest"
                if ((agent.place.id == agent.dest_id) && (agent.place.id != agent.travel_stops["off"]["id"])
                    && (agent.place.id != agent.travel_stops["dest"]["id"]) && !agent.reachedFinalDest) {
                    residentReachedUnit(agent.place.id, agent);
                    checkInfection(agent);
                    agent.reachedDest = true;
                    agent.reachedFinalDest = true;
                    agentmap.units.getLayer(agent.place.id).waiting.push(agent);
                }

                // Residents arrived in "off" station
                if ((agent.place.id == agent.dest_id) && (agent.place.id == agent.travel_stops["off"]["id"]) && !agent.reachedDest) {
                    // Move to dest
                    agent.speed = 1;
                    agent.scheduleTrip(agent.travel_stops["dest"]["center"], {type: "unit", id: agent.travel_stops["dest"]["id"]}, agent.speed, false, true);
                    agent.dest_id = agent.travel_stops["dest"]["id"];

                    var event = {"time": agentmap.state.ticks, "bus": agent.boarded_bus,
                        "on": agent.travel_stops["on"]["stop_id"], "off": agent.travel_stops["off"]["stop_id"]}
                    agent.history.push(event);
                    agent.reachedDest = true;
                    agent.vc.push(await updateResidentTravel(agent, event.time, event.on, event.off));
                    blockchain.innerHTML += "Resident " + agent.num + " boarding history recorded on blockchain.<br>"
                    + agent.num + "居民乘车记录已在区块链中更新。<br>";
                }

                // Residents arrived in "dest"
                if ((agent.place.id == agent.dest_id) && (agent.place.id == agent.travel_stops["dest"]["id"])
                && !agent.reached_hospital) {
                    if (!agent.reachedDest) {
                        // Update unit's residents
                        residentReachedUnit(agent.place.id, agent);
                        // Check whether infected
                        checkInfection(agent);
                        agent.reachedDest = true;
                    } else {
                        if (!agent.isInfected) {
                            // Wait for 300 ticks before moving again
                            agent.arrivalTicks++;
                            if (agent.arrivalTicks >= 300) {
                                residentTravel(agent);
                            }
                        } else {
                            // If not reported
                            if (!agent.reported) {
                                // If at home, check if resident will report
                                if (agent.place.id == agent.home.id) {
                                    if (Math.random() < 0.99) {
                                        agent.reported = true;
                                        res_txt += "Resident " + agent.num + " reported symptoms.<br>"
                                        + agent.num + "居民上报了症状。<br>";
                                        updateDisplay();

                                        const tmp = {id: agent.place.id, agents: agent};
                                        ambulanceDest.push(tmp);
                                    } else residentTravel(agent);
                                } else residentTravel(agent);
                            }
                        }
                    }
                }

                // If resident in hospital, recover after 1000 ticks
                if (agent.reached_hospital) {
                    if (agent.arrivalTicks > 1000) {
                        hos_txt += "Resident " + agent.num + " has recovered.<br>"
                        + agent.num + "居民已康复。<br>";
                        updateDisplay();

                        agent.isImmune = true;
                        agent.isInfected = false;
                        agent.reached_hospital = false;
                        agent.arrivalTicks = 0;
                        agent.setStyle({color: "green"});
                        agent.reachedDest = false;
                        agent.reported = false;
                        agent.speed = 3;
                        agent.recover_time = agentmap.state.ticks;

                        // Update resident's status in database
                        agent.immune_vc = await residentLeaveHospital(agent.num, 2, agent.target_hospital["id"], agent.history, agentmap.state.ticks);
                        blockchain.innerHTML += "Resident " + agent.num + " recovery history recorded on blockchain.<br>"
                        + agent.num + "居民康复记录已在区块链中更新。<br>";

                        agent.target_hospital["amount"] -= 1;
                        // Remove patient from hospital in database
                        await removePatient(agent.target_hospital["id"], agent.target_hospital["amount"]);
                        agent.target_hospital = null;

                        infected_count--;
                        quarantined_count--;
                        recovered_count++;
                        infected_residents.innerHTML = infected_count.toString();
                        quarantined_residents.innerHTML = quarantined_count.toString();
                        recovered_residents.innerHTML = recovered_count.toString();

                        residentTravel(agent);
                    } else agent.arrivalTicks++;
                }
            }

            if (agentmap.state.ticks % 10 == 0) {
                if ((agent.type == "resident") || (agent.type == "tow") || (agent.type == "ambulance")) return;
                if (agent.reachedDest) return;

                for (let _ag in agentmap.agents._layers) {
                    let ag = agentmap.agents._layers[_ag];
                    if ((ag.type == "resident") || (ag.type == "tow") || (ag.type == "ambulance")) continue;
                    if (ag.reachedDest) continue;
                    if (_ag != agent._leaflet_id) {
                        let distance = agent._latlng.distanceTo(ag._latlng);

                        // If police, check if ag is reported
                        if (agent.type == "police") {
                            if (distance < 20 && ag.type == "car" && susAgent.has(ag) && agent.current_fining != ag.num && !ag.movingToGarage) {
                                // Get num of speedings in offense
                                var num_speedings = ag.offense.filter(x => x == "speeding").length;
                                // Check if illegal plate
                                var illegal_plate = ag.offense.includes("illegal plate");
                                var fine = (num_speedings * 10) + (illegal_plate ? 50 : 0);
                                ag.deducted_points += fine;
                                susAgent.delete(ag);
                                ag.offense = [];
                                ag.speedingCaught = false;
                                agent.current_fining = ag;

                                // Update police car's history
                                const event = "Deducted " + fine + " points from Car " + ag.num
                                + " 扣了" + ag.num + "车辆" + fine + "分";
                                agent.history.push({time: agentmap.state.ticks, event: event, type: "fined"});

                                // Take most recent 5 events from ag's history
                                const ag_history = ag.history.slice(Math.max(ag.history.length - 5, 0));

                                blockchain.innerHTML += "Points deduction of Car " + ag.num + " recorded in blockchain.<br>"
                                + ag.num + "车辆扣分记录已在区块链中更新。<br>";
                                ag.fine_vc = await fineVehicle(ag, ag_history, fine, agentmap.state.ticks, agent.num);

                                if (num_speedings > 0) {
                                    pol_txt += "Police " + agent.num + " fined Car " + ag.num + " for " + num_speedings + " speeding(s).<br>"
                                    + agent.num + "警车对" + ag.num + "车辆超速" + num_speedings + "次进行了罚款。<br>";
                                    updateDisplay();
                                    ag.setSpeed(1);
                                    ag.speed = 1;
                                }

                                if (illegal_plate) {
                                    pol_txt += "Police " + agent.num + " fined Car " + ag.num + " for illegal plate.<br>"
                                    + agent.num + "警车对" + ag.num + "车辆违规车牌进行了罚款。<br>";
                                    ag.isRegisteringVC = true;
                                    // Generate new valid VC
                                    ag.vc = await generateVC(ag.num, true).then((response) => {
                                        ag.isRegisteringVC = false;
                                        ag.valid = true;
                                        // Change icon
                                        ag.setIcon(black_icon_right);
                                        updateDisplay();
                                    });
                                }
                                break;
                            }
                        }

                        // Traffic jam
                        if ((distance < 20) && (agent.type != "police") && (!agent.movingToGarage)) {
                            if (ag.collided) {
                                if (ag.jammedAgents.length == 0) {
                                    jam_txt += "Traffic jam at Street " + agent.place.id + ".<br>"
                                    + agent.place.id + "街道发生了交通堵塞。<br>";
                                    updateDisplay();
                                }
                                ag.jammedAgents.push(agent);
                                agent.causeJamAgent = ag;
                                agent.setSpeed(0.1);
                                agent.traffic_jam = true;
                                return;
                            } else if (ag.traffic_jam) {
                                ag.causeJamAgent.jammedAgents.push(agent);
                                agent.causeJamAgent = ag.causeJamAgent;
                                agent.setSpeed(0.1);
                                agent.traffic_jam = true;
                                return;
                            }
                        }

                        // Accident
                        if (distance < 10 && !agent.collided && !ag.collided
                            && (agent.type != "police") && (ag.type != "police") && (!agent.movingToGarage) && (!ag.movingToGarage)) {
                            if (Math.random() < 0.001) {
                                ag.setSpeed(0.1);
                                agent.setSpeed(0.1);
                                ag.collided = true;
                                agent.collided = true;

                                const agents_involved = [ag, agent];
                                const tmp = {center: ag._latlng, agents: agents_involved};
                                towTruckDest.push(tmp);

                                acc_txt += "Accident between " + agent.num + " and " + ag.num + " at Street " + agent.place.id + ".<br>"
                                + agent.place.id + "街道发生了" + agent.num + "和" + ag.num + "车辆的交通事故。<br>";

                                var event = "Accident with " + ag.num + " at Street " + agent.place.id
                                + " 在街道" + agent.place.id + "与" + ag.num + "发生了交通事故";
                                agent.history.push({time: agentmap.state.ticks, event: event, type: "accident"});

                                event = "Accident with " + agent.num + " at Street " + agent.place.id
                                + " 在街道" + agent.place.id + "与" + agent.num + "发生了交通事故";
                                ag.history.push({time: agentmap.state.ticks, event: event, type: "accident"});

                                contactInsurance(agent, ag, agentmap.state.ticks, agent.place.id);
                                updateDisplay();
                                break;
                            }
                        } else if (distance < 20 && !ag.prev_vehicle.includes(agent.num) && !agent.prev_vehicle.includes(ag.num)
                        && !agent.offense.includes("illegal plate") && !agent.isRegisteringVC) {
                            exc_txt += "Exchanging digital identity between " + agent.num + " and " + ag.num + ".<br>"
                            + agent.num + "和" + ag.num + "车辆进行了数字身份交换。<br>";
                            agent.prev_vehicle.push(ag.num);
                            ag.prev_vehicle.push(agent.num);
                            updateDisplay();
                            await exchange(ag, ag.place.id);

                            // Other vehicles report speeding
                            if ((ag.type == "car") && (agent.type != "police") && (ag.trip.speed > 3) && !ag.speedingCaught && !ag.movingToGarage) {
                                var speed = (ag.trip.speed * 50).toFixed(2);
                                spe_txt += "Car " + agent.num + " reported car " + ag.num + " speeding at " + speed + " km/h at Street "
                                    + ag.place.id + ".<br>"
                                    + agent.num + "车辆报告了" + ag.num + "车辆在" + ag.place.id + "街道以" + speed + "km/h的速度超速行驶。<br>";
                                updateDisplay();
                                ag.speedingCaught = true;
                                ag.offense.push("speeding");
                                susAgent.add(ag);
                                const event = "Speeding at Street " + agent.place.id + " at speed " + speed + " km/h 在"
                                    + agent.place.id + "街道上超速，时速为" + speed + "公里/小时";
                                ag.history.push({time: agentmap.state.ticks, event: event, type: "speeding"});
                            }
                        }
                    }
                }
            }
        }
    });
}

