import type { DisplayCat, DisplayComment } from '../types/ui';
import type { Location } from '../types/models';
export const KL_CENTER: Location = { latitude: 3.1478, longitude: 101.7108 };
const photo = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=700&q=85`;
export const demoCats: DisplayCat[] = [
  { id: 'mochi', name: 'Mochi', status: 'being_cared_for', area: 'Jalan Alor', location: { latitude: 3.1450, longitude: 101.7080 }, imageUrl: photo('photo-1573865526739-10659fec78a5'), description: 'Mochi. A little orange sunshine, usually found napping near the food stalls. Friendly with people and very serious about snack time. The stall owners leave fresh water out for him.', spottedAt: Date.now() - 25 * 60_000, author: 'Amira' },
  { id: 'luna', name: 'Luna', status: 'needs_help', area: 'Bukit Bintang', location: { latitude: 3.1481, longitude: 101.7148 }, imageUrl: photo('photo-1514888286974-6c03e2ca1dba'), description: 'Luna. This sweet tabby has been hanging around the shop lots. She seems a little underweight and could use a check-up. Approaches gently when you sit nearby.', spottedAt: Date.now() - 62 * 60_000, author: 'Kai' },
  { id: 'sesame', name: 'Sesame', status: 'stray', area: 'Changkat', location: { latitude: 3.1504, longitude: 101.7060 }, imageUrl: photo('photo-1511044568932-338cba0ad803'), description: 'Sesame. A curious neighborhood explorer with the best whiskers. Often spotted on the quiet steps behind the cafés. A little shy, so give him some space.', spottedAt: Date.now() - 2 * 60 * 60_000, author: 'Daniel' },
  { id: 'milo', name: 'Milo', status: 'stray', area: 'Raja Chulan', location: { latitude: 3.1552, longitude: 101.7123 }, imageUrl: photo('photo-1495360010541-f48722b34f7d'), description: 'Milo. The unofficial garden supervisor. Loves a sunny patch and watches everyone walk past. Has been here for a few weeks and looks healthy.', spottedAt: Date.now() - 3 * 60 * 60_000, author: 'Sofia' },
  { id: 'olive', name: 'Olive', status: 'being_cared_for', area: 'Pudu', location: { latitude: 3.1402, longitude: 101.7139 }, imageUrl: photo('photo-1518791841217-8f162f1e1131'), description: 'Olive. A gentle little soul with a big purr. A few neighbors take turns feeding her in the evenings. Please keep her water bowl topped up if you pass by.', spottedAt: Date.now() - 4 * 60 * 60_000, author: 'Wei' },
  { id: 'peanut', name: 'Peanut', status: 'adopted', area: 'Tengkat Tong Shin', location: { latitude: 3.1447, longitude: 101.7022 }, imageUrl: photo('photo-1592194996308-7b43878e84a6'), description: 'Peanut. From the sidewalk to a forever sofa. A neighbor recently welcomed this tiny adventurer home. Leaving his profile here as a little happy ending.', spottedAt: Date.now() - 24 * 60 * 60_000, author: 'Aina' }
];
export const demoComments: DisplayComment[] = [
  { id: 'comment1', catId: 'mochi', name: 'Amira', text: 'I topped up his water bowl this morning. He looks happy and healthy! 🧡', createdAt: Date.now() - 48 * 60_000 },
  { id: 'comment2', catId: 'mochi', name: 'Daniel', text: 'Saw him snoozing by the corner stall yesterday. Such a little character.', createdAt: Date.now() - 3 * 60 * 60_000 },
  { id: 'comment3', catId: 'luna', name: 'Kai', text: 'I left some food by the steps. Will check on her again this evening.', createdAt: Date.now() - 30 * 60_000 }
];
