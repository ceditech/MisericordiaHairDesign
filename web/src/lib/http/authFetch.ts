import { auth } from "@/src/lib/firebase/auth";

/**
 * fetch() for calling protected API routes from the browser. Attaches the
 * signed-in user's Firebase ID token as `Authorization: Bearer <token>`.
 * With nobody signed in it sends the request unchanged; the server answers 401.
 */
export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers);
    const user = auth.currentUser;
    if (user) {
        headers.set("Authorization", `Bearer ${await user.getIdToken()}`);
    }
    return fetch(input, { ...init, headers });
}
