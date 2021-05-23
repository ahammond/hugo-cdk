import { expect as expectCDK, haveResource } from '@aws-cdk/assert';
import { App, Stack } from 'aws-cdk-lib';
import * as CuT from '../src';

test('cloudfront-redirect basic functionality', () => {
  const app = new App();
  const stack = new Stack(app, 'TestStack');
  // WHEN
  new CuT.CloudfrontRedirect(stack, 'Test');
  // THEN
  expectCDK(stack).to(haveResource('AWS::IAM::Role'));
  expectCDK(stack).to(haveResource('AWS::Lambda::Function'));
  expectCDK(stack).to(haveResource('AWS::Lambda::Version'));
});
