'use server';

import { proxyFetch } from '@/lib/server/proxy-fetch';

const XAMINE_BASE_URL = 'https://api.xamine.ai/';

class XamineApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'XamineApiError';
  }
}

async function fetchXamineGet<T>(endpoint: string, adminToken?: boolean): Promise<T> {
  let token = '';
  if (adminToken) {
    token = process.env.XAMINE_ADMIN_TOKEN || '';
  } else {
    token = process.env.XAMINE_STUDENT_TOKEN || '';
  }

  if (!token) {
    throw new Error(`Missing ${adminToken ? 'XAMINE_ADMIN_TOKEN' : 'XAMINE_STUDENT_TOKEN'} environment variable`);
  }

  const url = `${XAMINE_BASE_URL}${endpoint.replace(/^\//, '')}`;
  console.log(`[Xamine API] Executing GET request securely on server: ${url}`);
  
  const response = await proxyFetch(url, {
    method: 'GET',
    headers: {
      'Token': token,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new XamineApiError(response.status, `Xamine API Error: ${response.statusText}`);
  }

  return response.json();
}

export async function getStudentOverallPerformance() {
  return fetchXamineGet<any>('getStudentOverallPerformance');
}

export async function getConceptMastery() {
  return fetchXamineGet<any>('getConceptMastery');
}

export async function getStudentSyllabus() {
  return fetchXamineGet<any>('getStudentSyllabus');
}

export async function getNewStudentToken(studentId: string) {
  return fetchXamineGet<any>(`getNewStudentToken?studentId=${encodeURIComponent(studentId)}`, true);
}
