import { expect as expectCDK, haveResource, countResources } from '@aws-cdk/assert';
import cdk = require('@aws-cdk/core');
import CuT = require('../lib');

test('static-site basic functionality', () => {
  const app = new cdk.App();
  const stack = new cdk.Stack(app, 'TestStack');
  const fn = new CuT.CloudfrontRedirect(app, 'lambda');
  // WHEN
  new CuT.StaticSite(stack, 'TestSite', {
    siteName: 'test-name',
    siteDomain: 'example.com',
    redirectFn: fn.version,
  });
  // THEN
  expectCDK(stack).to(countResources('AWS::S3::Bucket', 2));
  expectCDK(stack).to(haveResource('AWS::CloudFront::CloudFrontOriginAccessIdentity'));
  expectCDK(stack).to(haveResource('AWS::CloudFront::Distribution'));
  expectCDK(stack).to(haveResource('AWS::Route53::RecordSet'));
});
