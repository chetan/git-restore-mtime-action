# git-restore-mtime action

A GitHub Workflow Action which restores timestamps of files in the current tree based on their last commit times. Uses the [git-restore-mtime](https://github.com/MestreLion/git-tools) script (v2025.08 release) by [@MestreLion](https://github.com/MestreLion).

## Usage

The sample workflow below illustrates a static site build and deploy using the
[S3 Sync Action](https://github.com/jakejarvis/s3-sync-action). The `aws s3 sync` command relies on having the
correct timestamps for the files to be uploaded, thus, we must reset them before
running that action.

__NOTE__: git-restore-mtime uses the ref log to find the correct timestamp
for each file. This requires a full git history.  See `checkout dist` task in
the example below.

```yaml
name: Build and Deploy
on:
  push:
    branches:
      - master

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
    - name: checkout
      uses: actions/checkout@v4

    # Note: This is *only* for the very next step, it is not required by
    # git-restore-mtime-action.
    - name: setup node
      uses: actions/setup-node@v4
      with:
        node-version: 'latest'

    # Run the build script which populates the ./dist folder
    - name: build
      run: |
        yarn
        yarn run build

    # Merge ./dist into the 'gh-pages' branch (dist in this case)
    - name: update dist branch
      uses: peaceiris/actions-gh-pages@v2.3.1
      env:
        PERSONAL_TOKEN: ${{ secrets.ACCESS_TOKEN }}
        PUBLISH_BRANCH: dist
        PUBLISH_DIR: ./dist

    # Check out the new branch
    - name: checkout dist
      uses: actions/checkout@v4
      with:
        ref: dist
        # git-restore-mtime-bare uses the ref log to find the correct timestamp
        # for each file. This requires a full git history. The default value (1)
        # creates a shallow checkout.
        fetch-depth: 0

    # Fix timestamps
    - name: restore timestamps
      uses: chetan/git-restore-mtime-action@v2

    # Upload to S3
    - name: sync s3
      uses: jakejarvis/s3-sync-action@2fb81a9e9fea11e078587911c27754e42e6a6e88
      with:
        args: --exclude '.git*/*' --delete --follow-symlinks
      env:
        SOURCE_DIR: './'
        AWS_REGION: 'us-east-1'
        AWS_S3_BUCKET: ${{ secrets.AWS_S3_BUCKET }}
        AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
        AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

### Configuration

```yaml
- name: restore timestamps
  uses: chetan/git-restore-mtime-action@v2
  with:
    # Directory to change to before running the action. (Optional)
    # Default: '.'
    working-directory: '.'
    # Extra arguments to pass to git-restore-mtime script. (Optional)
    # Default: ''
    args: --unique-times
```

#### Available flags

```
usage: git-restore-mtime [-h] [--quiet | --verbose] [--cwd DIRECTORY] [--git-dir GITDIR] [--work-tree WORKTREE] [--force] [--merge] [--first-parent] [--skip-missing] [--no-directories] [--test] [--commit-time]
                         [--oldest-time] [--skip-older-than SECONDS] [--skip-older-than-commit] [--unique-times] [--version]
                         [PATHSPEC ...]

Change the modification time (mtime) of files in work tree, based on the date of the most recent commit that modified the file, including renames. Ignores untracked files and uncommitted deletions, additions and
renames, and by default modifications too.

positional arguments:
  PATHSPEC              Only modify paths matching PATHSPEC, relative to current directory. By default, update all but untracked files and submodules.
```

| Option | Description |
|--------|-------------|
| `-h`, `--help` | show this help message and exit |
| `--quiet`, `-q` | Suppress informative messages and summary statistics. |
| `--verbose`, `-v` | Print additional information for each processed file. Specify twice to further increase verbosity. |
| `--cwd`, `-C DIRECTORY` | Run as if git-restore-mtime was started in directory DIRECTORY. This affects how --work-tree, --git-dir and PATHSPEC arguments are handled. See 'man 1 git' or 'git --help' for more information. |
| `--git-dir GITDIR` | Path to the git repository, by default auto-discovered by searching the current directory and its parents for a .git/ subdirectory. |
| `--work-tree WORKTREE` | Path to the work tree root, by default the parent of GITDIR if it's automatically discovered, or the current directory if GITDIR is set. |
| `--force`, `-f` | Force updating files with uncommitted modifications. Untracked files and uncommitted deletions, renames and additions are always ignored. |
| `--merge`, `-m` | Include merge commits. Leads to more recent times and more files per commit, thus with the same time, which may or may not be what you want. Including merge commits may lead to fewer commits being evaluated as files are found sooner, which can improve performance, sometimes substantially. But as merge commits are usually huge, processing them may also take longer. By default, merge commits are only used for files missing from regular commits. |
| `--first-parent` | Consider only the first parent, the "main branch", when evaluating merge commits. Only effective when merge commits are processed, either when --merge is used or when finding missing files after the first regular log search. See --skip-missing. |
| `--skip-missing`, `-s` | Do not try to find missing files. If merge commits were not evaluated with --merge and some files were not found in regular commits, by default git-restore-mtime searches for these files again in the merge commits. This option disables this retry, so files found only in merge commits will not have their timestamp updated. |
| `--no-directories`, `-D` | Do not update directory timestamps. By default, use the time of its most recently created, renamed or deleted file. Note that just modifying a file will NOT update its directory time. |
| `--test`, `-t` | Test run: do not actually update any file timestamp. |
| `--commit-time`, `-c` | Use commit time instead of author time. |
| `--oldest-time`, `-o` | Update times based on the oldest, instead of the most recent commit of a file. This reverses the order in which the git log is processed to emulate a file "creation" date. Note this will be inaccurate for files deleted and re-created at later dates. |
| `--skip-older-than SECONDS` | Ignore files that are currently older than SECONDS. Useful in workflows that assume such files already have a correct timestamp, as it may improve performance by processing fewer files. |
| `--skip-older-than-commit`, `-N` | Ignore files older than the timestamp it would be updated to. Such files may be considered "original", likely in the author's repository. |
| `--unique-times` | Set the microseconds to a unique value per commit. Allows telling apart changes that would otherwise have identical timestamps, as git's time accuracy is in seconds. |
| `--version`, `-V` | show program's version number and exit |
