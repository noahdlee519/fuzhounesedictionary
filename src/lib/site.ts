/* The site's canonical home, hard-coded on purpose.

   This used to read NEXT_PUBLIC_SITE_URL, which was set in Vercel to the
   fuzhounese-dictionary.vercel.app address. The effect was that every page told
   Google its real address was the vercel.app one, competing with fuzhounese.org
   for indexing. It also broke Google sign-in: the OAuth return address was built
   from this value, so the PKCE verifier cookie was written on one host and read
   on another. (SignInButton now uses window.location.origin and no longer
   depends on this at all.)

   A canonical URL is a fact about the site, not a setting that should vary by
   deployment — a preview build declaring itself canonical is exactly what you do
   not want. So this is a constant. NEXT_PUBLIC_SITE_URL is now unused; it can be
   deleted from Vercel, or left alone, without any effect. */
export const SITE_URL = "https://fuzhounese.org";

export const SITE_NAME = "Fuzhounese Dictionary";

// Noah's wording, used verbatim as the meta description / search snippet.
export const SITE_DESCRIPTION =
  "The collaborative Fuzhounese-English dictionary project. Search for words, characters, romanization, and audio—and contribute your own entries.";
