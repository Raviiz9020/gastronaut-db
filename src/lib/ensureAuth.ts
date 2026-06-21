// src/lib/ensureAuth.ts
import { auth } from "@/lib/firebase";
import type { User } from 'firebase/auth';

/** Resolves with the current user once Auth is ready (or throws on timeout). */
export async function ensureAuthUser(timeoutMs = 8000): Promise<User> {
  // fast path
  if (auth.currentUser) return auth.currentUser;

  // wait for onAuthStateChanged once
  const user = await new Promise<User | null>((resolve, reject) => {
    const timeout = setTimeout(() => {
      unsub();
      reject(new Error("Auth not ready (timeout)."));
    }, timeoutMs);

    const unsub = auth.onAuthStateChanged(u => {
      clearTimeout(timeout);
      unsub();
      resolve(u ?? null);
    });
  });

  if (!user) throw new Error("Not signed in");
  return user;
}
