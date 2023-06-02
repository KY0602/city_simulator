let arv = 0;
let exc = 1;
let acc = 2;
let spd = 3;
let jam = 4;
let pol = 5;
let inf = 6;
let rep = 7;
let hos = 8;
let bus = 9;
let res = 10;
let gar = 11;
let cur_status = 0;
let traffic_main = document.getElementById("traffic-main");

function showArrivals() {
    cur_status = arv;
    updateDisplay();
}

function showExchanges() {
    cur_status = exc;
    updateDisplay();
}

function showAccidents() {
    cur_status = acc;
    updateDisplay();
}

function showSpeedings() {
    cur_status = spd;
    updateDisplay();
}

function showJams() {
    cur_status = jam;
    updateDisplay();
}

function showPolice() {
    cur_status = pol;
    updateDisplay();
}

function showInfections() {
    cur_status = inf;
    updateDisplay();
}

function showReports() {
    cur_status = rep;
    updateDisplay();
}

function showHospital() {
    cur_status = hos;
    updateDisplay();
}

function showBuses() {
    cur_status = bus;
    updateDisplay();
}

function showResidents() {
    cur_status = res;
    updateDisplay();
}

function showGarage() {
    cur_status = gar;
    updateDisplay();
}

function updateDisplay() {
    if (cur_status == arv) {
        traffic_main.innerHTML = arv_txt;
    } else if (cur_status == exc) {
        traffic_main.innerHTML = exc_txt;
    } else if (cur_status == acc) {
        traffic_main.innerHTML = acc_txt;
    } else if (cur_status == spd) {
        traffic_main.innerHTML = spe_txt;
    } else if (cur_status == jam) {
        traffic_main.innerHTML = jam_txt;
    } else if (cur_status == pol){
        traffic_main.innerHTML = pol_txt;
    } else if (cur_status == inf) {
        traffic_main.innerHTML = inf_txt;
    } else if (cur_status == rep) {
        traffic_main.innerHTML = rep_txt;
    } else if (cur_status == hos) {
        traffic_main.innerHTML = hos_txt;
    } else if (cur_status == bus) {
        traffic_main.innerHTML = bus_txt;
    } else if (cur_status == res) {
        traffic_main.innerHTML = res_txt;
    } else if (cur_status == gar) {
        traffic_main.innerHTML = gar_txt;
    }
}