import { Service } from '../types/index.js';

export const SERVICES: Service[] = [
  {
    name: 'employee-service-srv',
    version: '1.2.3',
    type: 'backend',
    language: 'Java',
    dependencies: ['config-service-srv'],
    endpoints: [
      { path: '/api/employees/search', method: 'GET' },
      { path: '/api/employees/{id}', method: 'GET' },
      { path: '/api/employees/create', method: 'POST' },
    ],
  },
  {
    name: 'payroll-service-srv',
    version: '2.3.1',
    type: 'backend',
    language: 'Java',
    dependencies: ['employee-service-srv', 'timesheet-service-srv'],
    endpoints: [
      { path: '/api/payroll/process', method: 'POST' },
      { path: '/api/payroll/calculate', method: 'POST' },
    ],
  },
  {
    name: 'timesheet-service-srv',
    version: '3.1.0',
    type: 'backend',
    language: 'Java',
    dependencies: ['employee-service-srv'],
    endpoints: [
      { path: '/api/timesheet/submit', method: 'POST' },
      { path: '/api/timesheet/{id}', method: 'GET' },
      { path: '/api/timesheet/approve', method: 'POST' },
    ],
  },
  {
    name: 'notification-service-srv',
    version: '1.5.2',
    type: 'backend',
    language: 'Go',
    dependencies: ['employee-service-srv'],
    endpoints: [
      { path: '/api/notifications/send', method: 'POST' },
      { path: '/api/notifications/history', method: 'GET' },
    ],
  },
  {
    name: 'config-service-srv',
    version: '1.0.1',
    type: 'backend',
    language: 'Python',
    dependencies: [],
    endpoints: [
      { path: '/api/config/{key}', method: 'GET' },
    ],
  },
];
