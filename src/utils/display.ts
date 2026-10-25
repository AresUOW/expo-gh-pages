import { distanceBetween } from 'geofire-common';
import type { Cat, Location } from '../types/models';
import type { DisplayCat } from '../types/ui';
export function distanceLabel(a: Location, b: Location): string {
  const meters = distanceBetween([a.latitude, a.longitude], [b.latitude, b.longitude]) * 1000;
  return meters < 1000 ? `${Math.max(10, Math.round(meters / 10) * 10)} m away` : `${(meters / 1000).toFixed(1)} km away`;
}
export function timeAgo(time: number): string {
  const minutes = Math.max(0, Math.floor((Date.now() - time) / 60_000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} hr ago`;
  const days = Math.floor(minutes / 1440);
  return `${days} ${days === 1 ? 'day' : 'days'} ago`;
}
export function displayCat(cat: Cat, imageUrl: string | null = null): DisplayCat {
  const title = cat.description.split(/[.!\n]/)[0];
  return { id: cat.id, name: title.length <= 28 ? title : `Cat #${cat.id.slice(0, 5)}`,
    description: cat.description, status: cat.status, location: cat.location,
    imageUrl, imagePath: cat.imagePath, area: 'Nearby sighting',
    spottedAt: cat.updatedAt?.toMillis() ?? Date.now(), author: 'Community member' };
}
