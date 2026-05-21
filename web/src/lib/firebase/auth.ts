import {
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    User,
    NextOrObserver,
    GoogleAuthProvider,
    signInWithPopup,
    createUserWithEmailAndPassword
} from "firebase/auth";
import { getAuthInstance } from "./client";

export const auth = getAuthInstance();
const googleProvider = new GoogleAuthProvider();

/**
 * Signs in a user with Google.
 */
export const signInWithGoogle = () => {
    return signInWithPopup(auth, googleProvider);
};

/**
 * Signs in a user with email and password.
 */
export const signInUser = (email: string, password: string) => {
    return signInWithEmailAndPassword(auth, email, password);
};

/**
 * Signs up a new user with email and password.
 */
export const signUpUser = (email: string, password: string) => {
    return createUserWithEmailAndPassword(auth, email, password);
};

/**
 * Signs out the current user.
 */
export const signOutUser = () => {
    return signOut(auth);
};

/**
 * Listens for auth state changes.
 */
export const onAuthChanged = (callback: NextOrObserver<User>) => {
    return onAuthStateChanged(auth, callback);
};
