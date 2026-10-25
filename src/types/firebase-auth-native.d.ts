import type { Persistence } from 'firebase/auth';

// Firebase 12's root typings omit this documented React Native runtime export.
// Only firebase.native.ts uses it; web code must not import the native export.
declare module 'firebase/auth' {
  export function getReactNativePersistence(storage: {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
  }): Persistence;
}
