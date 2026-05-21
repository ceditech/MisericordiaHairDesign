# Firebase Authentication — Dynamic Links Deprecation Note

This document confirms the status of Firebase Authentication in the **DedeBraidsApp** following the deprecation of Firebase Dynamic Links (effective August 2025).

## Current Status: UNIMPACTED (WEB)

As a Next.js web application, our authentication implementation relies on standard Firebase Auth web flows which are **not affected** by the Dynamic Links shutdown.

### Key Confirmations:
1.  **SDK Version**: Upgraded to `firebase@latest` (v12.x+) to ensure support for the newest internal transport mechanisms.
2.  **Auth Flows**: 
    - **Email/Password**: Uses `signInWithEmailAndPassword`, which is a native web flow independent of Dynamic Links.
    - **Google OAuth**: Uses `signInWithPopup`, which remains fully supported and unaffected.
3.  **Cordova/Mobile**: This application is built exclusively for the Web. We do **not** use Cordova or any hybrid wrappers that relied on Dynamic Links for OAuth completion.
4.  **Email Actions**: Standard password resets and email verifications on the web do not require Dynamic Links and remain functional via traditional web-based redirection.

### Code Hygiene:
- An audit of the codebase confirmed **zero references** to `dynamicLinks`, `page.link`, or `firebase/dynamic-links`.
- The `src/lib/firebase/auth.ts` module uses strictly v9+ modular imports.

## Future Considerations:
- If mobile app support (iOS/Android) is added in the future, email-link authentication must be implemented using the updated SDK methods as outlined in the [Firebase Migration Guide](https://firebase.google.com/docs/dynamic-links/deprecation).

---
*Last Updated: March 2026*
