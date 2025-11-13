#!/usr/bin/env node
import 'source-map-support/register';
import { App } from 'aws-cdk-lib';
import { HugoSiteStack } from '.';

const commonProps = {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT || '263869919117', // Use CDK_DEFAULT_ACCOUNT or set your AWS account ID
    region: 'us-east-1', // CloudFront distributions must be in us-east-1
  },
  githubOrg: process.env.GITHUB_ORG || 'ahammond',
  siteDomain: process.env.SITE_DOMAIN || 'agh1973.com',
};

const app = new App();

// Deploy Hugo sites with GitHub Actions OIDC authentication.
// Each site creates:
// - S3 bucket + CloudFront distribution
// - IAM role that GitHub Actions can assume
//
// After deploying, the GitHub repo needs a workflow (see .github/workflows/deploy.yml.example)
// that uses the role ARN output from this stack.

new HugoSiteStack(app, 'Blog', {
  ...commonProps,
  siteName: 'blog',
  allowedBranches: ['main'], // Restrict deployments to main branch
});

new HugoSiteStack(app, 'Food', {
  ...commonProps,
  siteName: 'food',
  allowedBranches: ['main'],
});
