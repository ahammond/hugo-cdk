import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { Distribution } from 'aws-cdk-lib/aws-cloudfront';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import * as CuT from '../src';

test('builder snapshot', () => {
  const app = new App();
  const stack = new Stack(app, 'TestStack');
  // WHEN
  new CuT.SiteBuilder(stack, 'Test', {
    githubOrg: 'testOrg',
    githubRepo: 'testRepo',
    production: {
      bucket: Bucket.fromBucketAttributes(stack, 'Bucket', {
        bucketName: 'test-bucket',
      }),
      distribution: Distribution.fromDistributionAttributes(
        stack,
        'Distribution',
        {
          distributionId: 'testDistributionId',
          domainName: 'testDomainName',
        }
      ),
    },
  });
  // THEN
  const template = Template.fromStack(stack);
  expect(template.toJSON()).toMatchSnapshot();
});
