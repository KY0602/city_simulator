let input_event = document.getElementById("searchbar");
input_event.addEventListener("keypress", function(event) {
    if (event.key == "Enter") {
        search();
    }
});

async function getMileage(agent) {
    let previous_mileage = 0;
    if (agent.mileage_vc) {
        // Verify Mileage VC
        previous_mileage = await axios.post(server_url + "/verify-vc", {
            "vc": agent.mileage_vc,
            "signature": agent.mileage_vc.proof.jws
        }).then((response) => {
            if (!response.data) {
                return 0;
            } else {
                return agent.mileage_vc.credentialSubject.mileage;
            }
        })
    }

    return previous_mileage;
}

async function getDeductedPoints(agent) {
    let deducted_points = 0;
    if (agent.fine_vc) {
        // Verify Fine VC
        deducted_points = await axios.post(server_url + "/verify-vc", {
            "vc": agent.fine_vc,
            "signature": agent.fine_vc.proof.jws
        }).then((response) => {
            if (!response.data) {
                return 0;
            } else {
                return agent.fine_vc.credentialSubject.deductedPoints;
            }
        })
    }

    return deducted_points;
}

async function generateVC(plateNum, valid) {
    let result = axios.post(server_url + "/generate-vc", {
        "plateNum": plateNum,
        "valid": valid
    }).then(response => {
        return response.data;
    });

    return result;
}

async function generateImmuneVC(num, hospital) {
    let result = axios.post(server_url + "/generate-immune-vc", {
        "num": num,
        "hospital": hospital
    }).then(response => {
        return response.data;
    });

    return result;
}

async function exchange(agent, location) {
    if (!agent.vc) return;

    axios.post(server_url + "/verify-identity-vc", {
        "vc": agent.vc,
        "signature": agent.vc.proof.jws,
    }).then((response)=> {
        if (!response.data) {
            exc_txt += "Illegal Agent " + agent.num + " reported at Street " + location + ".<br>"
            + "假车牌车辆" + agent.num + "在街道" + location + "被发现。<br>";
            updateDisplay();
            agent.offense.push("illegal plate");
            susAgent.add(agent);
            const event = "Illegal plate reported at Street " + location
            + " 在街道" + location + "被发现假车牌";
            agent.history.push({time: agentmap.state.ticks, event: event, type: "illegal plate"});
        }
    })
}

async function verifyIdentityVC(vc) {
    if (!vc) return false;

    const result = axios.post(server_url + "/verify-identity-vc", {
        "vc": vc,
        "signature": vc.proof.jws
    }).then((response) => {
        return response.data;
    })

    return result;
}

async function verifyImmuneVC(vc) {
    const result = axios.post(server_url + "/verify-vc", {
        "vc": vc,
        "signature": vc.proof.jws
    }).then((response) => {
        return response.data;
    })

    return result;
}

async function reached(agent, miles, time) {
    let result, previous_mileage, previous_deducted_points;
    // Get most recent 5 events from history
    let history = agent.history.slice(Math.max(agent.history.length - 5, 0));
    if (agent.type == "bus") {
        previous_mileage = await getMileage(agent);

        result = axios.post(server_url + "/update-bus-mileage", {
            "plateNum": agent.num,
            "mileage": miles + previous_mileage,
            "history": history,
            "time": time
        }).then(response => {
            return response.data;
        });
    } else if ((agent.type == "car") || (agent.type == "tow")) {
        previous_mileage = await getMileage(agent);
        previous_deducted_points = await getDeductedPoints(agent);

        result = axios.post(server_url + "/update-vehicle-mileage", {
            "plateNum": agent.num,
            "mileage": miles + previous_mileage,
            "deductedPoints": previous_deducted_points,
            "history": history,
            "time": time
        }).then(response => {
            return response.data;
        });
    } else if (agent.type == "police") {
        previous_mileage = await getMileage(agent);

        result = axios.post(server_url + "/update-police-mileage", {
            "plateNum": agent.num,
            "mileage": miles + previous_mileage,
            "history": history,
            "time": time
        }).then(response => {
            return response.data;
        });
    }

    return result;
}

async function addBus(plateNum) {
    axios.post(server_url + "/add-bus", {
        "plateNum": plateNum
    })
}

async function addPolice(plateNum) {
    axios.post(server_url + "/add-police", {
        "plateNum": plateNum
    })
}

async function fineVehicle(agent, history, fine, time, police) {
    let previous_mileage = await getMileage(agent);
    let previous_deducted_points = await getDeductedPoints(agent);
    const result = axios.post(server_url + "/fine-vehicle", {
        "plateNum": agent.num,
        "mileage": previous_mileage,
        "deductedPoints": previous_deducted_points,
        "history": history,
        "fine": fine,
        "time": time,
        "policeNum": police
    }).then((response)=> {
        return response.data;
    })

    return result;
}

async function addAccident(agent1, agent2, time, location, responsible) {
    const result = axios.post(server_url + "/add-accident", {
        "plateNum1": agent1,
        "plateNum2": agent2,
        "time": time,
        "location": location,
        "responsible": responsible
    }).then((response) => {
        return response.data;
    })

    return result;
}

async function vehicleServiced(agent, history, time) {
    let result, previous_mileage, previous_deducted_points;
    if (agent.type == "bus") {
        previous_mileage = await getMileage(agent);
        result = axios.post(server_url + "/bus-serviced", {
            "plateNum": agent.num,
            "mileage": previous_mileage,
            "history": history,
            "time": time
        }).then((response) => {
            return response.data;
        })
    } else if (agent.type == "car") {
        previous_mileage = await getMileage(agent);
        previous_deducted_points = await getDeductedPoints(agent);
        result = axios.post(server_url + "/vehicle-serviced", {
            "plateNum": agent.num,
            "mileage": previous_mileage,
            "deductedPoints": previous_deducted_points,
            "history": history,
            "time": time
        }).then((response) => {
            return response.data;
        })
    }

    return result;
}

async function updateResidentTravel(agent, time, on, off) {
    let infection_status = 0;
    if (agent.isInfected) infection_status = 1;
    else if (agent.isImmune) infection_status = 2;

    let result = axios.post(server_url + "/update-resident-travel", {
        "num": agent.num,
        "infectionStatus": infection_status,
        "quarantineLoc": -1,
        "history": agent.history,
        "recoverTime": agent.recover_time,
        "time": time,
        "busNum": agent.boarded_bus,
        "onStation": on,
        "offStation": off
    }).then(response => {
        return response.data;
    });

    return result;
}

async function residentToHospital(num, infection_status, quarantine_loc, history, recover_time) {
    axios.post(server_url + "/modify-resident-infection-status", {
        "num": num,
        "infection_status": infection_status,
        "quarantine_loc": quarantine_loc,
        "history": history,
        "recover_time": recover_time
    });
}

async function residentLeaveHospital(num, infection_status, quarantine_loc, history, recover_time) {
    const result = axios.post(server_url + "/modify-resident-infection-status", {
        "num": num,
        "infection_status": infection_status,
        "quarantine_loc": quarantine_loc,
        "history": history,
        "recover_time": recover_time
    }).then((response) => {
        return response.data;
    });

    return result;
}

async function addHospital(num) {
    axios.post(server_url + "/add-hospital", {
        "num": num
    });
}

async function addPatients(num, num_of_patients) {
    axios.post(server_url + "/add-patients", {
        "num": num,
        "num_of_patients": num_of_patients
    });
}

async function removePatient(num, num_of_patients) {
    axios.post(server_url + "/remove-patient", {
        "num": num,
        "num_of_patients": num_of_patients
    });
}

async function searchBusDB(num) {
    let result = axios.post(server_url + "/search-bus", {
        "plateNum": num
    }).then(response => {
        return response.data;
    });

    return result;
}

async function searchVehicleDB(num) {
    let result = axios.post(server_url + "/search-vehicle", {
        "plateNum": num
    }).then(response => {
        return response.data;
    });

    return result;
}

async function searchResidentDB(num) {
    let result = axios.post(server_url + "/search-resident", {
        "num": num
    }).then(response => {
        return response.data;
    });

    return result;
}

async function searchPoliceDB(num) {
    let result = axios.post(server_url + "/search-police", {
        "num": num
    }).then(response => {
        return response.data;
    });

    return result;
}

async function searchAccidentDB(num) {
    let result = axios.post(server_url + "/search-accident", {
        "plateNum": num
    }).then(response => {
        return response.data;
    });

    return result;
}

async function searchHospitalDB(num) {
    const result = axios.post(server_url + "/search-hospital", {
        "num": num
    }).then((response) => {
        return response.data;
    });

    return result;
}

let mileage_vc, fine_vc, immune_vc;
let mileage = 0;

function search() {
    let input = document.getElementById('searchbar').value;
    let type = document.getElementsByName('typeSearch');
    for (let i = 0; i < type.length; i++) {
        if (type[i].checked) {
            type = type[i].value;
            break;
        }
    }

    if (type == "resident") {
        searchResident(input);
    } else if (type == "vehicle") {
        if (input.startsWith("B")) searchBus(input);
        else if (input.startsWith("V")) searchVehicle(input);
        else if (input.startsWith("P")) searchPolice(input);
    } else if (type == "accident") {
        searchAccident(input);
    } else if (type == "hospital") {
        searchHospital(input);
    }
}

async function searchResident(num) {
    let loading = document.getElementById("loader");
    loading.style.display = "block";
    document.getElementById("not_found").style.display = "none";
    document.getElementById("search_full").style.display = "none";
    document.getElementById("search_res").innerHTML = "";
    document.getElementById("vc_button").style.display = "none";
    document.getElementById("verify_button").style.display = "none";
    document.getElementById("vc_button_2").style.display = "none";
    document.getElementById("verify_button_2").style.display = "none";
    document.getElementById("vc_button_3").style.display = "inline";
    document.getElementById("verify_button_3").style.display = "inline";
    document.getElementById("event_desc").innerHTML = "Recent Boarding Events 近期乘搭公交事件";

    let search_res = {};

    if (isNaN(num)) {
        document.getElementById("not_found").style.display = "block";
        loading.style.display = "none";
        window.scrollTo(0, document.body.scrollHeight);
        return;
    }

    // Search for resident
    const resident = await searchResidentDB(num);
    const resident2 = await searchForAgent2(num);
    if (resident2) {
        immune_vc = resident2.immune_vc;
    }
    if (resident) {
        search_res["num"] = resident._id;

        if (resident.infection_status == 0) search_res["infection_status"] = "Healthy 健康";
        else if (resident.infection_status == 1) search_res["infection_status"] = "Infected 已感染";
        else search_res["infection_status"] = "Recovered 康复";
        if (resident.quarantine_loc == -1) search_res["quarantine_loc"] = "None 无";
        else search_res["quarantine_loc"] = "Hospital " + resident.quarantine_loc;

        if (resident.recover_time == -1) search_res["recover_time"] = "None 无";
        else search_res["recover_time"] = resident.recover_time;

        search_res["history"] = resident.history;
    } else {
        if (resident2) {
            search_res["num"] = resident2.num;

            if (!resident2.isInfected) search_res["infection_status"] = "Healthy 健康";
            else if (resident2.isInfected) search_res["infection_status"] = "Infected 已感染";
            if (resident2.isImmune) search_res["infection_status"] = "Recovered 康复";

            if (resident2.targetHospital) search_res["quarantine_loc"] = "Hospital " + resident2.target_hospital["id"];
            else search_res["quarantine_loc"] = "None 无";

            if (resident2.recover_time == -1) search_res["recover_time"] = "None 无";
            else search_res["recover_time"] = resident2.recover_time;

            search_res["history"] = resident2.history;
        } else {
            document.getElementById("not_found").style.display = "block";
            loading.style.display = "none";
            window.scrollTo(0, document.body.scrollHeight);
            return;
        }
    }

    let profile_table = document.getElementById("profileTable");
    let tab =
        `<tr>
            <th>ID</th>
            <td>${search_res["num"]}</td>
        </tr>
        <tr>
            <th>Infection Status 感染状态</th>
            <td>${search_res["infection_status"]}</td>
        </tr>
        <tr>
            <th>Quarantine Location 隔离地点</th>
            <td>${search_res["quarantine_loc"]}</td>
        </tr>
        <tr>
            <th>Recover Time 康复时间</th>
            <td>${search_res["recover_time"]}</td>
        </tr>`;
    let history_table = document.getElementById("search_res");
    if (search_res["history"].length > 0) {
        let tab2 =
            `<tr>
              <th>Time 时间</th>
              <th>Bus 公交号</th>
              <th>Boarding Station 上车车站</th>
              <th>Leaving Station 下车车站</th>
             </tr>`;
        for (let i = 0; i < search_res["history"].length; i++) {
            tab2 +=
                `<tr>
                    <td><a href="#" onclick="getVC_resident(${i})">${search_res["history"][i]["time"]}</td>
                    <td>${search_res["history"][i]["bus"]}</td>
                    <td>${search_res["history"][i]["on"]}</td>
                    <td>${search_res["history"][i]["off"]}</td>
                </tr>`;
        }
        history_table.innerHTML = tab2;
    }

    document.getElementById("search_full").style.display = "block";
    profile_table.innerHTML = tab;

    loading.style.display = "none";
    window.scrollTo(0, document.body.scrollHeight);
}

async function searchBus(num) {
    let loading = document.getElementById("loader");
    loading.style.display = "block";
    document.getElementById("not_found").style.display = "none";
    document.getElementById("search_full").style.display = "none";
    document.getElementById("search_res").innerHTML = "";
    document.getElementById("vc_button").style.display = "inline";
    document.getElementById("verify_button").style.display = "inline";
    document.getElementById("vc_button_2").style.display = "none";
    document.getElementById("verify_button_2").style.display = "none";
    document.getElementById("vc_button_3").style.display = "none";
    document.getElementById("verify_button_3").style.display = "none";
    document.getElementById("event_desc").innerHTML = "Recent 5 Events 近期5次事件";

    let search_res = {};

    // Search for bus
    const bus = await searchBusDB(num);
    const bus2 = searchForAgent2(num);
    if (bus2) {
        mileage_vc = bus2.mileage_vc;
        mileage = bus2.mileage;
    }
    if (bus) {
        search_res["num"] = bus._id;
        search_res["mileage"] = bus.mileage;
        search_res["history"] = bus.history;
    } else {
        document.getElementById("not_found").style.display = "block";
        loading.style.display = "none";
        window.scrollTo(0, document.body.scrollHeight);
        return;
    }

    let profile_table = document.getElementById("profileTable");
    let tab =
        `<tr>
            <th>Plate Num 车牌号</th>
            <td>${search_res["num"]}</td>
        </tr>
        <tr>
            <th>Mileage 里程表数据</th>
            <td>${search_res["mileage"]}</td>
        </tr>`;
    let history_table = document.getElementById("search_res");
    if (search_res["history"].length > 0) {
        let tab2 =
            `<tr>
              <th>Time 时间</th>
              <th>Event 事件</th>
             </tr>`;
        for (let i = 0; i < search_res["history"].length; i++) {
            if (search_res["history"][i]["type"] == "accident") {
                tab2 +=
                `<tr>
                    <td><a href="#" onclick="getAccidentVCByTime(${num}, ${search_res["history"][i]["time"]})">${search_res["history"][i]["time"]}</td>
                    <td>${search_res["history"][i]["event"]}</td>
                </tr>`;
            } else if (search_res["history"][i]["type"] == "serviced") {
                tab2 +=
                `<tr>
                    <td><a href="#" onclick="getServiceVCByTime(${num}, ${search_res["history"][i]["time"]})">${search_res["history"][i]["time"]}</td>
                    <td>${search_res["history"][i]["event"]}</td>
                </tr>`;
            } else {
                tab2 +=
                `<tr>
                    <td>${search_res["history"][i]["time"]}</td>
                    <td>${search_res["history"][i]["event"]}</td>
                </tr>`;
            }
        }
        history_table.innerHTML = tab2;
    }

    document.getElementById("search_full").style.display = "block";
    profile_table.innerHTML = tab;

    loading.style.display = "none";
    window.scrollTo(0, document.body.scrollHeight);
}

async function searchVehicle(num) {
    let loading = document.getElementById("loader");
    loading.style.display = "block";
    document.getElementById("not_found").style.display = "none";
    document.getElementById("search_full").style.display = "none";
    document.getElementById("search_res").innerHTML = "";
    document.getElementById("vc_button").style.display = "inline";
    document.getElementById("verify_button").style.display = "inline";
    document.getElementById("vc_button_2").style.display = "inline";
    document.getElementById("verify_button_2").style.display = "inline";
    document.getElementById("vc_button_3").style.display = "none";
    document.getElementById("verify_button_3").style.display = "none";
    document.getElementById("event_desc").innerHTML = "Recent 5 Events 近期5次事件";

    let search_res = {};

    // Search for car
    const car = await searchVehicleDB(num);
    const car2 = searchForAgent2(num);
    if (car2) {
        mileage_vc = car2.mileage_vc;
        fine_vc = car2.fine_vc;
        mileage = car2.mileage;
    }
    if (car) {
        search_res["num"] = car._id;
        search_res["mileage"] = car.mileage;
        search_res["deducted_points"] = car.deducted_points;
        search_res["history"] = car.history;
    } else {
        if (car2) {
            search_res["num"] = car2.num;
            search_res["mileage"] = car2.mileage;
            search_res["deducted_points"] = car2.deducted_points;
            search_res["history"] = car2.history;
        } else {
            document.getElementById("not_found").style.display = "block";
            loading.style.display = "none";
            window.scrollTo(0, document.body.scrollHeight);
            return;
        }
    }

    let profile_table = document.getElementById("profileTable");
    let tab =
        `<tr>
            <th>Plate Num 车牌号</th>
            <td>${search_res["num"]}</td>
        </tr>
        <tr>
            <th>Mileage 里程表数据</th>
            <td>${search_res["mileage"]}</td>
        </tr>
        <tr>
            <th>Deducted Points 扣分数</th>
            <td>${search_res["deducted_points"]}</td>
        </tr>`;
    let history_table = document.getElementById("search_res");
    if (search_res["history"].length > 0) {
        let tab2 =
            `<tr>
              <th>Time 时间</th>
              <th>Event 事件</th>
             </tr>`;
        for (let i = 0; i < search_res["history"].length; i++) {
            if (search_res["history"][i]["type"] == "accident") {
                tab2 +=
                `<tr>
                    <td><a href="#" onclick="getAccidentVCByTime('${num}', ${search_res["history"][i]["time"]})">${search_res["history"][i]["time"]}</td>
                    <td>${search_res["history"][i]["event"]}</td>
                </tr>`;
            } else if (search_res["history"][i]["type"] == "serviced") {
                tab2 +=
                `<tr>
                    <td><a href="#" onclick="getServiceVCByTime('${num}', ${search_res["history"][i]["time"]})">${search_res["history"][i]["time"]}</td>
                    <td>${search_res["history"][i]["event"]}</td>
                </tr>`;
            } else {
                tab2 +=
                `<tr>
                    <td>${search_res["history"][i]["time"]}</td>
                    <td>${search_res["history"][i]["event"]}</td>
                </tr>`;
            }
        }
        history_table.innerHTML = tab2;
    }

    document.getElementById("search_full").style.display = "block";
    profile_table.innerHTML = tab;

    loading.style.display = "none";
    window.scrollTo(0, document.body.scrollHeight);
}

async function searchPolice(num) {
    let loading = document.getElementById("loader");
    loading.style.display = "block";
    document.getElementById("not_found").style.display = "none";
    document.getElementById("search_full").style.display = "none";
    document.getElementById("search_res").innerHTML = "";
    document.getElementById("vc_button").style.display = "inline";
    document.getElementById("verify_button").style.display = "inline";
    document.getElementById("vc_button_2").style.display = "none";
    document.getElementById("verify_button_2").style.display = "none";
    document.getElementById("vc_button_3").style.display = "none";
    document.getElementById("verify_button_3").style.display = "none";
    document.getElementById("event_desc").innerHTML = "Recent 5 Events 近期5次事件";

    let search_res = {};

    const police = await searchPoliceDB(num);
    const police2 = searchForAgent2(num);
    if (police2) {
        mileage_vc = police2.mileage_vc;
        mileage = police2.mileage;
    }
    if (police) {
        search_res["num"] = police._id;
        search_res["mileage"] = police.mileage;
        search_res["history"] = police.history;
    } else {
        document.getElementById("not_found").style.display = "block";
        loading.style.display = "none";
        window.scrollTo(0, document.body.scrollHeight);
        return;
    }

    let profile_table = document.getElementById("profileTable");
    let tab =
        `<tr>
            <th>Plate Num 车牌号</th>
            <td>${search_res["num"]}</td>
        </tr>
        <tr>
            <th>Mileage 里程表数据</th>
            <td>${search_res["mileage"]}</td>
        </tr>`;
    let history_table = document.getElementById("search_res");
    if (search_res["history"].length > 0) {
        let tab2 =
            `<tr>
              <th>Time 时间</th>
              <th>Event 事件</th>
             </tr>`;
        for (let i = 0; i < search_res["history"].length; i++) {
            tab2 +=
                `<tr>
                    <td>${search_res["history"][i]["time"]}</td>
                    <td>${search_res["history"][i]["event"]}</td>
                </tr>`;
        }
        history_table.innerHTML = tab2;
    }

    document.getElementById("search_full").style.display = "block";
    profile_table.innerHTML = tab;

    loading.style.display = "none";
    window.scrollTo(0, document.body.scrollHeight);
}

async function searchAccident(num) {
    let loading = document.getElementById("loader");
    loading.style.display = "block";
    document.getElementById("event_desc").innerHTML = "Accidents involved 事故记录";
    document.getElementById("not_found").style.display = "none";
    document.getElementById("search_full").style.display = "none";
    document.getElementById("search_res").innerHTML = "";
    document.getElementById("vc_button").style.display = "none";
    document.getElementById("verify_button").style.display = "none";
    document.getElementById("vc_button_2").style.display = "none";
    document.getElementById("vc_button_3").style.display = "none";
    document.getElementById("verify_button_3").style.display = "none";
    document.getElementById("verify_button_2").style.display = "none";

    let search_res = {};
    let result = await searchAccidentDB(num);
    if (result.length > 0) {
        search_res["num"] = result.length;
        search_res["accidents"] = result;
    } else {
        document.getElementById("not_found").style.display = "block";
        loading.style.display = "none";
        window.scrollTo(0, document.body.scrollHeight);
        return;
    }

    let profile_table = document.getElementById("profileTable");
    let tab =
        `<tr>
            <th>Plate Number 车牌号</th>
            <td>${num}</td>
        </tr>
        <tr>
            <th>Number of Accidents 事故数</th>
            <td>${search_res["num"]}</td>
        </tr>`;

    let history_table = document.getElementById("search_res");
    let tab2 =
        `<tr>
            <th>Time 时间</th>
            <th>Location 地点</th>
            <th>Vehicle 1 涉事车辆1</th>
            <th>Vehicle 2 涉事车辆2</th>
            <th>Responsible 责任方</th>
        </tr>`;
    if (search_res["accidents"]) {
        for (let i = 0; i < search_res["accidents"].length; i++) {
            tab2 +=
                `<tr>
                    <td><a href="#" onclick="getAccidentVCByTime('${num}', ${search_res["accidents"][i]["time"]})">${search_res["accidents"][i]["time"]}</td>
                    <td>${search_res["accidents"][i]["location"]}</td>
                    <td>${search_res["accidents"][i]["vehicle_plate_num1"]}</td>
                    <td>${search_res["accidents"][i]["vehicle_plate_num2"]}</td>
                    <td>${search_res["accidents"][i]["responsible"]}</td>
                </tr>`;
        }
    }

    document.getElementById("search_full").style.display = "block";
    profile_table.innerHTML = tab;
    history_table.innerHTML = tab2;
    loading.style.display = "none";
    window.scrollTo(0, document.body.scrollHeight);
}

async function searchHospital(num) {
    let loading = document.getElementById("loader");
    loading.style.display = "block";
    document.getElementById("not_found").style.display = "none";
    document.getElementById("search_full").style.display = "none";
    document.getElementById("search_res").innerHTML = "";
    document.getElementById("vc_button").style.display = "none";
    document.getElementById("verify_button").style.display = "none";
    document.getElementById("vc_button_2").style.display = "none";
    document.getElementById("verify_button_2").style.display = "none";
    document.getElementById("vc_button_3").style.display = "none";
    document.getElementById("verify_button_3").style.display = "none";
    document.getElementById("event_desc").innerHTML = "Patients 患者";

    let search_res = {};

    if (isNaN(num)) {
        document.getElementById("not_found").style.display = "block";
        loading.style.display = "none";
        window.scrollTo(0, document.body.scrollHeight);
        return;
    }

    // Search for hospital
    const hos = await searchHospitalDB(num);
    if (hos) {
        let profile_table = document.getElementById("profileTable");
        let tab =
            `<tr>
                <th>ID</th>
                <td>${hos._id}</td>
            </tr>
            <tr>
                <th>No. of patients 患者数</th>
                <td>${hos.no_of_patients}</td>
            </tr>`;

        let history_table = document.getElementById("search_res");
        let tab2 =
            `<tr>
              <th>Patients 患者</th>
             </tr>`;
        for (let i = 0; i < hos.patients.length; i++) {
            tab2 += `<tr>
                        <td>${hos.patients[i]}</td>
                    </tr>`;
        }
        document.getElementById("search_full").style.display = "block";
        profile_table.innerHTML = tab;
        history_table.innerHTML = tab2;
    } else {
        document.getElementById("not_found").style.display = "block";
    }

    loading.style.display = "none";
    window.scrollTo(0, document.body.scrollHeight);
}

function showVC(type) {
    if (type == 0) {
        if (mileage_vc) alert("VC: " + JSON.stringify(mileage_vc, null, 2));
        else alert("No Mileage VC 无里程表数据VC");
    } else if (type == 1) {
        if (fine_vc) alert("VC: " + JSON.stringify(fine_vc, null, 2));
        else alert("No Fine VC 无扣分记录VC");
    } else if (type == 2) {
        if (immune_vc) alert("VC: " + JSON.stringify(immune_vc, null, 2));
        else alert("No Immune VC 无免疫VC");
    }
}

function verifyVC(type) {
    if (type == 0) {
        if (mileage_vc) {
            // First verify whether mileage in VC constant with mileage in vehicle
            const mileage_in_vc = mileage_vc.credentialSubject.mileage;
            if (mileage_in_vc != mileage) {
                alert("Mileage in VC does not match mileage in vehicle! 车辆里程表数据与VC数据不匹配\n" +
                    "Mileage on vehicle: 车辆里程表数据：" + mileage + "\n" +
                    "Mileage in VC: VC数据：" + mileage_in_vc + "\n");
                return;
            }

            // Then verify integrity of Mileage VC
            axios.post(server_url + "/verify-vc", {
                "vc": mileage_vc,
                "signature": mileage_vc.proof.jws
            }).then((response) => {
                if (!response.data) {
                    alert("Invalid VC! 非法VC！");
                } else {
                    alert("Valid VC! 有效VC！");
                }
            })
        } else {
            alert("No Mileage VC 无里程表数据VC");
        }
    } else if (type == 1 || type == 2) {
        const vc = type == 1 ? fine_vc : immune_vc;
        if (vc) {
            // Verify integrity of Fine VC
            axios.post(server_url + "/verify-vc", {
                "vc": vc,
                "signature": vc.proof.jws
            }).then((response) => {
                if (!response.data) {
                    alert("Invalid VC! 非法VC！");
                } else {
                    alert("Valid VC! 有效VC！");
                }
            })
        } else {
            alert("No Fine VC 无扣分记录VC");
        }
    }
}

function getVC_resident(num) {
    let input = document.getElementById('searchbar').value;
    let agent = searchForAgent2(input);
    if (agent) {
        if (agent.vc[num]) alert("VC: " + JSON.stringify(agent.vc[num], null, 2));
        else alert("No VC! 无VC！");
    } else alert("Resident not found! 未找到居民！");
}

function getAccidentVCByTime(num, time) {
    const agent = searchForAgent2(num);
    if (agent) {
        for (let i = 0; i < agent.accident_vcs.length; i++) {
            if (agent.accident_vcs[i].credentialSubject.time == time) {
                alert("VC: " + JSON.stringify(agent.accident_vcs[i], null, 2));
                return;
            }
        }
    } else {
        alert("No Accident VC 无事故VC");
    }
}

function getServiceVCByTime(num, time) {
    const agent = searchForAgent2(num);
    if (agent) {
        for (let i = 0; i < agent.service_vcs.length; i++) {
            if (agent.service_vcs[i].credentialSubject.time == time) {
                alert("VC: " + JSON.stringify(agent.service_vcs[i], null, 2));
                return;
            }
        }
    } else {
        alert("No Service VC 无维修VC");
    }
}