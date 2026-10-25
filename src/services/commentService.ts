import { collection, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import { requireUser } from './authService';
import { readCatPage } from './pagination';
import type { Comment, Page, PageOptions, ServiceResult } from '../types/models';
import { cleanText, validateId } from '../utils/validation';
import { failure } from '../utils/serviceResult';

export async function addComment(catId: string, userId: string, content: string): Promise<ServiceResult<{ id: string }>> {
  try {
    validateId(catId, 'Cat ID'); validateId(userId, 'User ID');
    const text = cleanText(content, 'Comment', 1000);
    const user = await requireUser();
    if (userId !== user.uid) throw new Error('You can only comment as the logged-in user.');
    const commentRef = doc(collection(db, 'comments'));
    const batch = writeBatch(db);
    batch.set(commentRef, { catId, authorId: user.uid, text, createdAt: serverTimestamp() });
    batch.set(doc(db, 'users', user.uid, 'rateLimits', 'comments'), {
      targetId: commentRef.id, lastCreatedAt: serverTimestamp()
    });
    // Parent existence is enforced by rules; no redundant preflight read is needed.
    await batch.commit();
    return { success: true, data: { id: commentRef.id } };
  } catch (error) { return failure(error); }
}
export async function getCommentsByCat(catId: string, options: PageOptions = {}): Promise<ServiceResult<Page<Comment>>> {
  try {
    validateId(catId, 'Cat ID'); await requireUser();
    return { success: true, data: await readCatPage<Comment>('comments', catId, options) };
  } catch (error) { return failure(error); }
}
