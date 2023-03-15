# shortener

A github action to create URL shortener service on the GitHub Pages.

## Usage

### Playground

- https://github.com/yaeda/s
- https://yaeda.github.io/s

### Build or Update

Build/Update short url service using database(`url.json`).

```yml
name: deploy

on:
  push:
    branches:
      - main
    paths:
      - url.json
      - 404.html
  workflow_dispatch:

# Allow one concurrent deployment
concurrency:
  group: pages
  cancel-in-progress: true

# Grant GITHUB_TOKEN the permissions required to make a Pages deployment
permissions:
  pages: write # to deploy to Pages
  id-token: write # to verify the deployment originates from an appropriate source

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Shorten
        uses: yaeda/shortener@v1
```

[real example](https://github.com/yaeda/s/blob/main/.github/workflows/deploy.yml)

### Create or Delete a short url via issue

Create a pull request to update database(`url.json`) via GitHub Issue.

```yml
name: request

on:
  issues:
    types: [opened, edited]

# Grant GITHUB_TOKEN the permissions
permissions:
  issues: write # to comment to the issue
  contents: write # to update json file
  pull-requests: write # to create pull request

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Shorten
        uses: yaeda/shortener@v1
```

[real example](https://github.com/yaeda/s/blob/main/.github/workflows/request.yml)

## Options

| Input                 | Description                    | Default      |
| --------------------- | ------------------------------ | ------------ |
| `json-database-path`  | path to the json database file | `./url.json` |
| `not-found-file-path` | path to the 404.html file      | `./404.html` |

## Tips

<!-- ### Prevent auto pull request marge

You can use GitHub's protection branch feature to disable auto-merge and intersperse the review process.

[About protected branches \- GitHub Docs](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests/about-protected-branches) -->

### Issue Template

Issue Template is useful for adding/removing URL and Alias from Issues. These are real examples.

- [create\-request\.yml](https://github.com/yaeda/s/blob/main/.github/ISSUE_TEMPLATE/create-request.yml)
- [delete\-request\.yml](https://github.com/yaeda/s/blob/main/.github/ISSUE_TEMPLATE/delete-request.yml)
