import cdk = require('@aws-cdk/core');
import iam = require('@aws-cdk/aws-iam');
import lambda = require('@aws-cdk/aws-lambda');
import lambdaNodejs = require('@aws-cdk/aws-lambda-nodejs');

export class CloudfrontRedirect extends cdk.Construct {
  public readonly fn: lambda.Function;
  public readonly version: lambda.Version;

  constructor(scope: cdk.Construct, id: string) {
    super(scope, id);

    const role = new iam.Role(this, 'RedirectLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    });
    role.assumeRolePolicy?.addStatements(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['sts:AssumeRole'],
        principals: [new iam.ServicePrincipal('edgelambda.amazonaws.com')],
      }),
    );

    this.fn = new lambdaNodejs.NodejsFunction(this, 'cloudfront-redirect', {
      runtime: lambda.Runtime.NODEJS_12_X, // Default would work, but let's go with latest greatest.
      role: role,
      bundling: {
        minify: true,
        externalModules: [
          'aws-sdk', // Use the 'aws-sdk' available in the Lambda runtime
          '@types/aws-lambda',
        ],
      }
    });
    new cdk.CfnOutput(this, 'TheRedirectLambda', { value: this.fn.functionArn });

    this.version = new lambda.Version(this, 'RedirectLambdaVersion', {
      lambda: this.fn,
    });
  }
}

export class CloudfrontRedirectStack extends cdk.Stack {
  public readonly fn: lambda.Function;
  public readonly version: lambda.Version;

  constructor(scope: cdk.Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props);

    const c = new CloudfrontRedirect(this, 'RedirectLambdaApplication');
    this.fn = c.fn;
    this.version = c.version;
  }
}
