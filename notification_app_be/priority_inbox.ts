import fs from 'fs';
import path from 'path';

// Define the notification type based on the API response
interface Notification {
    ID: string;
    Type: string;
    Message: string;
    Timestamp: string;
}

// Map the weights
const WEIGHTS: Record<string, number> = {
    'Placement': 3,
    'Result': 2,
    'Event': 1
};

// Priority Queue implementation (Min-Heap)
class PriorityInbox {
    private heap: Notification[] = [];
    private maxSize: number;

    constructor(maxSize: number = 10) {
        this.maxSize = maxSize;
    }

    // Helper to compare two notifications. Returns true if a > b.
    // Greater means higher priority (should NOT be at the top of the min-heap).
    // The top of the min-heap contains the LEAST important element among the top 'n'.
    private compare(a: Notification, b: Notification): number {
        const weightA = WEIGHTS[a.Type] || 0;
        const weightB = WEIGHTS[b.Type] || 0;

        if (weightA !== weightB) {
            return weightA - weightB; // Higher weight is greater priority
        }

        const timeA = new Date(a.Timestamp).getTime();
        const timeB = new Date(b.Timestamp).getTime();

        return timeA - timeB; // Higher timestamp (more recent) is greater priority
    }

    private pushHeap(item: Notification) {
        this.heap.push(item);
        this.siftUp(this.heap.length - 1);
    }

    private popHeap(): Notification | undefined {
        if (this.heap.length === 0) return undefined;
        if (this.heap.length === 1) return this.heap.pop();

        const root = this.heap[0];
        this.heap[0] = this.heap.pop() as Notification;
        this.siftDown(0);
        return root;
    }

    private siftUp(index: number) {
        let current = index;
        while (current > 0) {
            const parent = Math.floor((current - 1) / 2);
            if (this.compare(this.heap[current]!, this.heap[parent]!) < 0) {
                // Swap
                [this.heap[current], this.heap[parent]] = [this.heap[parent]!, this.heap[current]!];
                current = parent;
            } else {
                break;
            }
        }
    }

    private siftDown(index: number) {
        let current = index;
        const size = this.heap.length;

        while (true) {
            const leftChild = 2 * current + 1;
            const rightChild = 2 * current + 2;
            let smallest = current;

            if (leftChild < size && this.compare(this.heap[leftChild]!, this.heap[smallest]!) < 0) {
                smallest = leftChild;
            }

            if (rightChild < size && this.compare(this.heap[rightChild]!, this.heap[smallest]!) < 0) {
                smallest = rightChild;
            }

            if (smallest !== current) {
                [this.heap[current], this.heap[smallest]] = [this.heap[smallest]!, this.heap[current]!];
                current = smallest;
            } else {
                break;
            }
        }
    }

    // Process a new incoming notification
    public addNotification(notification: Notification) {
        if (this.heap.length < this.maxSize) {
            this.pushHeap(notification);
        } else {
            // Compare with the minimum (root of the min-heap)
            if (this.compare(notification, this.heap[0]!) > 0) {
                this.popHeap();
                this.pushHeap(notification);
            }
        }
    }

    // Get the sorted top notifications (descending order of priority)
    public getTopNotifications(): Notification[] {
        // We clone the heap to avoid mutating it during sort
        const sorted = [...this.heap].sort((a, b) => this.compare(b, a));
        return sorted;
    }
}

import { Log, setLogToken } from 'logging_middleware';

// Main function to fetch and process
async function run() {
    // Read the token obtained during registration
    const tokenPath = path.resolve('../auth_token.txt');
    if (!fs.existsSync(tokenPath)) {
        console.error("Auth token not found at:", tokenPath);
        return;
    }
    const token = fs.readFileSync(tokenPath, 'utf8').trim();
    setLogToken(token);

    await Log("backend", "info", "service", "Starting Priority Inbox fetch process");

    const inbox = new PriorityInbox(10);

    try {
        const response = await fetch("http://20.207.122.201/evaluation-service/notifications", {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!response.ok) {
            await Log("backend", "error", "service", `Failed to fetch notifications: ${response.status}`);
            return;
        }

        const data = await response.json();
        const notifications: Notification[] = data.notifications || [];

        notifications.forEach(notif => {
            inbox.addNotification(notif);
        });

        const top10 = inbox.getTopNotifications();
        
        console.log("=== TOP 10 PRIORITY INBOX ===");
        top10.forEach((notif, index) => {
            console.log(`${index + 1}. [${notif.Type}] ${notif.Message} (${notif.Timestamp})`);
        });

        await Log("backend", "info", "service", "Priority Inbox processed successfully");

    } catch (e: any) {
        console.error(e);
        await Log("backend", "fatal", "service", "Exception while fetching priority inbox: " + e.message);
    }
}

run();
