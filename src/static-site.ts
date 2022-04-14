import {
  aws_certificatemanager,
  aws_cloudfront,
  aws_cloudfront_origins,
  aws_iam,
  aws_lambda,
  aws_s3,
  aws_route53,
  aws_route53_targets,
  Duration,
  RemovalPolicy,
  Stack,
  StackProps,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';

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
  readonly redirectFn: aws_lambda.IVersion;
}

export interface IStaticSite {
  readonly bucket: aws_s3.IBucket;
  readonly distribution: aws_cloudfront.IDistribution;
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
export class StaticSite extends Construct implements IStaticSite {
  public readonly bucket: aws_s3.Bucket;
  public readonly distribution: aws_cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: StaticSiteProps) {
    super(scope, id);

    const fqdn = `${props.siteName}.${props.siteDomain}`;
    const zone = aws_route53.HostedZone.fromLookup(this, 'Zone', { domainName: props.siteDomain });

    const certificate = new aws_certificatemanager.DnsValidatedCertificate(this, 'Certificate', {
      domainName: fqdn,
      hostedZone: zone,
    });

    const logBucket = new aws_s3.Bucket(this, 'LogBucket', {
      bucketName: `${fqdn}-logs`,
      encryption: aws_s3.BucketEncryption.S3_MANAGED,
      removalPolicy: RemovalPolicy.DESTROY,
      accessControl: aws_s3.BucketAccessControl.PRIVATE,
      lifecycleRules: [
        {
          expiration: Duration.days(10), // Do you really want to keep logs for longer than 10 days?
        },
      ],
    });

    // Provide an identity for CloudFront to use to access the S3 bucket.
    const originAccessIdentity = new aws_cloudfront.OriginAccessIdentity(this, 'OriginAccessIdentity', {
      comment: `OAI for ${fqdn}`,
    });

    this.bucket = new aws_s3.Bucket(this, 'Bucket', {
      bucketName: fqdn,
      encryption: aws_s3.BucketEncryption.S3_MANAGED, // https://aws.amazon.com/premiumsupport/knowledge-center/s3-website-cloudfront-error-403/
      removalPolicy: RemovalPolicy.DESTROY,
      accessControl: aws_s3.BucketAccessControl.PRIVATE,
      blockPublicAccess: aws_s3.BlockPublicAccess.BLOCK_ALL,
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: '404.html',
    });

    // Grant the CloudFront OAI access to the bucket.
    this.bucket.addToResourcePolicy(
      new aws_iam.PolicyStatement({
        actions: ['s3:GetBucket*', 's3:GetObject*', 's3:List*'],
        resources: [this.bucket.bucketArn, `${this.bucket.bucketArn}/*`],
        principals: [
          new aws_iam.CanonicalUserPrincipal(originAccessIdentity.cloudFrontOriginAccessIdentityS3CanonicalUserId),
        ],
      }),
    );

    this.distribution = new aws_cloudfront.Distribution(this, 'Distribution', {
      certificate,
      defaultBehavior: {
        origin: new aws_cloudfront_origins.S3Origin(this.bucket, {
          originAccessIdentity,
        }),
        edgeLambdas: [
          {
            functionVersion: props.redirectFn,
            eventType: aws_cloudfront.LambdaEdgeEventType.ORIGIN_REQUEST,
          },
        ],
        viewerProtocolPolicy: aws_cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      domainNames: [fqdn],
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/404.html',
        },
      ],
      logBucket,
      priceClass: aws_cloudfront.PriceClass.PRICE_CLASS_100,
    });

    // Route53 alias record for the CloudFront distribution
    new aws_route53.ARecord(this, 'SiteAlias', {
      target: aws_route53.RecordTarget.fromAlias(new aws_route53_targets.CloudFrontTarget(this.distribution)),
      zone: zone,
      recordName: fqdn,
    });
  }
}

export interface StaticSiteStackProps extends StaticSiteProps, StackProps {}

export class StaticSiteStack extends Stack implements IStaticSite {
  public readonly bucket: aws_s3.Bucket;
  public readonly distribution: aws_cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: StaticSiteStackProps) {
    super(scope, id, props);

    const s = new StaticSite(this, id, props);
    this.bucket = s.bucket;
    this.distribution = s.distribution;
  }
}
