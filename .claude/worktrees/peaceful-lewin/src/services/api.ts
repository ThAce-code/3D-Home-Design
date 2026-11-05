import type { Asset } from '../types/furniture.js';

export interface Category {
  id: number;
  name: string;
  slug: string;
}

const BASE = '/api';

export async function fetchCategories(): Promise<Category[]> {
  const res = await fetch(`${BASE}/categories`);
  if (!res.ok) throw new Error(`Failed to fetch categories: ${res.status}`);
  return res.json();
}

export async function fetchAssets(category?: string): Promise<Asset[]> {
  const url = category
    ? `${BASE}/assets?category=${encodeURIComponent(category)}`
    : `${BASE}/assets`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch assets: ${res.status}`);
  return res.json();
}

export async function uploadAsset(
  file: File,
  name: string,
  categorySlug: string,
): Promise<Asset> {
  const form = new FormData();
  // name 和 categorySlug 必须在 file 之前，否则 @fastify/multipart 的
  // request.file() 读不到 file 之后的字段
  form.append('name', name);
  form.append('categorySlug', categorySlug);
  form.append('file', file);

  const res = await fetch(`${BASE}/assets`, { method: 'POST', body: form });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(err.error || `Upload failed: ${res.status}`);
  }
  return res.json();
}

export async function deleteAsset(id: string): Promise<void> {
  const res = await fetch(`${BASE}/assets/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Failed to delete asset: ${res.status}`);
}

export async function updateAsset(
  id: string,
  patch: { name?: string; categorySlug?: string },
): Promise<Asset> {
  const res = await fetch(`${BASE}/assets/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`Failed to update asset: ${res.status}`);
  return res.json();
}
