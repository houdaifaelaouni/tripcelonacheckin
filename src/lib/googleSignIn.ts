// Google sign-in for owners and partners. Firebase Auth only proves the Google
// identity; the server then decides access and issues our own session.
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

export async function googleIdToken(): Promise<string> {
  const app = getApps()[0] ?? initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const cred = await signInWithPopup(auth, new GoogleAuthProvider());
  const token = await cred.user.getIdToken();
  await signOut(auth); // we don't keep a Firebase session in the browser
  return token;
}
