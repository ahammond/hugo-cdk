import {
  CompositePrincipal,
  ManagedPolicy,
  Role,
  ServicePrincipal,
} from 'aws-cdk-lib/aws-iam';
import { Runtime, Version } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
// import { PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export class CloudfrontRedirect extends NodejsFunction {
  readonly functionVersion: Version;

  constructor(scope: Construct) {
    const role = new Role(scope, 'CloudfrontRedirectRole', {
      assumedBy: new CompositePrincipal(
        new ServicePrincipal('lambda.amazonaws.com'),
        new ServicePrincipal('edgelambda.amazonaws.com')
      ),
    });
    role.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName(
        'service-role/AWSLambdaBasicExecutionRole'
      )
    );

    super(scope, 'cloudfront-redirect', {
      bundling: {
        externalModules: [
          'aws-sdk', // Use the 'aws-sdk' available in the Lambda runtime
          '@types/aws-lambda',
        ],
      },
      role,
      runtime: Runtime.NODEJS_20_X,
    });

    this.functionVersion = new Version(scope, 'RedirectLambdaVersion', {
      lambda: this,
      description: 'Version for CloudFront redirect function',
    });

    // Grant the Lambda@Edge service principal permission to assume this role
    // this.grantPrincipal.addToPrincipalPolicy(
    //   new PolicyStatement({
    //     actions: ['sts:AssumeRole'],
    //     principals: [new ServicePrincipal('edgelambda.amazonaws.com')],
    //   })
    // );

    // Add the required Lambda@Edge permissions
    // this.addToRolePolicy(
    //   new PolicyStatement({
    //     actions: [
    //       'logs:CreateLogGroup',
    //       'logs:CreateLogStream',
    //       'logs:PutLogEvents',
    //     ],
    //     resources: ['arn:aws:logs:*:*:*'],
    //   })
    // );
  }
}
