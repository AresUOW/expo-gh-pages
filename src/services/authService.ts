import {
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, type User
} from 'firebase/auth';
import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import type { ServiceResult } from '../types/models';
import { normalizeEmail } from '../utils/validation';
import { failure } from '../utils/serviceResult';

async function ensureProfile(user: User): Promise<void> {
  const profile = doc(db, 'users', user.uid);
  await runTransaction(db, async transaction => {
    if (!(await transaction.get(profile)).exists()) {
      transaction.set(profile, {
        displayName: (user.displayName?.trim() || user.email?.split('@')[0] || 'Cat friend').slice(0, 50),
        createdAt: serverTimestamp(), updatedAt: serverTimestamp()
      });
    }
  });
}
export async function signUp(email: string, password: string): Promise<ServiceResult<User>> {
  let user: User | undefined;
  try {
    const normalized = normalizeEmail(email);
    if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
      throw new Error('Password must contain 8–128 characters.');
    }
    user = (await createUserWithEmailAndPassword(auth, normalized, password)).user;
    await ensureProfile(user);
    return { success: true, data: user };
  } catch (error) {
    // Auth creation and profile creation cannot be atomic. Login repairs a missing profile.
    return failure(error, user);
  }
}
export async function login(email: string, password: string): Promise<ServiceResult<User>> {
  let user: User | undefined;
  try {
    const normalized = normalizeEmail(email);
    if (typeof password !== 'string' || !password) throw new Error('Enter your password.');
    user = (await signInWithEmailAndPassword(auth, normalized, password)).user;
    await ensureProfile(user);
    return { success: true, data: user };
  } catch (error) { return failure(error, user); }
}
export async function logout(): Promise<ServiceResult<null>> {
  try { await signOut(auth); return { success: true, data: null }; }
  catch (error) { return failure(error); }
}
export async function getCurrentUser(): Promise<ServiceResult<User | null>> {
  try {
    await auth.authStateReady();
    return { success: true, data: auth.currentUser };
  } catch (error) { return failure(error); }
}
export async function requireUser(): Promise<User> {
  await auth.authStateReady();
  if (!auth.currentUser) throw new Error('Please log in first.');
  return auth.currentUser;
}
