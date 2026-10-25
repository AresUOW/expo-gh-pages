import type { Location } from '../types/models';
import type { DisplayCat } from '../types/ui';
export interface CatMapProps {
  cats: DisplayCat[]; center: Location; selectedId: string | null;
  onSelect: (id: string) => void;
}
