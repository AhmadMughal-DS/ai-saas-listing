// Production-mode preview launcher for the built server.
// Ensures NODE_ENV=production so server.cjs serves the built dist/ (SSR + static)
// instead of trying to spin up Vite dev middleware from the bundled file.
process.env.NODE_ENV = process.env.NODE_ENV || 'production';
require('../dist/server.cjs');
