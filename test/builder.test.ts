import { App, aws_cloudfront, aws_s3, Stack } from 'aws-cdk-lib';
import * as CuT from '../src';

test('builder snapshot', () => {
  const app = new App();
  const stack = new Stack(app, 'TestStack');
  // WHEN
  new CuT.SiteBuilder(stack, 'Test', {
    githubOrg: 'testOrg',
    githubRepo: 'testRepo',
    production: {
      bucket: aws_s3.Bucket.fromBucketAttributes(stack, 'Bucket', {
        bucketName: 'testBucket',
      }),
      distribution: aws_cloudfront.Distribution.fromDistributionAttributes(stack, 'Distribution', {
        distributionId: 'testDistributionId',
        domainName: 'testDomainName',
      }),
    },
  });
  // THEN
  expect(app.synth().getStackArtifact(stack.artifactId).template).toMatchSnapshot();
});
