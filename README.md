# Affordmed Campus Hiring Evaluation - Backend

## Student Details
- **Name:** Aayush Namdeo
- **Roll No:** RA2311027010189
- **Email:** an2651@srmist.edu.in
- **Mobile:** 8329887767
- **GitHub:** [ayeus](https://github.com/ayeus)

## Repository Structure

```
├── logging_middleware/          # Reusable logging middleware package
├── vehicle_maintence_scheduler/ # Vehicle Maintenance Scheduler (0/1 Knapsack DP)
├── notification_app_be/         # Priority Inbox implementation (Stage 6)
├── notification_system_design.md # System design document (Stages 1-6)
└── README.md
```

## Logging Middleware
A shared TypeScript package that provides a `Log(stack, level, package, message)` function to send audit logs to the evaluation server.

## Vehicle Maintenance Scheduler
Implements a **0/1 Knapsack Dynamic Programming** algorithm to determine the optimal subset of vehicle maintenance tasks that maximizes operational impact within the available daily mechanic-hour budget per depot.

## Campus Notifications Microservice
A comprehensive system design document (`notification_system_design.md`) covering:
- **Stage 1:** REST API design & real-time notification mechanism (WebSockets)
- **Stage 2:** Database schema (MongoDB), volume handling strategies
- **Stage 3:** SQL query optimization, composite indexing analysis
- **Stage 4:** Caching strategies (Redis) & client-side state management
- **Stage 5:** Asynchronous message queues for reliable bulk notifications
- **Stage 6:** Priority Inbox using a Min-Heap data structure

## How to Run

### Vehicle Scheduler
```bash
cd vehicle_maintence_scheduler
npm install
npx tsc
node dist/index.js
```

### Priority Inbox
```bash
cd notification_app_be
npm install
npx tsc
npx ts-node priority_inbox.ts
```
