import client from '../api/client';
import { Asset } from '../types/todo';

export const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500 MB
export const MAX_ATTACHMENTS = 10;
export const ALLOWED_MIME_PREFIXES = ['image/', 'video/'];

export interface SignedURLResponse {
  upload_url: string;
  gcs_path: string;
}

export type MediaType = 'image' | 'video';

/**
 * Returns 'image' or 'video' based on MIME type, or null if unsupported.
 */
export function getMediaType(file: File): MediaType | null {
  if (file.type.startsWith('image/')) {
    return 'image';
  }
  if (file.type.startsWith('video/')) {
    return 'video';
  }
  return null;
}

/**
 * Extracts and cleans the file extension from filename or MIME type.
 */
export function getFileExtension(file: File): string {
  const parts = file.name.split('.');
  if (parts.length > 1) {
    const rawExt = parts[parts.length - 1].toLowerCase().replace(/[^a-z0-9]/g, '');
    if (rawExt) {
      return rawExt.slice(0, 10);
    }
  }

  // Fallback to MIME type inference
  if (file.type.includes('jpeg') || file.type.includes('jpg')) return 'jpg';
  if (file.type.includes('png')) return 'png';
  if (file.type.includes('gif')) return 'gif';
  if (file.type.includes('webp')) return 'webp';
  if (file.type.includes('mp4')) return 'mp4';
  if (file.type.includes('webm')) return 'webm';
  if (file.type.includes('quicktime')) return 'mov';
  return 'bin';
}

/**
 * Validates a file against allowed MIME types, size limit (500 MB), and total attachment count.
 * Returns null if valid, or an error string if invalid.
 */
export function validateFile(
  file: File,
  currentCount: number = 0,
  maxAllowed: number = MAX_ATTACHMENTS
): string | null {
  if (currentCount >= maxAllowed) {
    return `Maximum of ${maxAllowed} attachments allowed per task`;
  }

  if (file.size > MAX_FILE_SIZE) {
    return 'File size exceeds 500 MB limit';
  }

  const mediaType = getMediaType(file);
  if (!mediaType) {
    return 'Invalid file type: only image and video files are supported (unsupported type)';
  }

  return null;
}

/**
 * Step 1: Requests a signed PUT upload URL from the backend.
 */
export async function getSignedUrl(
  media_type: MediaType,
  file_extension: string
): Promise<SignedURLResponse> {
  return client.post<SignedURLResponse>('/assets/signed-url', {
    media_type,
    file_extension,
  });
}

/**
 * Step 2: Directly uploads the binary file to GCS via HTTPS PUT with progress notification.
 */
export async function uploadToGcs(
  uploadUrl: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<void> {
  onProgress?.(0);

  const response = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(
      `Upload to storage failed with status ${response.status}${
        errorText ? `: ${errorText}` : ''
      }`
    );
  }

  onProgress?.(100);
}

/**
 * Step 3: Confirms the upload with the backend to record asset metadata and obtain AssetResponse.
 */
export async function confirmUpload(gcs_path: string): Promise<Asset> {
  return client.post<Asset>('/assets/confirm', { gcs_path });
}

/**
 * Executes the complete direct-to-cloud upload pipeline:
 * 1) POST /assets/signed-url
 * 2) Direct PUT binary body to upload_url
 * 3) POST /assets/confirm
 */
export async function uploadFileDirectly(
  file: File,
  onProgress?: (percent: number) => void
): Promise<Asset> {
  const validationError = validateFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const mediaType = getMediaType(file)!;
  const fileExtension = getFileExtension(file);

  onProgress?.(10);
  const { upload_url, gcs_path } = await getSignedUrl(mediaType, fileExtension);

  onProgress?.(30);
  await uploadToGcs(upload_url, file, (percent) => {
    // Map 0-100% of PUT upload to 30-90% of total
    onProgress?.(30 + Math.round((percent / 100) * 60));
  });

  onProgress?.(90);
  const asset = await confirmUpload(gcs_path);
  onProgress?.(100);

  return asset;
}

export default uploadFileDirectly;
