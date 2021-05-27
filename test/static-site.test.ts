import { expect as expectCDK, haveResource, countResources } from '@aws-cdk/assert';
import { App, Stack } from 'aws-cdk-lib';
import * as CuT from '../src';

test('static-site basic functionality', () => {
  const app = new App();
  const stack = new Stack(app, 'TestStack', {
    env: {
      account: '12341234234',
      region: 'us-east-1',
    },
  });
  const fn = new CuT.CloudfrontRedirect(stack, 'lambda');
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
