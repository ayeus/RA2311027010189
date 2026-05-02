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
export declare function scheduleVehicles(vehicles: Vehicle[], mechanicHours: number): KnapsackResult;
//# sourceMappingURL=knapsack.d.ts.map