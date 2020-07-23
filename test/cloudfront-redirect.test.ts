import { expect as expectCDK, haveResource } from '@aws-cdk/assert';
import cdk = require('@aws-cdk/core');
import CuT = require('../lib');

test('cloudfront-redirect basic functionality', () => {
  const app = new cdk.App();
  const stack = new cdk.Stack(app, 'TestStack');
  // WHEN
  new CuT.CloudfrontRedirect(stack, 'Test');
  // THEN
  expectCDK(stack).to(haveResource('AWS::IAM::Role'));
  expectCDK(stack).to(haveResource('AWS::Lambda::Function'));
  expectCDK(stack).to(haveResource('AWS::Lambda::Version'));
});
