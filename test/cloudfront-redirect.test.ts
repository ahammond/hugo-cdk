import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as CuT from '../src';

test('cloudfront-redirect basic functionality', () => {
  const app = new App();
  const stack = new Stack(app, 'TestStack');
  // WHEN
  const redirect = new CuT.CloudfrontRedirect(stack);
  // Access currentVersion to force version creation
  redirect.currentVersion;
  // THEN
  const template = Template.fromStack(stack);

  const roles = template.findResources('AWS::IAM::Role', {
    Properties: {
      AssumeRolePolicyDocument: {
        Statement: [
          {
            Action: 'sts:AssumeRole',
            Effect: 'Allow',
            Principal: { Service: 'lambda.amazonaws.com' },
          },
          {
            Action: 'sts:AssumeRole',
            Effect: 'Allow',
            Principal: { Service: 'edgelambda.amazonaws.com' },
          },
        ],
        Version: '2012-10-17',
      },
      ManagedPolicyArns: [
        {
          'Fn::Join': [
            '',
            ['arn:', { Ref: 'AWS::Partition' }, ':iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'],
          ],
        },
      ],
    },
  });
  expect(roles).toBeDefined();
  const roleKeys = Object.keys(roles);
  expect(roleKeys.length).toEqual(1);
  const roleRef = roleKeys[0];

  const functions = template.findResources('AWS::Lambda::Function', {
    Properties: {
      Role: { 'Fn::GetAtt': [roleRef, 'Arn'] },
    },
  });
  expect(functions).toBeDefined();
  const functionKeys = Object.keys(functions);
  expect(functionKeys.length).toEqual(1);
  const functionRef = functionKeys[0];

  // Verify that currentVersion creates a Lambda version
  // (currentVersion creates versions with hashed IDs, so we just check one exists)
  const versions = template.findResources('AWS::Lambda::Version', {
    Properties: {
      FunctionName: { Ref: functionRef },
    },
  });
  expect(versions).toBeDefined();
  expect(Object.keys(versions).length).toBeGreaterThanOrEqual(1);
});
