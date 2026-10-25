import type { CatStatus, ImageInput, Location } from './models';
export interface DisplayCat {
  id: string; name: string; description: string; status: CatStatus; location: Location;
  imageUrl: string | null; imagePath?: string; area: string; spottedAt: number; author: string;
}
export interface DisplayComment { id: string; catId: string; name: string; text: string; createdAt: number }
export interface Session { uid: string; name: string; email?: string }
export interface CatDraft { description: string; status: CatStatus; location: Location; image: ImageInput; previewUri: string }
export interface ActionResult { success: boolean; error?: string; id?: string; pending?: boolean }
export type ModalScreen = 'add' | 'detail' | 'auth' | 'about' | null;
