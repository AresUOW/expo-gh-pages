import { getDownloadURL, ref, uploadString } from 'firebase/storage';
import { storage } from './firebase';
import { requireUser } from './authService';
import type { ImageInput, ServiceResult } from '../types/models';
import { failure } from '../utils/serviceResult';

interface PreparedImage { dataUrl: string }

function readDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Unable to read the photo.'));
    reader.onabort = () => reject(new Error('Photo reading was cancelled.'));
    reader.onload = () => typeof reader.result === 'string'
      ? resolve(reader.result) : reject(new Error('Unable to read the photo.'));
    // React Native supports readAsDataURL; avoid relying on Blob.arrayBuffer().
    reader.readAsDataURL(blob);
  });
}
function validateSignature(dataUrl: string, contentType: ImageInput['contentType']): void {
  const comma = dataUrl.indexOf(',');
  if (comma < 0 || !dataUrl.slice(0, comma).endsWith(';base64')) throw new Error('Unable to decode the photo.');
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const header: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const character of dataUrl.slice(comma + 1, comma + 25)) {
    if (character === '=') break;
    const value = alphabet.indexOf(character);
    if (value < 0) throw new Error('Invalid photo data.');
    buffer = (buffer << 6) | value; bits += 6;
    if (bits >= 8) { bits -= 8; header.push((buffer >> bits) & 255); }
  }
  const startsWith = (signature: number[]) => signature.every((byte, index) => header[index] === byte);
  const valid = contentType === 'image/jpeg' ? startsWith([255, 216, 255])
    : contentType === 'image/png' ? startsWith([137, 80, 78, 71, 13, 10, 26, 10])
    : startsWith([82, 73, 70, 70]) && [87, 69, 66, 80].every((byte, index) => header[index + 8] === byte);
  if (!valid) throw new Error('Photo contents do not match its JPEG, PNG, or WebP format.');
}
export async function prepareImage(image: ImageInput): Promise<PreparedImage> {
  if (!image || !['image/jpeg', 'image/png', 'image/webp'].includes(image.contentType)) {
    throw new Error('Choose a JPEG, PNG, or WebP photo.');
  }
  if (Boolean(image.uri) === Boolean(image.blob)) throw new Error('Provide exactly one local image URI or Blob.');
  let blob: Blob;
  if (image.blob) blob = image.blob;
  else {
    if (typeof image.uri !== 'string' || !/^(file:|content:|blob:)/.test(image.uri)) {
      throw new Error('Choose a local image from the image picker.');
    }
    const response = await fetch(image.uri);
    if (!response.ok && response.status !== 0) throw new Error('Unable to read the selected photo.');
    blob = await response.blob();
  }
  if (!blob || !Number.isFinite(blob.size) || blob.size < 1 || blob.size > 5 * 1024 * 1024) {
    throw new Error('Photo must be no larger than 5 MiB and must not be empty.');
  }
  if (blob.type && blob.type !== image.contentType) throw new Error('Photo type does not match the selected file.');
  const dataUrl = await readDataUrl(blob);
  validateSignature(dataUrl, image.contentType);
  return { dataUrl };
}
export async function uploadPreparedImage(path: string, image: PreparedImage, contentType: ImageInput['contentType']): Promise<string> {
  const photo = ref(storage, path);
  // A previous attempt may have uploaded successfully but lost the URL response.
  try { return await getDownloadURL(photo); }
  catch (error) {
    if ((error as { code?: string }).code !== 'storage/object-not-found') throw error;
  }
  await uploadString(photo, image.dataUrl, 'data_url', { contentType });
  return getDownloadURL(photo);
}
export async function getImageUrl(imagePath: string): Promise<ServiceResult<string>> {
  try {
    await requireUser();
    if (!/^cats\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+\/photo$/.test(imagePath)
      && !/^sightings\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+\/photo$/.test(imagePath)) throw new Error('Image path is invalid.');
    return { success: true, data: await getDownloadURL(ref(storage, imagePath)) };
  } catch (error) { return failure(error); }
}
