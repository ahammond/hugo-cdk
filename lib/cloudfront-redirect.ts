import cdk = require('@aws-cdk/core');
import iam = require('@aws-cdk/aws-iam');
import lambda = require('@aws-cdk/aws-lambda');
import path = require('path');

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

    this.fn = new lambda.Function(this, 'RedirectLambda', {
      functionName: 'cloudfront-redirect',
      runtime: lambda.Runtime.NODEJS_12_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, 'lambdas', 'cloudfront-redirect')),
      role: role,
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
