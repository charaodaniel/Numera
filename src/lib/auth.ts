import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { BLUEPRINT_LIMITS, clampString } from '../types/numera';

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export async function signInWithGoogle(): Promise<User> {
  const credential = await signInWithPopup(auth, googleProvider);
  await syncUserProfile(credential.user);
  return credential.user;
}

export async function syncUserProfile(user: User): Promise<void> {
  const path = `users/${user.uid}`;
  const userRef = doc(db, 'users', user.uid);
  const name = clampString(
    user.displayName || user.email?.split('@')[0] || 'Usuário Numera',
    BLUEPRINT_LIMITS.NAME_MAX
  );
  const email = clampString((user.email || '').toLowerCase(), BLUEPRINT_LIMITS.EMAIL_MAX);
  const photoURL = user.photoURL
    ? clampString(user.photoURL, 1000)
    : undefined;

  try {
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        name,
        email,
        ...(photoURL ? { photoURL } : {}),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(userRef, {
        name,
        ...(photoURL ? { photoURL } : {}),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function signOutUser(): Promise<void> {
  await firebaseSignOut(auth);
}
