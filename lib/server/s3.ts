import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';
import 'server-only';

function getS3Client() {
  const region = process.env.APP_AWS_REGION || process.env.AWS_REGION || 'ap-south-1';
  return new S3Client({
    region,
    credentials: {
      accessKeyId: process.env.APP_AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.APP_AWS_SECRET_ACCESS_KEY || '',
    },
  });
}

function getBucketName() {
  return process.env.APP_AWS_S3_BUCKET || 'xamine2';
}

export async function uploadToS3(key: string, data: string | Buffer | Uint8Array, contentType = 'application/json') {
  const command = new PutObjectCommand({
    Bucket: getBucketName(),
    Key: key,
    Body: data,
    ContentType: contentType,
  });
  return getS3Client().send(command);
}

export async function getFromS3(key: string) {
  const command = new GetObjectCommand({
    Bucket: getBucketName(),
    Key: key,
  });
  const response = await getS3Client().send(command);
  return {
    body: response.Body,
    contentType: response.ContentType,
  };
}

export async function listFromS3(prefix?: string) {
  const command = new ListObjectsV2Command({
    Bucket: getBucketName(),
    Prefix: prefix,
  });
  const response = await getS3Client().send(command);
  return response.Contents || [];
}

export async function deleteFromS3(key: string) {
  const command = new DeleteObjectCommand({
    Bucket: getBucketName(),
    Key: key,
  });
  return getS3Client().send(command);
}

export function getS3Url(key: string) {
  const cloudfrontDomain =
    process.env.APP_AWS_CLOUDFRONT_DOMAIN ||
    process.env.APP_CLOUDFRONT_DOMAIN ||
    process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN;
  const bucket = getBucketName();
  const region = process.env.APP_AWS_REGION || 'ap-south-1';
  if (cloudfrontDomain) {
    return `https://${cloudfrontDomain}/${key}`;
  }
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}