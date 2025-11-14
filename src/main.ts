#!/usr/bin/env node
import 'source-map-support/register';
import { App, Stack } from 'aws-cdk-lib';
import { HugoSiteStack, GitHubOIDCBootstrapStack } from '.';
import { loadSitesConfig } from './sites-config';

const account = process.env.CDK_DEFAULT_ACCOUNT || '263869919117';
const region = 'us-east-1'; // CloudFront requires us-east-1

const app = new App();

// Bootstrap stack - deploy this separately with: DEPLOY_STAGE=bootstrap cdk deploy GitHubOIDCBootstrap
// This creates the GitHub OIDC provider and IAM role needed for GitHub Actions
if (process.env.DEPLOY_STAGE === 'bootstrap') {
  new GitHubOIDCBootstrapStack(app, 'GitHubOIDCBootstrap', {
    env: { account, region },
    githubOrg: 'ahammond',
    githubRepo: 'hugo-cdk',
    allowedBranches: 'ref:refs/heads/main', // Only allow main branch to deploy
  });
} else {
  // Load site configurations from config/sites.json
  const sitesConfig = loadSitesConfig();

  // Production Hugo site stacks
  // Deploys nested stacks dynamically based on config/sites.json
  const parentStack = new Stack(app, 'HugoCDK-prod', {
    env: { account, region },
    stackName: 'HugoCDK-prod',
  });

  // Create a stack for each site in the configuration
  sitesConfig.sites.forEach((site) => {
    // Extract subdomain from full domain (e.g., "blog" from "blog.agh1973.com")
    const siteName = site.domain.split('.')[0];

    new HugoSiteStack(parentStack, site.name, {
      env: { account, region },
      githubOrg: site.githubOrg,
      siteDomain: site.domain.split('.').slice(1).join('.'), // Base domain
      siteName,
      allowedBranches: site.allowedBranches || ['main'],
    });
  });
}

app.synth();
