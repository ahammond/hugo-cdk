# GitHub Actions Setup Guide

This guide explains how to configure GitHub Actions for deploying Hugo sites to AWS using the infrastructure created by this CDK application. An example workflow file (`deploy.yml.example`) is provided in this directory.

## Setup Instructions

### 1. Deploy the CDK Stack

First, deploy the infrastructure:

```bash
pnpm run build
pnpm run deploy
```

After deployment, note the outputs from CDK:
- `GitHubActionsRoleArn`
- `S3BucketName`
- `CloudFrontDistributionId`

### 2. Configure GitHub Repository

In your Hugo site repository (not this CDK repo), configure the following:

#### Repository Secrets

Go to Settings → Secrets and variables → Actions → New repository secret:

- `AWS_ROLE_ARN`: The IAM role ARN from CDK output (GitHubActionsRoleArn)
- `AWS_S3_BUCKET`: The S3 bucket name from CDK output
- `AWS_CLOUDFRONT_ID`: The CloudFront distribution ID from CDK output

#### Repository Variables (Optional)

Go to Settings → Secrets and variables → Actions → Variables:

- `AWS_REGION`: `us-east-1` (or your deployment region)

### 3. Copy Workflow to Hugo Repository

Copy `deploy.yml.example` to your Hugo repository:

```bash
# In your Hugo repository
mkdir -p .github/workflows
cp /path/to/hugo-cdk/docs/deploy.yml.example .github/workflows/deploy.yml
```

Edit the workflow file if needed (e.g., change branch names, Hugo version).

### 4. Push and Deploy

Push changes to the `main` branch:

```bash
git add .github/workflows/deploy.yml
git commit -m "Add GitHub Actions deployment workflow"
git push origin main
```

The workflow will:
1. Build your Hugo site
2. Authenticate to AWS using OIDC
3. Sync content to S3
4. Invalidate CloudFront cache

## Workflow Features

- **Free for public repos** (unlimited minutes)
- **2,000 free minutes/month** for private repos
- **No AWS credentials stored** in GitHub (uses OIDC)
- **Build logs visible** in GitHub PR checks
- **Automatic Hugo installation** (configurable version)
- **Submodule support** for Hugo themes
- **CloudFront cache invalidation** after deployment

## Troubleshooting

### "Error: Not authorized to perform sts:AssumeRoleWithWebIdentity"

The IAM role's trust policy restricts which GitHub repos can assume it. Check:
1. The `githubOrg` and `githubRepo` in your CDK configuration match your repository
2. The `allowedBranches` setting allows your branch name
3. The role exists (check CDK outputs)

### "Error: The specified bucket does not exist"

Ensure the `AWS_S3_BUCKET` secret matches the bucket name from CDK outputs.

### Hugo version mismatch

Update the `hugo-version` in the workflow to match your local Hugo version:

```yaml
- uses: peaceiris/actions-hugo@v3
  with:
    hugo-version: '0.139.3'  # Change this
```

## Security Notes

- Secrets are never exposed in logs
- OIDC tokens are short-lived (15 minutes by default)
- Role permissions are scoped to specific S3 bucket and CloudFront distribution
- Only specified GitHub repos and branches can assume the role
