import { SERVICES } from '../data/services.js';

export async function handleServiceCatalog() {
  return {
    contents: [
      {
        uri: 'logs://services/catalog',
        mimeType: 'application/json',
        text: JSON.stringify({ services: SERVICES }, null, 2),
      },
    ],
  };
}
