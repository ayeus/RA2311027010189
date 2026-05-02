export interface Vehicle {
    TaskID: string;
    Duration: number;
    Impact: number;
}

export interface KnapsackResult {
    selectedTasks: string[];
    totalDuration: number;
    totalImpact: number;
}

/**
 * Solves the 0/1 Knapsack problem for vehicle maintenance scheduling.
 * @param vehicles The list of available vehicles
 * @param mechanicHours The maximum allowed total duration
 * @returns The optimal subset of task IDs and their total impact and duration
 */
export function scheduleVehicles(vehicles: Vehicle[], mechanicHours: number): KnapsackResult {
    const n = vehicles.length;
    // DP table where dp[i][w] represents the max impact with first i vehicles and weight w
    // Using 1D array for space optimization since we only need previous row
    const dp: number[] = new Array(mechanicHours + 1).fill(0);
    
    // To reconstruct the chosen items, we need a 2D boolean array
    const keep: boolean[][] = Array(n).fill(0).map(() => new Array(mechanicHours + 1).fill(false));

    for (let i = 0; i < n; i++) {
        const vehicle = vehicles[i];
        for (let w = mechanicHours; w >= vehicle.Duration; w--) {
            if (dp[w - vehicle.Duration] + vehicle.Impact > dp[w]) {
                dp[w] = dp[w - vehicle.Duration] + vehicle.Impact;
                keep[i][w] = true;
            }
        }
    }

    // Reconstruct the solution
    const selectedTasks: string[] = [];
    let w = mechanicHours;
    let totalDuration = 0;

    for (let i = n - 1; i >= 0; i--) {
        if (keep[i][w]) {
            selectedTasks.push(vehicles[i].TaskID);
            totalDuration += vehicles[i].Duration;
            w -= vehicles[i].Duration;
        }
    }

    return {
        selectedTasks: selectedTasks.reverse(), // Optional: reverse to keep original relative order
        totalDuration,
        totalImpact: dp[mechanicHours]
    };
}
