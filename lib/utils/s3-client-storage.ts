/**
 * S3 Client Storage
 * 
 * Handles client-side interactions with the S3-backed API routes.
 */

import { StageStoreData, StageListItem } from './stage-storage';

export async function uploadStageToS3(id: string, data: StageStoreData) {
  const response = await fetch('/api/s3/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, data }),
  });

  if (!response.ok) {
    throw new Error(`S3 upload failed: ${response.statusText}`);
  }

  return response.json();
}

export async function listStagesFromS3(): Promise<StageListItem[]> {
  const response = await fetch('/api/s3/list');
  if (!response.ok) {
    throw new Error(`S3 list failed: ${response.statusText}`);
  }
  const data = await response.json();
  return data.projects || [];
}

export async function getStageFromS3(id: string): Promise<StageStoreData | null> {
  // We can fetch directly from S3 URL if public, or use an API route
  // For now, let's use the API route via the list or directly if we have a get route
  const response = await fetch(`/api/s3/get?id=${id}`);
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`S3 get failed: ${response.statusText}`);
  }
  const data = await response.json();
  return data.project;
}
