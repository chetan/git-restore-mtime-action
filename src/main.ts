import * as exec from '@actions/exec';
import path from 'path';

async function run() {
  const script = path.normalize(path.join(__dirname, '..', 'src', 'git-restore-mtime-bare'));
  try {
    await exec.exec('python', [script]);
  } catch (e) {
    console.error('git-restore-mtime-bare failed: ', e);
    process.exit(1);
  }
}

run();
