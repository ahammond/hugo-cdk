import { Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { Certificate, CertificateValidation } from 'aws-cdk-lib/aws-certificatemanager';
import { Distribution, IDistribution, LambdaEdgeEventType, PriceClass } from 'aws-cdk-lib/aws-cloudfront';
import { S3BucketOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { ARecord, HostedZone, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { CloudFrontTarget } from 'aws-cdk-lib/aws-route53-targets';
import { Bucket, BucketAccessControl, BucketEncryption, IBucket, ObjectOwnership } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

import { CloudfrontRedirect } from './cloudfront-redirect';

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
}

export interface IStaticSite {
  readonly bucket: IBucket;
  readonly distribution: IDistribution;
}

/**
 * Generate a static website distribution in AWS.
 * Includes:
 * - A lambda for managing rewrites to canonicalize index.html.
 * - S3 bucket to host content
 * - ACM certificate for https (dns validated)
 * - CloudFront CDN for secure delivery of content
 * - OAI for secure access to the S3 bucket
 * - basic XSS protections
 * - DNS management for the CloudFront domain
 */
export class StaticSite extends Construct implements IStaticSite {
  public readonly bucket: Bucket;
  public readonly distribution: Distribution;

  constructor(scope: Construct, id: string, props: StaticSiteProps) {
    super(scope, id);

    const lambda = new CloudfrontRedirect(this);

    const fqdn = `${props.siteName}.${props.siteDomain}`;
    const zone = HostedZone.fromLookup(this, 'Zone', {
      domainName: props.siteDomain,
    });

    const certificate = new Certificate(this, 'Certificate', {
      domainName: fqdn,
      validation: CertificateValidation.fromDns(zone),
    });

    const logBucket = new Bucket(this, 'LogBucket', {
      bucketName: `${fqdn}-logs`,
      encryption: BucketEncryption.S3_MANAGED,
      removalPolicy: RemovalPolicy.DESTROY,
      objectOwnership: ObjectOwnership.OBJECT_WRITER,
      lifecycleRules: [
        {
          expiration: Duration.days(10), // Do you really want to keep logs for longer than 10 days?
        },
      ],
    });

    this.bucket = new Bucket(this, 'Bucket', {
      bucketName: fqdn,
      encryption: BucketEncryption.S3_MANAGED,
      removalPolicy: RemovalPolicy.DESTROY,
      accessControl: BucketAccessControl.PRIVATE,
    });

    // Grant the CloudFront OAI access to the bucket.
    // this.bucket.addToResourcePolicy(
    //   new PolicyStatement({
    //     actions: ['s3:GetBucket*', 's3:GetObject*', 's3:List*'],
    //     resources: [this.bucket.bucketArn, `${this.bucket.bucketArn}/*`],
    //     principals: [
    //       new CanonicalUserPrincipal(
    //         originAccessIdentity.cloudFrontOriginAccessIdentityS3CanonicalUserId
    //       ),
    //     ],
    //   })
    // );

    this.distribution = new Distribution(this, 'Distribution', {
      certificate,
      defaultBehavior: {
        origin: S3BucketOrigin.withOriginAccessControl(this.bucket, {}),
        edgeLambdas: [
          {
            functionVersion: lambda.functionVersion,
            eventType: LambdaEdgeEventType.ORIGIN_REQUEST,
          },
        ],
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
      priceClass: PriceClass.PRICE_CLASS_100,
    });

    // Route53 alias record for the CloudFront distribution
    new ARecord(this, 'SiteAlias', {
      target: RecordTarget.fromAlias(new CloudFrontTarget(this.distribution)),
      zone: zone,
      recordName: fqdn,
    });
  }
}

export interface StaticSiteStackProps extends StaticSiteProps, StackProps {}

export class StaticSiteStack extends Stack implements IStaticSite {
  public readonly bucket: Bucket;
  public readonly distribution: Distribution;

  constructor(scope: Construct, id: string, props: StaticSiteStackProps) {
    super(scope, id, props);

    const s = new StaticSite(this, id, props);
    this.bucket = s.bucket;
    this.distribution = s.distribution;
  }
}
