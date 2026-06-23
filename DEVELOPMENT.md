# Development Guide

This guide covers how to test envspec locally and deploy it to npm.

## Prerequisites

- Node.js >= 18
- npm account (for publishing)
- Git

## Local Testing

### 1. Install Dependencies

```bash
npm install
```

### 2. Link the Package Globally

The easiest way to test your CLI tool locally is to use `npm link`:

```bash
npm link
```

This creates a symbolic link from your global `node_modules` to your local project, allowing you to run `envspec` from anywhere as if it were installed globally.

### 3. Test the CLI

After linking, you can run envspec commands:

```bash
# Verify installation
envspec --help

# Test commands
envspec init
envspec create
envspec validate
envspec git-protect
envspec schema:validate
envspec status
envspec template
```

### 4. Test in a Separate Project

To test envspec in a real project context:

```bash
# Create a test directory
mkdir test-envspec
cd test-envspec

# Initialize a new project
npm init -y

# Link envspec to this project
npm link @devakio/envspec

# Now you can use envspec in this test project
envspec init
envspec create --example
envspec validate
```

### 5. Unlink When Done

To remove the global link when you're done testing:

```bash
npm unlink -g @devakio/envspec
```

Or from the test project:

```bash
npm unlink @devakio/envspec
```

## Manual Testing Checklist

Before publishing, test these scenarios:

- [ ] `envspec init` creates empty schema
- [ ] `envspec init --from-env` infers schema from existing .env
- [ ] `envspec create` generates .env with placeholders
- [ ] `envspec create --example` uses example values
- [ ] `envspec validate` passes with valid .env
- [ ] `envspec validate` fails with missing required vars
- [ ] `envspec validate` fails with type mismatches
- [ ] `envspec git-protect` adds entries to .gitignore
- [ ] `envspec schema:validate` validates schema structure
- [ ] All commands work with `--debug` flag

## Running Tests

Currently, the project does not have automated tests. To add testing:

### Install Testing Dependencies

```bash
npm install --save-dev vitest
```

### Create Test Files

Create test files in a `tests` directory:

```
tests/
  ├── commands/
  │   ├── init.test.js
  │   ├── create.test.js
  │   ├── validate.test.js
  │   └── ...
  └── utils/
      ├── parser.test.js
      └── validator.test.js
```

### Add Test Script to package.json

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

### Run Tests

```bash
npm test
```

## Deployment to npm

### 1. Prepare for Publishing

#### Verify package.json

Ensure your `package.json` has all required fields:

```json
{
  "name": "@devakio/envspec",
  "version": "0.1.1",
  "description": "A schema-driven CLI tool for validating, generating, and protecting environment variables",
  "bin": {
    "envspec": "./bin/envspec.js"
  },
  "files": [
    "bin",
    "src",
    "README.md",
    "LICENSE"
  ],
  "engines": {
    "node": ">=18"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/akshayxemo/envspec"
  },
  "keywords": [...],
  "license": "MIT"
}
```

#### Verify .npmignore

Check that `.npmignore` excludes development files:

```
node_modules
.git
.gitignore
.npmignore
example
tests
*.test.js
*.spec.js
.env
.env.*
```

#### Ensure Files are Executable

The bin file should have executable permissions:

```bash
# On Unix/Linux/macOS
chmod +x bin/envspec.js
```

### 2. Login to npm

```bash
npm login
```

You'll need:
- Your npm username
- Your npm password
- One-time password (if 2FA is enabled)

### 3. Check Package Name Availability

```bash
npm view @devakio/envspec
```

If this returns an error, the package name is available. If it returns package info, the name is taken.

### 4. Dry Run (Test Publish)

Run a dry run to check if everything is correct without actually publishing:

```bash
npm publish --dry-run
```

This will:
- Validate your package
- Show what files will be published
- Check for common errors

### 5. Publish to npm

#### Public Package (Recommended)

```bash
npm publish --access public
```

This is required for scoped packages (`@username/package-name`) to be publicly accessible.

#### Private Package

```bash
npm publish --access private
```

This requires a paid npm account and the package will only be accessible to you.

### 6. Verify Publication

After publishing, verify the package is available:

```bash
npm view @devakio/envspec
```

You can also check on the npm website: https://www.npmjs.com/package/@devakio/envspec

### 7. Test the Published Package

Install and test the published package in a new directory:

```bash
mkdir test-published
cd test-published
npm init -y
npm install -g @devakio/envspec
envspec --help
```

## Version Management

### Semantic Versioning

Follow semantic versioning (semver):
- **MAJOR** (0.1.1 → 1.0.0): Breaking changes
- **MINOR** (0.1.1 → 0.2.0): New features, backward compatible
- **PATCH** (0.1.1 → 0.1.2): Bug fixes, backward compatible

### Updating Version

#### Manual Update

Edit `package.json` and increment the version number, then:

```bash
npm publish
```

#### Using npm version

```bash
# Patch version
npm version patch

# Minor version
npm version minor

# Major version
npm version major
```

This automatically:
- Updates `package.json`
- Creates a git tag
- Commits the change

Then publish:

```bash
git push --tags
npm publish
```

## Publishing Checklist

Before publishing a new version:

- [ ] All tests pass
- [ ] Manual testing completed
- [ ] Version number updated in package.json
- [ ] CHANGELOG.md updated (if applicable)
- [ ] README.md is up to date
- [ ] .npmignore is correct
- [ ] Bin file is executable
- [ ] `npm publish --dry-run` succeeds
- [ ] Git commit and push completed
- [ ] Git tag created and pushed

## CI/CD for Automated Publishing

### GitHub Actions Example

Create `.github/workflows/publish.yml`:

```yaml
name: Publish to npm

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          registry-url: 'https://registry.npmjs.org'
      
      - run: npm ci
      
      - run: npm test
      
      - run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### Setup

1. Create an npm access token: https://www.npmjs.com/settings/tokens
2. Add the token as a secret in your GitHub repo: `NPM_TOKEN`
3. When you want to publish, create and push a git tag:

```bash
git tag v0.1.2
git push origin v0.1.2
```

The GitHub Action will automatically run tests and publish to npm.

## Troubleshooting

### "You do not have permission to publish"

- Ensure you're logged in to the correct npm account
- Verify you have publish permissions for the scoped package
- For scoped packages, use `--access public` flag

### "403 Forbidden" on publish

- Check if the package name is already taken
- Verify your npm token has publish permissions
- Ensure you're using the correct registry

### Bin file not found

- Verify the `bin` field in package.json points to the correct file
- Ensure the bin file has a shebang: `#!/usr/bin/env node`
- Check file permissions on Unix/Linux/macOS

### Files not included in package

- Check `.npmignore` doesn't exclude necessary files
- Verify the `files` field in package.json includes all needed directories
- Run `npm pack` and inspect the tarball to see what's included

## Additional Resources

- [npm Publishing Documentation](https://docs.npmjs.com/cli/v9/commands/npm-publish)
- [Semantic Versioning](https://semver.org/)
- [npm Scoped Packages](https://docs.npmjs.com/cli/v9/using-npm/scope)
- [GitHub Actions for npm](https://docs.github.com/en/actions/publishing-packages/publishing-nodejs-packages)
