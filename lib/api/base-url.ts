/**
 * Where the backend listens, as the server side of this app reaches it
 * (API_URL; the backend is on 127.0.0.1, never public). Kept apart from
 * server.ts so code that only needs the address (the health check) can be
 * unit-tested.
 */
export const API_URL = (process.env.API_URL || 'http://localhost:4000').replace(/\/$/, '');
