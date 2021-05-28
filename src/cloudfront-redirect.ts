import { aws_iam, aws_lambda, aws_lambda_nodejs, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class CloudfrontRedirect extends Construct {
  public readonly fn: aws_lambda.Function;
  public readonly version: aws_lambda.Version;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    const role = new aws_iam.Role(this, 'RedirectLambdaRole', {
      assumedBy: new aws_iam.ServicePrincipal('lambda.amazonaws.com'),
    });
    role.assumeRolePolicy?.addStatements(
      new aws_iam.PolicyStatement({
        effect: aws_iam.Effect.ALLOW,
        actions: ['sts:AssumeRole'],
        principals: [new aws_iam.ServicePrincipal('edgelambda.amazonaws.com')],
      }),
    );

    this.fn = new aws_lambda_nodejs.NodejsFunction(this, 'cloudfront-redirect', {
      role: role,
      bundling: {
        minify: true,
        externalModules: [
          'aws-sdk', // Use the 'aws-sdk' available in the Lambda runtime
          '@types/aws-lambda',
        ],
      },
    });

    this.version = new aws_lambda.Version(this, 'RedirectLambdaVersion', {
      lambda: this.fn,
    });
  }
}

export class CloudfrontRedirectStack extends Stack {
  public readonly fn: aws_lambda.Function;
  public readonly version: aws_lambda.Version;

  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    const c = new CloudfrontRedirect(this, 'RedirectLambdaApplication');
    this.fn = c.fn;
    this.version = c.version;
  }
}
