import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export class CloudfrontRedirect extends NodejsFunction {
  constructor(scope: Construct) {
    super(scope, 'cloudfront-redirect', {
      bundling: {
        externalModules: [
          'aws-sdk', // Use the 'aws-sdk' available in the Lambda runtime
          '@types/aws-lambda',
        ],
      },
    });
    // Grant the Lambda@Edge service principal permission to assume this role
    this.grantPrincipal.addToPrincipalPolicy(
      new PolicyStatement({
        actions: ['sts:AssumeRole'],
        principals: [new ServicePrincipal('edgelambda.amazonaws.com')],
      })
    );

    // Add the required Lambda@Edge permissions
    this.addToRolePolicy(
      new PolicyStatement({
        actions: [
          'logs:CreateLogGroup',
          'logs:CreateLogStream',
          'logs:PutLogEvents',
        ],
        resources: ['arn:aws:logs:*:*:*'],
      })
    );
  }
}
