# Bug Scenario: Memory Leak in Employee Service

## Overview
The employee-service-srv has a memory leak caused by an unbounded search cache that grows indefinitely without any eviction policy.

## Root Cause (in GitHub Repository)

**Repository:** https://github.com/biznetworkhackathon2026/employee-service  
**File:** `srv/employee-service.js`  
**Commit:** `implement employee search caching` (2b74373)

### The Bug:
```javascript
// Memory leak: Cached search results that are never cleared
const searchCache = new Map();

srv.before('READ', Employees, async (req) => {
    // BUG: searchCache grows indefinitely - never clears old entries
    searchCache.set(cacheKey, {
        results: results,
        rawResults: JSON.parse(JSON.stringify(results)) // Duplicate copy!
    });
});
```

### Issues:
1. **No cache eviction policy** - entries never removed
2. **No size limit** - cache grows forever  
3. **Duplicate data** - stores both `results` and `rawResults`
4. **No TTL** - old entries stay in memory indefinitely

## Detection via MCP Server

### 1. Kibana Logs (fetch_kibana_logs tool)

Query logs for errors:
```
fetch_kibana_logs:
  service_name: "employee-service-srv"
  log_level: "ERROR"
  search_query: "searchCache"
  start_time: "-7h"
```

**Result:**
```json
{
  "message": "FATAL ERROR: JavaScript heap out of memory - searchCache Map has grown to 15.2 GB with 8472 cached search queries (employee-service.js:56)",
  "error": {
    "type": "Error [ERR_HEAP_OUT_OF_MEMORY]",
    "stack_trace": "at Object.srv.before (/app/srv/employee-service.js:56)"
  },
  "exception": {
    "stacktrace": [
      "at Object.srv.before (/app/srv/employee-service.js:56)",
      "at processTicksAndRejections (node:internal/process/task_queues:123)",
      "at async /app/node_modules/@sap/cds/lib/srv/Service.js:406"
    ]
  }
}
```

**Key Evidence:**
- Points directly to line 56 in `employee-service.js` (the cache logic)
- Shows `searchCache Map` has grown to 15.2 GB
- Indicates 8472 cached queries without cleanup
- Node.js heap out of memory error

### 2. Prometheus Metrics (query_prometheus_metrics tool)

Query memory usage:
```
query_prometheus_metrics:
  metric_name: "memory_usage_bytes"
  service_name: "employee-service-srv"
  start_time: "-7h"
```

**Result:**
```json
{
  "analysis": {
    "trend": "increasing",
    "min_value": 500000000,      // 500 MB
    "max_value": 799166666,       // 799 MB
    "current_value": 799166666,
    "anomaly_detected": false
  }
}
```

**Key Evidence:**
- Memory steadily increases from 500MB → 800MB over 7 hours
- `trend: "increasing"` confirms memory leak pattern
- Matches the timeline of cache growth

## How AI Agents Should Detect & Fix

### Step 1: Analyze Logs
- Search for ERROR logs in employee-service-srv
- Find heap out of memory errors
- Identify the stack trace points to `employee-service.js:56`
- Notice the mention of "searchCache Map has grown to 15.2 GB"

### Step 2: Correlate with Metrics
- Query memory_usage_bytes for employee-service-srv
- Confirm increasing trend over same time period
- Memory grows from 500MB → 800MB

### Step 3: Find the Bug in Code
- Clone the repository
- Open `srv/employee-service.js`
- Find the `searchCache` Map around line 56
- Identify issues:
  - No `.clear()` or eviction mechanism
  - No size limit check
  - Duplicate data storage (results + rawResults)

### Step 4: Generate Fix PR
```javascript
// FIX: Add LRU cache with size limit
const LRU = require('lru-cache');
const searchCache = new LRU({
    max: 500,           // Max 500 entries
    maxAge: 1000 * 60 * 5  // 5 minute TTL
});

srv.before('READ', Employees, async (req) => {
    searchCache.set(cacheKey, {
        results: results
        // Remove duplicate rawResults
    });
});
```

**PR Description should include:**
- Root cause: Unbounded cache without eviction
- Evidence: Kibana logs showing 15.2GB cache, Prometheus showing 500MB→800MB increase
- Fix: LRU cache with 500 entry limit and 5-minute TTL
- Impact: Prevents memory leak, limits cache to ~50MB

## Testing the Fix

After deploying the fix:
1. Query logs - should not see heap out of memory errors
2. Query metrics - memory should stabilize around baseline (500-550MB)
3. Verify trend changes from "increasing" to "stable"
