import * as exec from '@actions/exec';
import path from 'path';

async function run() {
  const script = path.normalize(path.join(__dirname, '..', 'src', 'git-restore-mtime-bare'));
  await exec.exec('python', [script]);
}

run();
