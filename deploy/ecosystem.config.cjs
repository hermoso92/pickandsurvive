/**
 * PM2 (alternativa a systemd):
 *   cd ~/PickandSurvive && pnpm build && pnpm --filter @pickandsurvive/api exec prisma migrate deploy
 *   pm2 start deploy/ecosystem.config.cjs
 *   pm2 save && pm2 startup
 */
const root = process.env.PICKANDSURVIVE_ROOT || `${process.env.HOME}/PickandSurvive`;

module.exports = {
  apps: [
    {
      name: 'pickandsurvive-api',
      cwd: `${root}/apps/api`,
      script: 'dist/main.js',
      interpreter: 'node',
      env: { NODE_ENV: 'production' },
    },
    {
      name: 'pickandsurvive-web',
      cwd: `${root}/apps/web`,
      script: 'node_modules/next/dist/bin/next',
      args: ['start', '--port', '3000'],
      interpreter: 'node',
      env: { NODE_ENV: 'production' },
    },
  ],
};
