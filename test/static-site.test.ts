import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as CuT from '../src';

test('static-site basic functionality', () => {
  const app = new App();
  const stack = new Stack(app, 'TestStack', {
    env: {
      account: '12341234234',
      region: 'us-east-1',
    },
  });
  // WHEN
  new CuT.StaticSite(stack, 'TestSite', {
    siteName: 'test-name',
    siteDomain: 'example.com',
  });
  // THEN
  const template = Template.fromStack(stack);

  template.resourceCountIs('AWS::S3::Bucket', 2);
  template.hasResourceProperties('AWS::CloudFront::Distribution', {});
  template.hasResourceProperties('AWS::Route53::RecordSet', {});
  template.hasResourceProperties('AWS::CloudFront::OriginAccessControl', {});
});
