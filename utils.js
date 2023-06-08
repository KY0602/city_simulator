function searchForAgent(plate) {
    if (!agentmap.agents) return null;
    for (let i = 0; i < agentmap.agents.count(); i++) {
        let agent = agentmap.agents.getLayers()[i];
        let agent_id = agentmap.agents.getLayerId(agent);
        let agent_plate = agent.plate_num;
        if (agent_plate == plate) {
            return agent;
        }
    }
    return null;
}

function searchForAgent2(num) {
    if (!agentmap.agents) return null;
    for (let i = 0; i < agentmap.agents.count(); i++) {
        let agent = agentmap.agents.getLayers()[i];
        let agent_id = agentmap.agents.getLayerId(agent);
        let agent_num = agent.num;
        if (agent_num == num) {
            return agent;
        }
    }
    return null;
}

function getUnitFromCoord(_coord, streets) {
    for (let i = 0; i < agentmap.units.count(); i++) {
        let unit = agentmap.units.getLayers()[i];
        let unit_id = agentmap.units.getLayerId(unit);
        let unit_center = unit.getBounds().getCenter();
        let threshold = 0.0001;
        if (streets) threshold = 0.0004;
        // Find the unit close to the coordinate
        if (Math.abs(unit_center.lat - _coord.lat) < threshold && Math.abs(unit_center.lng - _coord.lng) < threshold) {
            return {"id": unit_id, "center": unit_center};
        }
    }
    return {"id": -1, "center": null};
}

function getRandomUnit() {
    let random_index = Math.floor(Math.random() * agentmap.units.count());
    const random_unit = agentmap.units.getLayers()[random_index];
    let random_unit_id = agentmap.units.getLayerId(random_unit);
    let random_unit_center = random_unit.getBounds().getCenter();

    return {"id": random_unit_id, "center": random_unit_center};
}

async function contactInsurance(agent1, agent2, time, location) {
    let responsible = "";
    // Extract and verify VC from agent1 and agent2
    let vc1 = agent1.vc;
    let vc2 = agent2.vc;
    let vc1_verified = await verifyIdentityVC(vc1);
    let vc2_verified = await verifyIdentityVC(vc2);

    // Check both agent's speed
    let speed_1 = agent1.speed;
    let speed_2 = agent2.speed;

    // If both agents are speeding, then both are responsible
    if (speed_1 > 3 && speed_2 > 3) responsible = "Both";
    // If only agent1 is speeding, then agent1 is responsible
    else if (speed_1 > 3) responsible = agent1.num;
    // If only agent2 is speeding, then agent2 is responsible
    else if (speed_2 > 3) responsible = agent2.num;
    // If both agents are not speeding, then the agent with unverified VC is responsible
    else if (!vc1_verified) responsible = agent1.num;
    else if (!vc2_verified) responsible = agent2.num;
    // If both agents are not speeding and both have verified VC, then both are responsible
    else responsible = "Both";

    // Add to database
    let vc = await addAccident(agent1.num, agent2.num, time, location, responsible);
    agent1.accident_vcs.push(vc);
    agent2.accident_vcs.push(vc);

    blockchain.innerHTML += "Accident between " + agent1.num + " and " + agent2.num +
        " is recorded in blockchain.<br>" + "车辆" + agent1.num + "和" + agent2.num + "事故记录已经写入区块链。<br>";
}