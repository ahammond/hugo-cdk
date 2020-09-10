import cdk = require('@aws-cdk/core');
import route53 = require('@aws-cdk/aws-route53');
import acm = require('@aws-cdk/aws-certificatemanager');
import cloudfront = require('@aws-cdk/aws-cloudfront');
import iam = require('@aws-cdk/aws-iam');
import lambda = require('@aws-cdk/aws-lambda');
import s3 = require('@aws-cdk/aws-s3');
import targets = require('@aws-cdk/aws-route53-targets');

export interface StaticSiteProps {
  /**
   * The name of your site: "myblog".mydomain.com
   *
   * Obviously this needs to be lower case and no special characters.
   * See RFC-1034 and RFC-1035 for details.
   */
  readonly siteName: string;
  /**
   * The domain of your blog: mydomain.com
   * This domain name MUST be part of a zone managed by AWS Route53.
   * It's easiest to just use AWS as your registrar,
   * but either way the zone has to be in AWS Route53 for it to work.
   */
  readonly siteDomain: string;
  /**
   * The standard-redirects-for-cloudfront lambda
   */
  readonly redirectFn: lambda.IVersion;
}

export interface IStaticSite {
  readonly bucket: s3.IBucket;
  readonly distribution: cloudfront.CloudFrontWebDistribution;
}

/**
 * Generate a static website distribution in AWS.
 * Includes:
 * - S3 bucket to host content
 * - ACM certificate for https (dns validated)
 * - CloudFront CDN for secure delivery of content
 * - OAI for secure access to the S3 bucket
 * - basic XSS protections
 * - DNS management for the CloudFront domain
 */
export class StaticSite extends cdk.Construct implements IStaticSite {
  public readonly bucket: s3.Bucket;
  public readonly distribution: cloudfront.CloudFrontWebDistribution;

  constructor(scope: cdk.Construct, id: string, props: StaticSiteProps) {
    super(scope, id);

    const fqdn = `${props.siteName}.${props.siteDomain}`;
    const zone = route53.HostedZone.fromLookup(this, 'Zone', { domainName: props.siteDomain });

    const certificate = new acm.DnsValidatedCertificate(this, 'Certificate', {
      domainName: fqdn,
      hostedZone: zone,
    });
    new cdk.CfnOutput(this, 'TheCertificate', { value: certificate.certificateArn });

    const logBucket = new s3.Bucket(this, 'LogBucket', {
      bucketName: `${fqdn}-logs`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      accessControl: s3.BucketAccessControl.PRIVATE,
      lifecycleRules: [
        {
          expiration: cdk.Duration.days(10), // Do you really want to keep logs for longer than 10 days?
        },
      ],
    });
    new cdk.CfnOutput(this, 'TheLogBucket', { value: logBucket.bucketArn });

    // Provide an identity for CloudFront to use to access the S3 bucket.
    const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'OriginAccessIdentity', {
      comment: `OAI for ${fqdn}`,
    });

    this.bucket = new s3.Bucket(this, 'Bucket', {
      bucketName: fqdn,
      encryption: s3.BucketEncryption.S3_MANAGED, // https://aws.amazon.com/premiumsupport/knowledge-center/s3-website-cloudfront-error-403/
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      accessControl: s3.BucketAccessControl.PRIVATE,
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: '404.html',
    });
    new cdk.CfnOutput(this, 'TheBucket', { value: this.bucket.bucketArn });

    // Grant the CloudFront OAI access to the bucket.
    this.bucket.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ['s3:GetBucket*', 's3:GetObject*', 's3:List*'],
        resources: [this.bucket.bucketArn, `${this.bucket.bucketArn}/*`],
        principals: [
          new iam.CanonicalUserPrincipal(originAccessIdentity.cloudFrontOriginAccessIdentityS3CanonicalUserId),
        ],
      }),
    );

    this.distribution = new cloudfront.CloudFrontWebDistribution(this, 'Distribution', {
      aliasConfiguration: {
        acmCertRef: certificate.certificateArn,
        names: [fqdn],
        sslMethod: cloudfront.SSLMethod.SNI,
        securityPolicy: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2018,
      },
      originConfigs: [
        {
          s3OriginSource: {
            s3BucketSource: this.bucket,
            originAccessIdentity: originAccessIdentity,
          },
          behaviors: [
            {
              lambdaFunctionAssociations: [
                {
                  lambdaFunction: props.redirectFn,
                  eventType: cloudfront.LambdaEdgeEventType.ORIGIN_REQUEST,
                },
              ],
              isDefaultBehavior: true,
            },
          ],
          originHeaders: {
            'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
            'X-Frame-Options': 'SAMEORIGIN',
            // 'X-XSS-Protection': `1; report=https://csp.${props.siteDomain}/v0/report`,
            'X-XSS-Protection': '1',
          },
        },
      ],
      errorConfigurations: [
        {
          errorCode: 404,
          responseCode: 200,
          responsePagePath: '/404.html',
        },
      ],
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100, // You can go global if you want, but this is fine for North America.
      loggingConfig: {
        bucket: logBucket,
      },
    });
    new cdk.CfnOutput(this, 'TheDistribution', { value: this.distribution.distributionId });

    // Route53 alias record for the CloudFront distribution
    new route53.ARecord(this, 'SiteAlias', {
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(this.distribution)),
      zone: zone,
      recordName: fqdn,
    });
  }
}

export interface StaticSiteStackProps extends StaticSiteProps, cdk.StackProps {}

export class StaticSiteStack extends cdk.Stack implements IStaticSite {
  public readonly bucket: s3.Bucket;
  public readonly distribution: cloudfront.CloudFrontWebDistribution;

  constructor(scope: cdk.Construct, id: string, props: StaticSiteStackProps) {
    super(scope, id, props);

    const s = new StaticSite(this, id, props);
    this.bucket = s.bucket;
    this.distribution = s.distribution;
  }
}
