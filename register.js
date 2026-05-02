const email = "an2651@srmist.edu.in";
const name = "Aayush Namdeo";
const mobileNo = "8329887767";
const githubUsername = "ayeus";
const rollNo = "RA2311027010189";
const accessCode = "QkbpxH";

async function run() {
  try {
    const regRes = await fetch("http://20.207.122.201/evaluation-service/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name, mobileNo, githubUsername, rollNo, accessCode })
    });
    const regData = await regRes.json();
    console.log("Registration:", regData);

    const clientID = regData.clientID;
    const clientSecret = regData.clientSecret;

    if (!clientID) {
      console.error("Failed to get clientID. Maybe already registered? Let me know.");
      return;
    }

    const authRes = await fetch("http://20.207.122.201/evaluation-service/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name, rollNo, accessCode, clientID, clientSecret })
    });
    const authData = await authRes.json();
    console.log("Auth Token:", authData.access_token);
    
    require("fs").writeFileSync("auth_token.txt", authData.access_token);
  } catch (e) {
    console.error(e);
  }
}
run();
