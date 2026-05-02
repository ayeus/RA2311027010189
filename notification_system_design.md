# Campus Notifications Microservice Design

## Stage 1

### Core Actions
1. **Fetch Notifications**: Retrieve a paginated list of notifications for the logged-in user.
2. **Mark as Read**: Mark a specific notification or all notifications as read.
3. **Get Unread Count**: Fetch the total count of unread notifications for a badge display.

### REST API Endpoints

#### 1. Fetch Notifications
**Endpoint**: `GET /api/v1/notifications`
**Description**: Fetch a list of notifications for the user.
**Headers**:
```json
{
  "Authorization": "Bearer <token>"
}
```
**Response**:
```json
{
  "status": "success",
  "data": {
    "notifications": [
      {
        "id": "notif_123",
        "title": "New Placement Drive",
        "message": "Google is visiting the campus on 20th Oct.",
        "type": "Placement",
        "isRead": false,
        "createdAt": "2026-10-15T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5
    }
  }
}
```

#### 2. Mark Notification as Read
**Endpoint**: `PATCH /api/v1/notifications/:id/read`
**Description**: Mark a specific notification as read.
**Headers**:
```json
{
  "Authorization": "Bearer <token>"
}
```
**Request**: Empty body or `{ "isRead": true }`
**Response**:
```json
{
  "status": "success",
  "message": "Notification marked as read"
}
```

#### 3. Get Unread Count
**Endpoint**: `GET /api/v1/notifications/unread-count`
**Description**: Get the total unread notifications count for the UI badge.
**Response**:
```json
{
  "status": "success",
  "data": {
    "count": 3
  }
}
```

### Real-time Mechanism
To support real-time notifications for students, **WebSockets (or Server-Sent Events)** would be the best approach. 
When a student logs in, a persistent WebSocket connection is established with the backend. When an event (like a new Placement drive) is triggered, the backend pushes the notification payload directly to the connected client, allowing the UI to instantly display a toast notification and update the unread badge count without requiring the client to poll the server.

---

## Stage 2

### Persistent Storage Choice
For a notification system where the schema might evolve (e.g., storing varying metadata depending on whether it's an Event, Result, or Placement) and considering the massive scale of insertions during "Notify All" scenarios, a **NoSQL Database like MongoDB** is highly recommended.
- **Why?**: Notifications are primarily append-only and read-heavy by individual users. There are rarely complex relational joins needed. A NoSQL document store allows high-throughput writes and horizontal scaling (sharding) effortlessly as the student base and data volume grow.

### DB Schema (MongoDB Document)
```json
{
  "_id": "ObjectId",
  "studentId": "String (Indexed)",
  "title": "String",
  "message": "String",
  "type": "String (Enum: Event, Result, Placement)",
  "isRead": "Boolean",
  "createdAt": "Date (Indexed)",
  "metadata": "Object" 
}
```

### Problems with Data Volume Increases
1. **Storage Costs & Query Latency**: As notifications hit millions, the collection size becomes huge, slowing down reads.
2. **Write Bottlenecks**: Broadcasting a message to 50,000 students requires 50,000 document inserts simultaneously, which can lock/overwhelm the DB.

### Solutions
1. **TTL Indexes / Archiving**: Automatically delete or archive notifications older than 30 days to keep the active collection small.
2. **Fan-out on Read (for Global Broadcasts)**: Instead of creating 50,000 individual documents for a global placement notification, create one global document. When a user queries their notifications, merge their personal notifications with the global ones, tracking read receipts in a separate smaller collection.
3. **Batch Writes**: Use bulk inserts to group DB write operations.

### Queries (NoSQL - MongoDB)
**Fetch Unread Notifications**:
```javascript
db.notifications.find({ studentId: "1042", isRead: false }).sort({ createdAt: -1 })
```

---

## Stage 3

### Query Analysis
```sql
SELECT * FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt DESC;
```
**Is this query accurate?** Yes, it correctly fetches all unread notifications for a specific student, sorted by the newest first.
**Why is it slow?** With 5,000,000 rows, a sequential scan is required if there are no appropriate indexes. The database has to check every row to match the `studentID` and `isRead` conditions, and then sort them, which has a massive computation cost $O(N \log N)$ or $O(N)$.

### Changes & Computation Cost
To optimize this, I would add a **Composite Index** on `(studentID, isRead, createdAt DESC)`.
With this index, the computation cost drops from $O(N)$ table scans to $O(\log N)$ index lookups, directly returning pre-sorted results.

### Is indexing every column effective?
**No**. Adding indexes on every column is terrible advice. 
- **Why?**: While indexes speed up read operations, they drastically slow down write operations (INSERT, UPDATE, DELETE) because the database has to update every index for each write. Furthermore, it consumes significant additional disk space and memory. Indexes should only be created for columns frequently used in `WHERE`, `ORDER BY`, or `JOIN` clauses.

### Query for Placement Notifications in the Last 7 Days
```sql
SELECT DISTINCT studentID 
FROM notifications
WHERE notificationType = 'Placement' 
  AND createdAt >= NOW() - INTERVAL 7 DAY;
```

---

## Stage 4

### Performance Optimization for Page Loads
If notifications are fetched on every page load, it severely overwhelms the DB. 

### Solutions & Tradeoffs

#### 1. Caching Layer (Redis)
Store the most recent notifications (and the unread count) for each active user in a fast, in-memory datastore like Redis.
- **Implementation**: When a page loads, the backend queries Redis first. If the cache misses, it queries the DB, stores it in Redis with an expiration (TTL), and returns it. Updates (new notifications, marking as read) invalidate or update the cache.
- **Tradeoffs**: Requires maintaining cache consistency (stale data if invalidation fails) and adds infrastructural complexity (managing a Redis cluster). However, it drops read latency to single-digit milliseconds.

#### 2. Local Storage & Client-Side State
Fetch notifications once upon initial login and store them in the browser's Redux state or `localStorage`. Rely exclusively on WebSockets to push new notifications to the client dynamically.
- **Tradeoffs**: Zero database load on subsequent page navigations. However, if the WebSocket disconnects, the user might miss a notification until the app is fully refreshed.

**Recommended Solution**: A combination of both. Use Redis to serve the initial load instantly, and WebSockets to update the UI without subsequent HTTP requests during the session.

---

## Stage 5

### Shortcomings of the Pseudocode
1. **Synchronous & Blocking**: Sending an email and a push notification is a slow network operation. Looping synchronously over 50,000 students will cause the HTTP request to timeout, freezing the HR's interface.
2. **Lack of Fault Tolerance**: If `send_email` fails midway (e.g., at student 201), the loop throws an exception and crashes. The remaining 49,800 students receive nothing, and there is no easy way to retry without sending duplicates to the first 200.
3. **Database Overload**: Firing 50,000 individual `save_to_db` inserts sequentially will heavily degrade database performance.

### Redesigning for Reliability and Speed
To solve this, we must use an **Asynchronous Message Queue (e.g., RabbitMQ, Kafka, AWS SQS)**.
When the HR clicks "Notify All", the backend shouldn't send the emails itself. Instead, it should immediately acknowledge the request, then publish 50,000 messages (or chunked batches) to a message broker. Dedicated worker services will asynchronously consume these messages, send the emails, and perform bulk DB inserts.

### Should saving to DB and sending email happen together?
**No**. They should be decoupled. The database insert guarantees the notification is logged in the system. The email delivery is an external dependency that can fail, timeout, or get rate-limited. By decoupling them, a failure in the email provider won't prevent the in-app notification from being delivered. 

### Revised Pseudocode
```python
function notify_all(student_ids, message):
    # 1. Bulk insert to DB efficiently in one query
    save_to_db_in_bulk(student_ids, message)
    
    # 2. Publish to an asynchronous Queue
    for batch in chunk(student_ids, 500):
        publish_to_message_queue(queue_name="email_notifications", batch, message)
        publish_to_message_queue(queue_name="push_notifications", batch, message)
        
    return "Notification process started"

# Separate Worker Process (Consumer)
function on_consume_email_queue(batch, message):
    try:
        bulk_send_email_api(batch, message)
    except Exception as e:
        # If it fails, the queue automatically retries later
        retry_message_in_queue()
```

---

## Stage 6

### Approach to Priority Inbox
To maintain the top 'n' most important notifications efficiently as new notifications stream in, we use a **Min-Heap (Priority Queue)** constrained to size 'n'.

**Priority Scoring:**
Priority is determined by a combination of Weight and Recency.
1. **Weight**: We map `Placement` = 3, `Result` = 2, `Event` = 1.
2. **Recency**: We parse the `Timestamp` into a Unix epoch timestamp.
3. **Comparison**: When comparing two notifications, we first compare their Weights. If the Weights are equal, we compare their Timestamps.

**Algorithm for incoming notifications:**
- If the heap has fewer than 'n' elements, we insert the new notification.
- If the heap has exactly 'n' elements, we compare the new notification with the root of the Min-Heap (which holds the *lowest* priority notification currently in the top 'n').
- If the new notification has a higher priority than the root, we remove the root and insert the new notification.
- This ensures that insertion takes $O(\log n)$ time, and finding the minimum takes $O(1)$ time. Since $n$ is a small constant (e.g., 10), maintaining this list is extremely fast and scalable.

The functioning code for this algorithm is implemented in the `notification_app_be` directory.
