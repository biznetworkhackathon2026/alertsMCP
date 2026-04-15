import { handleServiceCatalog } from './service-catalog.js';
import { handleLogSchema } from './log-schemas.js';

export const resourceUris = [
  'logs://services/catalog',
  'logs://schemas/log-entry',
];

export const resourceHandlers: Record<string, () => Promise<any>> = {
  'logs://services/catalog': handleServiceCatalog,
  'logs://schemas/log-entry': handleLogSchema,
};
