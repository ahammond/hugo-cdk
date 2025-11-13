#!/usr/bin/env node
import 'source-map-support/register';
import { App, Stack } from 'aws-cdk-lib';
import { HugoSiteStack, GitHubOIDCBootstrapStack } from '.';
import { PipelineApp } from './app';

const commonProps = {
  githubOrg: process.env.GITHUB_ORG || 'ahammond',
  siteDomain: process.env.SITE_DOMAIN || 'agh1973.com',
};

const account = process.env.CDK_DEFAULT_ACCOUNT || '263869919117';
const region = 'us-east-1'; // CloudFront requires us-east-1

// Bootstrap stack - deploy this separately with: DEPLOY_STAGE=bootstrap cdk deploy GitHubOIDCBootstrap
// This creates the GitHub OIDC provider and IAM role needed for GitHub Actions
if (process.env.DEPLOY_STAGE === 'bootstrap') {
  const app = new App();

  new GitHubOIDCBootstrapStack(app, 'GitHubOIDCBootstrap', {
    env: { account, region },
    githubOrg: 'ahammond',
    githubRepo: 'hugo-cdk',
    allowedBranches: 'ref:refs/heads/main', // Only allow main branch to deploy
  });

  app.synth();
} else {
  // Standard PipelineApp pattern for Hugo site stacks
  const app = new PipelineApp({
    // Personal stage for local testing
    // Usage: pnpm run deploy:personal
    providePersonalStack: (scope, id, props) => {
      const parentStack = new Stack(scope, id, props);

      new HugoSiteStack(parentStack, 'Blog', {
        ...props,
        ...commonProps,
        siteName: 'blog',
        allowedBranches: ['main'],
      });

      new HugoSiteStack(parentStack, 'Food', {
        ...props,
        ...commonProps,
        siteName: 'food',
        allowedBranches: ['main'],
      });

      return parentStack;
    },

    // Production stage deployed by GitHub Actions
    // Stacks: HugoCDK-prod-Blog, HugoCDK-prod-Food
    provideProdStack: (scope, id, props) => {
      const parentStack = new Stack(scope, id, props);

      new HugoSiteStack(parentStack, 'Blog', {
        ...props,
        ...commonProps,
        siteName: 'blog',
        allowedBranches: ['main'],
      });

      new HugoSiteStack(parentStack, 'Food', {
        ...props,
        ...commonProps,
        siteName: 'food',
        allowedBranches: ['main'],
      });

      return parentStack;
    },
  });

  app.synth();
}
