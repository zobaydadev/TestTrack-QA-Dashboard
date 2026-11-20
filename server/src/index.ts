import { createApp } from './app';
import { config } from './config';
import { migrate } from './migrate';

async function main() {
  await migrate();
  createApp().listen(config.port, () => {
    console.log(`TestTrack API listening on port ${config.port} (docs at /docs)`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
