#!/usr/bin/env node
import 'source-map-support/register';
import cdk = require('@aws-cdk/core');
import lib = require('../lib');

const commonProps = {
  env: {
    account: '263869919117', // ahammond's AWS account ID. Use your own.
    region: 'us-east-1', // Not sure what other regions will support all this.
  },
};

const app = new cdk.App();

// Do not change this at all, even if you have multiple sites in the same account.
// We intentionally want to reuse this lambda for all of them...
// Unless you have billing concerns, but that's better solved by using separate AWS accounts.
const redirect = new lib.CloudfrontRedirectStack(app, 'RedirectLambda', {
  ...commonProps,
  stackName: 'RedirectLambda', // Be super explicit with CDK about the name of this stack.
});

const siteProps = {
  ...commonProps,
  githubOrg: 'ahammond',
  redirectFn: redirect.version,
  siteDomain: 'agh1973.com',
}

// You can just add stanza after stanza to implement more sites.
new lib.HugoSiteStack(app, 'Blog', {
  ...siteProps,
  siteName: 'blog',
});

new lib.HugoSiteStack(app, 'Food', {
  ...siteProps,
  siteName: 'food',
});
