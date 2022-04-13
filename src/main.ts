#!/usr/bin/env node
import 'source-map-support/register';
import { App } from 'aws-cdk-lib';
import { CloudfrontRedirectStack, HugoSiteStack } from '.';

const commonProps = {
  env: {
    account: '263869919117', // ahammond's AWS account ID. Use your own.
    region: 'us-east-1', // Not sure what other regions will support all this.
  },
};

const app = new App();

// Do not change this at all, even if you have multiple sites in the same account.
// We intentionally want to reuse this lambda for all of them...
// Unless you have billing concerns, but that's better solved by using separate AWS accounts.
const redirect = new CloudfrontRedirectStack(app, 'RedirectLambda', {
  ...commonProps,
  stackName: 'RedirectLambda', // Be super explicit with CDK about the name of this stack.
});

const siteProps = {
  ...commonProps,
  githubOrg: 'ahammond',
  redirectFn: redirect.version,
  siteDomain: 'agh1973.com',
};

// You can just add stanza after stanza to implement more sites.
new HugoSiteStack(app, 'Blog', {
  ...siteProps,
  siteName: 'blog',
});

new HugoSiteStack(app, 'Food', {
  ...siteProps,
  siteName: 'food',
});

new HugoSiteStack(app, 'Ferries', {
  ...siteProps,
  siteName: 'ferries',
});
