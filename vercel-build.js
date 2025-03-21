const { execSync } = require('child_process');

// Generate Prisma Client
execSync('npx prisma generate');

// Continue with the normal build process
execSync('next build');