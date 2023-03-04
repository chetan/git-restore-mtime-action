# git-restore-mtime action

A GitHub Workflow Action which restores timestamps of files in the current tree based on their last commit times. Uses the [git-restore-mtime](https://github.com/MestreLion/git-tools) script (v2022.12 release) by [@MestreLion](https://github.com/MestreLion).

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
      uses: actions/checkout@v3

    # Note: This is *only* for the very next step, it is not required by
    # git-restore-mtime-action.
    - name: setup node
      uses: actions/setup-node@v1
      with:
        node-version: '10.x'

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
      uses: actions/checkout@v3
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
