import { BugScenario } from '../types/index.js';

export const SCENARIOS: BugScenario[] = [
  {
    id: 'memory-leak-employee',
    name: 'Memory Leak in Employee Service - Unbounded Search Cache',
    service: 'employee-service-srv',
    startTime: '-6h',
    symptoms: {
      logPatterns: [
        'FATAL ERROR: JavaScript heap out of memory - searchCache Map has grown to 15.2 GB with 8472 cached search queries (employee-service.js:56)',
      ],
      metricName: 'memory_usage_bytes',
      metricTrend: 'increasing',
    },
  },
];
