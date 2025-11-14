# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an AWS CDK TypeScript application that deploys Hugo static sites to AWS with GitHub Actions for CI/CD. It creates a complete infrastructure stack that:
- Provisions AWS infrastructure (S3, CloudFront, Route53, ACM certificates)
- Creates IAM roles for GitHub Actions OIDC authentication
- Enables automated Hugo site deployment via GitHub Actions workflows
- Manages DNS, SSL certificates, and CloudFront edge lambdas for URL canonicalization

## Development Commands

This project uses **pnpm** as the package manager and **projen** for project management.

### Essential Commands

```bash
# Install dependencies
pnpm install

# Compile TypeScript
pnpm run build

# Run tests
pnpm run test

# Run tests in watch mode
pnpm run test:watch

# Run a single test file
pnpm run test test/cloudfront-redirect.test.ts

# Lint
pnpm run eslint

# CDK commands (use appropriate --profile flag if needed)
pnpm cdk list           # List all stacks
pnpm run synth          # Synthesize CloudFormation templates
pnpm run diff           # Compare deployed stack with current state
pnpm run deploy         # Deploy all stacks
pnpm cdk deploy Blog    # Deploy specific stack
pnpm run destroy        # Destroy all stacks

# Bootstrap CDK (one-time per AWS account)
npx cdk --profile personal bootstrap

# Invalidate CloudFront cache (after deployment if needed)
aws cloudfront create-invalidation --distribution-id <distribution-id> --paths "/*"
```

### Projen Management

This project is managed by projen. **DO NOT edit** the following files directly as they are auto-generated:
- `package.json`
- `tsconfig.json`
- `cdk.json`
- `.github/workflows/*`
- `.gitignore`

Instead, edit `.projenrc.ts` and run `pnpm run projen` to regenerate these files.

## Architecture

### Core Components

The application is structured around three main CDK constructs:

1. **HugoSiteStack** (`src/hugo-site.ts`): Top-level stack that orchestrates the entire Hugo site deployment. It combines a StaticSite and a GitHubOIDCRole, and exports CloudFormation outputs needed for GitHub Actions configuration.

2. **StaticSite** (`src/static-site.ts`): Creates the hosting infrastructure:
   - S3 bucket for static content with Intelligent-Tiering storage class
   - CloudFront distribution with custom domain and SSL certificate (ACM)
   - Route53 DNS records for the site domain
   - Separate log bucket for CloudFront access logs
   - Lambda@Edge function for URL canonicalization (redirecting directory URLs to index.html)

3. **GitHubOIDCRole** (`src/github-oidc-role.ts`): Creates IAM resources for GitHub Actions authentication:
   - OpenID Connect (OIDC) provider for token.actions.githubusercontent.com
   - IAM role with trust policy restricting access to specific GitHub org/repo/branches
   - S3 read/write permissions scoped to the site bucket
   - CloudFront invalidation permissions for cache clearing
   - No GitHub credentials stored in AWS - uses short-lived OIDC tokens instead

4. **CloudfrontRedirect** (`src/cloudfront-redirect.ts`): Lambda@Edge function that handles URL canonicalization at the CloudFront edge. Companion implementation file: `src/cloudfront-redirect.cloudfront-redirect.ts`.
   - Extends `NodejsFunction` for TypeScript bundling with esbuild
   - Uses `determineLatestNodeRuntime(scope)` for automatic runtime selection
   - Automatically handles index.html rewriting for directory paths (including root `/`)
   - Uses `currentVersion` for automatic Lambda version management

### Configuration

The entry point (`src/main.ts`) defines site-specific configuration including:
- AWS account ID and region (supports environment variables: `CDK_DEFAULT_ACCOUNT`, `AWS_ACCOUNT_ID`)
- GitHub organization (supports environment variable: `GITHUB_ORG`)
- Site domain (supports environment variable: `SITE_DOMAIN`)
- Individual site names and allowed deployment branches

Multiple sites can be deployed by adding additional `HugoSiteStack` instances in `main.ts`.

### Deployment Workflow

1. **Deploy CDK Infrastructure**:
   ```bash
   pnpm projen build
   pnpm run deploy
   ```
   This creates S3 buckets, CloudFront distributions, IAM roles, and outputs the values needed for GitHub Actions.

2. **Configure GitHub Repository**:
   - Copy `docs/deploy.yml.example` to your Hugo repository as `.github/workflows/deploy.yml`
   - Set GitHub secrets from CDK outputs:
     - `AWS_ROLE_ARN`: GitHubActionsRoleArn from stack outputs
     - `AWS_S3_BUCKET`: S3BucketName from stack outputs
     - `AWS_CLOUDFRONT_ID`: CloudFrontDistributionId from stack outputs
   - See `docs/github-actions-setup.md` for detailed setup instructions

3. **Deploy Hugo Site**:
   Push to the configured branch (default: `main`) in your Hugo repository. GitHub Actions will:
   - Build the Hugo site
   - Authenticate to AWS via OIDC (no stored credentials)
   - Sync content to S3
   - Invalidate CloudFront cache

### Prerequisites

1. AWS CLI configured with appropriate profile
2. Domain managed by AWS Route53
3. Node.js 22+ and pnpm installed
4. GitHub repository with Hugo site content

## Testing

Tests use Jest with ts-jest preset:
- Test files: `test/*.test.ts`
- Coverage reports generated in `coverage/`
- Tests cover the main constructs: StaticSite, GitHubOIDCRole, and CloudfrontRedirect
- Run tests with `pnpm projen test` (includes linting)

## Important Notes

### Architecture Decisions
- **GitHub Actions over CodeBuild**: Uses GitHub Actions for CI/CD instead of AWS CodeBuild
  - Free for public repos, 2,000 free minutes/month for private repos
  - No AWS credentials storage - uses OIDC for authentication
  - Build logs visible directly in GitHub PR UI
  - Hugo version manageable per-repository via workflow files

- **OIDC Authentication**: IAM roles use OpenID Connect for secure, credential-less authentication
  - Short-lived tokens (15 minutes default)
  - Trust policies restrict access to specific GitHub repos and branches
  - No secrets management required

- **Branch Configuration**: Default deployment branch is `main` (configurable via `allowedBranches` property)

### Technical Requirements
- **Lambda@Edge IAM**: Requires specific IAM role configuration with both `lambda.amazonaws.com` and `edgelambda.amazonaws.com` principals
- **Lambda@Edge Runtime**: Uses `determineLatestNodeRuntime(scope)` for automatic runtime version management
  - Automatically selects the latest supported Node.js runtime
  - CDK warnings about NODEJS_LATEST are acknowledged via `Annotations.acknowledgeWarning()`
  - This avoids manual maintenance of specific runtime versions
- **Lambda@Edge Versioning**: Uses `currentVersion` property for automatic version management with code hash changes
  - CloudFront automatically updates to new versions when Lambda code changes
  - No manual Version resources needed
- **Region Requirements**: All infrastructure must be deployed to us-east-1 (required for CloudFront/Lambda@Edge)
- **ACM Certificates**: CloudFront distributions require ACM certificates in us-east-1
- **S3 Configuration**: Buckets use CloudFront Origin Access Control (OAC) with S3 REST API endpoints
  - **DO NOT configure** S3 website hosting (`websiteIndexDocument`, `websiteErrorDocument`) - incompatible with OAC
  - Lambda@Edge handles index.html rewriting instead

### Cost Optimization
- S3 uses Intelligent-Tiering storage class automatically
- CloudFront PriceClass.PRICE_CLASS_100 (North America and Europe only)
- GitHub Actions free tier sufficient for most Hugo site builds

## Common Issues and Solutions

### CloudFront 403 Forbidden Error

If the site returns 403 errors after deployment:

1. **Check S3 bucket configuration**: Ensure website hosting is NOT enabled
   - S3 website hosting is incompatible with CloudFront OAC
   - Remove `websiteIndexDocument` and `websiteErrorDocument` properties

2. **Verify Lambda@Edge function**: Check the redirect function handles root path correctly
   - The regex must match `/` (root): use `/\/$/` not `.+/$`
   - Access `currentVersion` to ensure Lambda version is created

3. **Invalidate CloudFront cache**: Old 403 responses may be cached
   ```bash
   aws cloudfront create-invalidation --distribution-id <dist-id> --paths "/*"
   ```

4. **Check Lambda version**: Verify CloudFront uses the latest Lambda version
   - `currentVersion` only creates versions when accessed
   - Manual `Version` resources don't update with code changes

### Lambda@Edge Not Using Latest Code

If code changes don't appear after deployment:

1. Ensure using `currentVersion` instead of manual `Version` resources
2. The construct must extend `NodejsFunction` (not plain `Function`)
3. CloudFront requires a few minutes to propagate Lambda@Edge updates to edge locations
4. Invalidate CloudFront cache after Lambda updates

### Suppressing CDK Warnings

CDK warnings can be acknowledged at the app level in `src/main.ts`, which applies to all constructs:

```typescript
import { App, Annotations } from 'aws-cdk-lib';

const app = new App();

Annotations.of(app).acknowledgeWarning(
  '@aws-cdk/aws-lambda-nodejs:sdkV2NotInRuntime',
  'Explanation of why this warning can be safely ignored'
);
```

This project acknowledges warnings about NODEJS_LATEST usage at the app level, as we intentionally want automatic runtime updates without manual version maintenance.

**Note:** Context flags in `cdk.json` (like `@aws-cdk/aws-lambda-nodejs:sdkV2NotInRuntime: true`) are feature flags that control CDK behavior, not warning suppressions. Use `Annotations.acknowledgeWarning()` to suppress warning messages.
