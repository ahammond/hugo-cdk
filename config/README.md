# Sites Configuration

This directory contains the single source of truth for all Hugo sites managed by this CDK application.

## Overview

Instead of hardcoding site configurations in multiple places, all site definitions are centralized in `sites.json`. This configuration file is used by:

1. **CDK deployment** (`src/main.ts`) - Creates infrastructure for each site
2. **Update script** (`scripts/update-github-vars.sh`) - Syncs CloudFormation exports to GitHub variables

## Configuration File

### `sites.json`

Defines all Hugo sites to be deployed. Each site configuration includes:

```json
{
  "sites": [
    {
      "name": "Blog",
      "domain": "blog.agh1973.com",
      "githubOrg": "ahammond",
      "githubRepo": "blog",
      "allowedBranches": ["main"]
    }
  ]
}
```

**Properties:**

- `name` (required): Stack name used in CDK and CloudFormation exports (must start with uppercase letter)
- `domain` (required): Full domain name for the site
- `githubOrg` (required): GitHub organization or username
- `githubRepo` (required): GitHub repository name
- `allowedBranches` (optional): Array of branch names that can deploy (defaults to `["main"]`)

### JSON Schema

The file `sites.schema.json` provides IDE autocomplete and validation. Most IDEs will automatically detect the `$schema` reference in `sites.json`.

## Adding a New Site

1. Edit `config/sites.json`:

```json
{
  "sites": [
    {
      "name": "Blog",
      "domain": "blog.agh1973.com",
      "githubOrg": "ahammond",
      "githubRepo": "blog",
      "allowedBranches": ["main"]
    },
    {
      "name": "Portfolio",
      "domain": "portfolio.example.com",
      "githubOrg": "myorg",
      "githubRepo": "portfolio",
      "allowedBranches": ["main", "staging"]
    }
  ]
}
```

2. Deploy the CDK stack:

```bash
pnpm run deploy:prod
```

3. Update GitHub variables for all repos:

```bash
pnpm run update-vars
```

That's it! No code changes needed.

## Benefits

**Single Source of Truth:**
- Add/remove sites by editing one JSON file
- No need to modify TypeScript code
- Reduces risk of inconsistencies

**Type Safety:**
- TypeScript interfaces in `src/sites-config.ts` ensure type safety
- JSON schema provides IDE validation

**Automation:**
- Script automatically discovers sites from config
- No hardcoded site lists in multiple places

**Validation:**
- Config is validated at CDK synth time
- Invalid configurations fail fast with clear error messages

## Implementation Details

### CDK Integration

The CDK app (`src/main.ts`) loads the configuration:

```typescript
import { loadSitesConfig } from './sites-config';

const sitesConfig = loadSitesConfig();

sitesConfig.sites.forEach((site) => {
  new HugoSiteStack(parentStack, site.name, {
    // ... configuration from sites.json
  });
});
```

### Script Integration

The update script (`scripts/update-github-vars.sh`) reads the same config:

```bash
if [[ -f "config/sites.json" ]]; then
  jq -r '.sites[] | "\(.githubRepo):\(.name)"' config/sites.json | \
    while IFS=: read -r repo name; do
      update_vars "$repo" "$name"
    done
fi
```

## Troubleshooting

### JSON Syntax Errors

If you see errors like "Invalid JSON", validate your JSON:

```bash
cat config/sites.json | jq .
```

### Missing Required Properties

The config loader will throw descriptive errors:
- "Site at index 0 is missing 'name' property"
- "Site 'Blog' is missing 'domain' property"

### Stack Name Conflicts

Site names must be unique and follow CloudFormation naming rules:
- Must start with uppercase letter
- Can contain letters and numbers only
- No special characters or spaces
