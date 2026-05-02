const fs = require('fs');
const token = fs.readFileSync('auth_token.txt', 'utf8').trim();

async function run() {
  const headers = { "Authorization": `Bearer ${token}` };
  
  const depotsRes = await fetch("http://20.207.122.201/evaluation-service/depots", { headers });
  const depots = await depotsRes.json();
  console.log("Depots:", JSON.stringify(depots, null, 2));

  const vehiclesRes = await fetch("http://20.207.122.201/evaluation-service/vehicles", { headers });
  const vehicles = await vehiclesRes.json();
  console.log("Vehicles sample:", vehicles.vehicles.slice(0, 3));
  console.log("Total vehicles:", vehicles.vehicles.length);
}
run();
