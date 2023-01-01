import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  aws_certificatemanager,
  aws_cloudfront,
  aws_cloudfront_origins,
  aws_iam,
  aws_route53, aws_route53_targets,
  aws_s3,
  RemovalPolicy
} from "aws-cdk-lib";

export interface ApplicationConstructProps {
    readonly removalPolicy: RemovalPolicy;
    readonly domain: string;
}

export class ApplicationConstruct extends Construct {
  constructor(scope: Construct, id: string, props: ApplicationConstructProps) {
    super(scope, id);

    // DNS
    const hostedZone = aws_route53.HostedZone.fromLookup(this, "hostedZone", {
        domainName: props.domain
    });

    // TLS
    const certificate = new aws_certificatemanager.Certificate(this, "certificate", {
      domainName: props.domain,
      validation: cdk.aws_certificatemanager.CertificateValidation.fromDns(hostedZone)
    });

    // Origin storage
    const bucket = new aws_s3.Bucket(this, "staticContent", {
      encryption: cdk.aws_s3.BucketEncryption.S3_MANAGED,
      removalPolicy: props.removalPolicy,
      autoDeleteObjects: true,
      blockPublicAccess: cdk.aws_s3.BlockPublicAccess.BLOCK_ALL
    });

    // CDN
    const originAccessIdentity = new aws_cloudfront.OriginAccessIdentity(this, "originAccessIdentity");
    bucket.addToResourcePolicy(new aws_iam.PolicyStatement({
      actions: ['s3:GetObject'],
      resources: [bucket.arnForObjects('*')],
      principals: [new aws_iam.CanonicalUserPrincipal(originAccessIdentity.cloudFrontOriginAccessIdentityS3CanonicalUserId)]
    }));
    const distribution = new aws_cloudfront.Distribution(this, "distribution", {
      defaultBehavior: {
        origin: new aws_cloudfront_origins.S3Origin(bucket, {
          originAccessIdentity: originAccessIdentity
        }),
        compress: true,
        allowedMethods: cdk.aws_cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        viewerProtocolPolicy: cdk.aws_cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS
      },
      domainNames: [props.domain],
      certificate: certificate,
      defaultRootObject: "index.html"
    });
    const aRecord = new aws_route53.ARecord(this, "aRecord", {
      zone: hostedZone,
      recordName: props.domain,
      target: aws_route53.RecordTarget.fromAlias(new aws_route53_targets.CloudFrontTarget(distribution))
    });
    const aaaaRecord = new aws_route53.AaaaRecord(this, "aaaaRecord", {
      zone: hostedZone,
      recordName: props.domain,
      target: cdk.aws_route53.RecordTarget.fromAlias(new aws_route53_targets.CloudFrontTarget(distribution))
    });
  }
}