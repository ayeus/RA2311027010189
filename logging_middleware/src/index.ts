type Stack = "backend" | "frontend";
type Level = "debug" | "info" | "warn" | "error" | "fatal";
type BackendPackage = "cache" | "controller" | "cron_job" | "db" | "domain" | "handler" | "repository" | "route" | "service";
type FrontendPackage = "api" | "component" | "hook" | "page" | "state" | "style";
type CommonPackage = "auth" | "config" | "middleware" | "utils";

type Package = BackendPackage | FrontendPackage | CommonPackage;

let _accessToken: string | null = null;

/**
 * Configure the logging middleware with the evaluation server access token.
 */
export function setLogToken(token: string) {
    _accessToken = token;
}

/**
 * Log an event to the Affordmed evaluation test server.
 */
export async function Log(stack: Stack, level: Level, pkg: Package, message: string) {
    if (!_accessToken) {
        console.warn("Logging Middleware Error: Access token not set. Call setLogToken() first.");
        return;
    }

    try {
        const response = await fetch("http://20.207.122.201/evaluation-service/logs", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${_accessToken}`
            },
            body: JSON.stringify({
                stack,
                level,
                package: pkg,
                message
            })
        });

        if (!response.ok) {
            const errBody = await response.text();
            console.error(`Logging Middleware Failed: ${response.status} ${response.statusText}`, errBody);
        } else {
            // Optional: you can parse the JSON response here if needed, but returning it is good enough
            const data = await response.json();
            // console.log("Log created successfully", data);
        }
    } catch (error) {
        console.error("Logging Middleware Exception:", error);
    }
}
