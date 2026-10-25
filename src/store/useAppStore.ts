import { create } from 'zustand';
import { distanceBetween } from 'geofire-common';
import type { QueryDocumentSnapshot } from 'firebase/firestore';
import { isDemo } from '../config/runtime';
import { demoCats, demoComments, KL_CENTER } from '../data/demo';
import type { CatStatus, Location } from '../types/models';
import type { ActionResult, CatDraft, DisplayCat, DisplayComment, ModalScreen, Session } from '../types/ui';
import { displayCat } from '../utils/display';
import { cleanText, validateLocation, validateStatus } from '../utils/validation';
import { errorMessage } from '../utils/serviceResult';

interface AppState {
  cats: DisplayCat[]; comments: DisplayComment[]; session: Session | null;
  center: Location; radius: number; filter: CatStatus | 'all'; search: string;
  selectedId: string | null; modal: ModalScreen; afterAuth: 'add' | 'detail' | null;
  loading: boolean; error: string | null; notice: string | null; truncated: boolean;
  commentsLoading: boolean; commentsError: string | null; commentsMore: boolean;
  commentCursor: QueryDocumentSnapshot | null;
  open: (screen: ModalScreen) => void; openCat: (id: string) => void;
  setFilter: (filter: AppState['filter']) => void; setSearch: (search: string) => void;
  setCenter: (center: Location) => Promise<void>; setRadius: (radius: number) => Promise<void>;
  loadCats: () => Promise<void>; loadComments: (catId: string, append?: boolean) => Promise<void>;
  authenticate: (email: string, password: string, signup: boolean) => Promise<ActionResult>;
  enterDemo: () => void; signOut: () => Promise<void>;
  saveCat: (draft: CatDraft, retryId?: string) => Promise<ActionResult>;
  postComment: (catId: string, text: string) => Promise<ActionResult>;
  changeStatus: (catId: string, status: CatStatus) => Promise<ActionResult>;
  dismissNotice: () => void;
}
let loadSequence = 0;
export const useAppStore = create<AppState>((set, get) => ({
  cats: isDemo ? demoCats : [], comments: isDemo ? demoComments : [], session: null,
  center: KL_CENTER, radius: 2000, filter: 'all', search: '', selectedId: 'mochi',
  modal: null, afterAuth: null, loading: false, error: null, notice: null, truncated: false,
  commentsLoading: false, commentsError: null, commentsMore: false, commentCursor: null,
  open: modal => {
    if (modal === 'add' && !get().session) set({ modal: 'auth', afterAuth: 'add' });
    else if (modal === 'auth') set({ modal, afterAuth: get().modal === 'detail' ? 'detail' : null });
    else set({ modal, ...(modal === null ? { afterAuth: null } : {}) });
  },
  openCat: id => { set({ selectedId: id, modal: 'detail', commentsError: null }); void get().loadComments(id); },
  setFilter: filter => set({ filter }), setSearch: search => set({ search }),
  setCenter: async center => { validateLocation(center); set({ center }); await get().loadCats(); },
  setRadius: async radius => { set({ radius }); await get().loadCats(); },
  loadCats: async () => {
    if (isDemo || !get().session) return;
    const sequence = ++loadSequence;
    const { center, radius } = get();
    set({ loading: true, error: null });
    try {
      const service = await import('../services/catService');
      const result = await service.getNearbyCats(center.latitude, center.longitude, radius);
      if (sequence !== loadSequence) return;
      if (!result.success) throw new Error(result.error);
      const imageService = await import('../services/imageService');
      const cats = await Promise.all(result.data.cats.map(async cat => {
        const old = get().cats.find(item => item.id === cat.id);
        if (old?.imageUrl) return displayCat(cat, old.imageUrl);
        const image = await imageService.getImageUrl(cat.imagePath);
        return displayCat(cat, image.success ? image.data : null);
      }));
      if (sequence === loadSequence) set({ cats, truncated: result.data.truncated });
    } catch (error) { if (sequence === loadSequence) set({ error: errorMessage(error) }); }
    finally { if (sequence === loadSequence) set({ loading: false }); }
  },
  loadComments: async (catId, append = false) => {
    if (isDemo) return;
    set({ commentsLoading: true, commentsError: null });
    try {
      const service = await import('../services/commentService');
      const result = await service.getCommentsByCat(catId, { cursor: append ? get().commentCursor ?? undefined : undefined });
      if (get().selectedId !== catId) return;
      if (!result.success) throw new Error(result.error);
      const incoming = result.data.items.map(item => ({ id: item.id, catId, name: item.authorId === get().session?.uid ? 'You' : 'Neighbor', text: item.text, createdAt: item.createdAt.toMillis() }));
      set(state => ({ comments: [...state.comments.filter(item => item.catId !== catId || append), ...incoming.filter(item => !append || !state.comments.some(old => old.id === item.id))], commentsMore: result.data.hasMore, commentCursor: result.data.nextCursor }));
    } catch (error) { if (get().selectedId === catId) set({ commentsError: errorMessage(error) }); }
    finally { if (get().selectedId === catId) set({ commentsLoading: false }); }
  },
  authenticate: async (email, password, signup) => {
    try {
      const service = await import('../services/authService');
      const result = await (signup ? service.signUp(email, password) : service.login(email, password));
      if (!result.success) return { success: false, error: result.error };
      set({ session: { uid: result.data.uid, name: result.data.displayName || email.split('@')[0], email }, modal: get().afterAuth, afterAuth: null });
      await get().loadCats();
      return { success: true };
    } catch (error) { return { success: false, error: errorMessage(error) }; }
  },
  enterDemo: () => set({ session: { uid: 'demo-explorer', name: 'Alex', email: 'Demo account' }, modal: get().afterAuth, afterAuth: null, notice: 'Welcome, Alex! Your demo changes stay in this session.' }),
  signOut: async () => {
    try {
      if (!isDemo) { const service = await import('../services/authService'); const result = await service.logout(); if (!result.success) throw new Error(result.error); }
      ++loadSequence;
      set({ session: null, modal: null, loading: false, ...(!isDemo ? { cats: [], comments: [] } : {}), notice: 'You have signed out.' });
    } catch (error) { set({ notice: errorMessage(error) }); }
  },
  saveCat: async (draft, retryId) => {
    try {
      const session = get().session;
      if (!session) throw new Error('Please sign in first.');
      const description = cleanText(draft.description, 'Description', 1000);
      validateLocation(draft.location); validateStatus(draft.status);
      let id: string;
      if (isDemo) {
        id = `demo-${Date.now()}`;
        const name = description.split(/[.!\n]/)[0];
        set(state => ({ cats: [{ id, name: name.length <= 28 ? name : 'New neighborhood cat', description,
          status: draft.status, location: draft.location, imageUrl: draft.previewUri, area: 'Your sighting', spottedAt: Date.now(), author: session.name }, ...state.cats] }));
      } else {
        const service = await import('../services/catService');
        const result = retryId ? await service.retryCatImage(retryId, draft.image) : await service.createCat(draft);
        if (!result.success) return { success: false, error: result.error, id: result.data?.id, pending: result.data?.uploadState === 'pending' };
        id = result.data.id;
        set({ center: draft.location });
        await get().loadCats();
      }
      set({ selectedId: id, center: draft.location, filter: 'all', search: '', modal: null, notice: 'A new little neighbor is on the map. Thank you! 🐾' });
      return { success: true, id };
    } catch (error) { return { success: false, error: errorMessage(error) }; }
  },
  postComment: async (catId, content) => {
    try {
      const session = get().session;
      if (!session) throw new Error('Please sign in first.');
      const text = cleanText(content, 'Comment', 1000);
      if (isDemo) set(state => ({ comments: [{ id: `comment-${Date.now()}`, catId, name: session.name, text, createdAt: Date.now() }, ...state.comments] }));
      else {
        const service = await import('../services/commentService');
        const result = await service.addComment(catId, session.uid, text);
        if (!result.success) throw new Error(result.error);
        await get().loadComments(catId);
      }
      return { success: true };
    } catch (error) { return { success: false, error: errorMessage(error) }; }
  },
  changeStatus: async (catId, status) => {
    try {
      if (!get().session) throw new Error('Please sign in first.');
      validateStatus(status);
      if (!isDemo) {
        const service = await import('../services/catService');
        const result = await service.updateCatStatus(catId, status);
        if (!result.success) throw new Error(result.error);
      }
      set(state => ({ cats: state.cats.map(cat => cat.id === catId ? { ...cat, status, spottedAt: Date.now() } : cat), notice: 'Status updated. Thanks for keeping the neighborhood in the loop.' }));
      return { success: true };
    } catch (error) { return { success: false, error: errorMessage(error) }; }
  },
  dismissNotice: () => set({ notice: null })
}));

export function visibleCats(state: Pick<AppState, 'cats' | 'filter' | 'search' | 'center' | 'radius'>): DisplayCat[] {
  const search = state.search.toLowerCase().trim();
  return state.cats.filter(cat => (state.filter === 'all' || cat.status === state.filter)
    && (!search || `${cat.name} ${cat.description} ${cat.area}`.toLowerCase().includes(search))
    && distanceBetween([state.center.latitude, state.center.longitude], [cat.location.latitude, cat.location.longitude]) * 1000 <= state.radius)
    .sort((a, b) => distanceBetween([state.center.latitude, state.center.longitude], [a.location.latitude, a.location.longitude])
      - distanceBetween([state.center.latitude, state.center.longitude], [b.location.latitude, b.location.longitude]));
}
