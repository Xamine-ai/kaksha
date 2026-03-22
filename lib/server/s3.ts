import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';

const bucketName = process.env.APP_AWS_S3_BUCKET || process.env.AWS_S3_BUCKET || 'xamine2';
const region = process.env.APP_AWS_REGION || process.env.AWS_REGION || 'ap-south-1';

const s3Client = new S3Client({
  region,
  credentials: {
    accessKeyId: process.env.APP_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.APP_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

export async function uploadToS3(key: string, data: string | Buffer | Uint8Array, contentType = 'application/json') {
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: data,
    ContentType: contentType,
  });

  return s3Client.send(command);
}

export async function getFromS3(key: string) {
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  const response = await s3Client.send(command);
  return {
    body: response.Body,
    contentType: response.ContentType,
  };
}

export async function listFromS3(prefix?: string) {
  const command = new ListObjectsV2Command({
    Bucket: bucketName,
    Prefix: prefix,
  });

  const response = await s3Client.send(command);
  return response.Contents || [];
}

export async function deleteFromS3(key: string) {
  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  return s3Client.send(command);
}

export function getS3Url(key: string) {
  const cloudfrontDomain = process.env.APP_CLOUDFRONT_DOMAIN || process.env.CLOUDFRONT_DOMAIN || process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN;
  if (cloudfrontDomain) {
    return `https://${cloudfrontDomain}/${key}`;
  }
  return `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
}
