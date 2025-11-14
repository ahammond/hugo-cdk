import { Annotations } from 'aws-cdk-lib';
import { CompositePrincipal, ManagedPolicy, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { determineLatestNodeRuntime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';

export class CloudfrontRedirect extends NodejsFunction {
  constructor(scope: Construct) {
    const role = new Role(scope, 'CloudfrontRedirectRole', {
      assumedBy: new CompositePrincipal(
        new ServicePrincipal('lambda.amazonaws.com'),
        new ServicePrincipal('edgelambda.amazonaws.com'),
      ),
    });
    role.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'));

    super(scope, 'cloudfront-redirect', {
      bundling: {
        externalModules: [
          'aws-sdk', // Use the 'aws-sdk' available in the Lambda runtime
          '@types/aws-lambda',
        ],
      },
      role,
      runtime: determineLatestNodeRuntime(scope),
    });
  }
}
