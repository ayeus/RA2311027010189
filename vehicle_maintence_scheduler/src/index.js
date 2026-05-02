"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const knapsack_1 = require("./services/knapsack");
async function run() {
    const { Log, setLogToken } = require('logging_middleware');
    // Read the token obtained during registration
    const tokenPath = path_1.default.resolve('../auth_token.txt');
    if (!fs_1.default.existsSync(tokenPath)) {
        console.error("Auth token not found at:", tokenPath);
        return;
    }
    const token = fs_1.default.readFileSync(tokenPath, 'utf8').trim();
    setLogToken(token);
    await Log("backend", "info", "domain", "Starting Vehicle Maintenance Scheduler");
    try {
        const headers = { "Authorization": `Bearer ${token}` };
        // 1. Fetch Depots
        const depotsRes = await fetch("http://20.207.122.201/evaluation-service/depots", { headers });
        if (!depotsRes.ok)
            throw new Error("Failed to fetch depots");
        const depotsData = await depotsRes.json();
        const depots = depotsData.depots || [];
        // 2. Fetch Vehicles
        const vehiclesRes = await fetch("http://20.207.122.201/evaluation-service/vehicles", { headers });
        if (!vehiclesRes.ok)
            throw new Error("Failed to fetch vehicles");
        const vehiclesData = await vehiclesRes.json();
        const vehicles = vehiclesData.vehicles || [];
        // 3. Process for each Depot
        console.log("=== VEHICLE SCHEDULING RESULTS ===");
        for (const depot of depots) {
            console.log(`\nProcessing Depot ${depot.ID} (Budget: ${depot.MechanicHours} hours)`);
            const result = (0, knapsack_1.scheduleVehicles)(vehicles, depot.MechanicHours);
            console.log(`- Optimal Total Impact: ${result.totalImpact}`);
            console.log(`- Total Duration Used: ${result.totalDuration}`);
            console.log(`- Selected Task IDs:`);
            result.selectedTasks.forEach(id => console.log(`  * ${id}`));
            await Log("backend", "info", "handler", `Scheduled ${result.selectedTasks.length} tasks for Depot ${depot.ID}`);
        }
        await Log("backend", "info", "domain", "Vehicle scheduling completed");
    }
    catch (e) {
        console.error(e);
        await Log("backend", "fatal", "api", "Exception in vehicle scheduler: " + e.message);
    }
}
run();
//# sourceMappingURL=index.js.map