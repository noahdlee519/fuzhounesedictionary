import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, Section, Ul, LEGAL_CONTACT } from "@/components/Legal";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: `What the ${SITE_NAME} collects, what it shows publicly, and how to have your data removed.`,
  alternates: { canonical: "/privacy" },
};

const UPDATED = "3 September 2026";

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      updated={UPDATED}
      intro={
        <>
          <p>
            fuzhounese.org is a community dictionary run by one person, Noah Lee, in the United
            States. This page says what the site collects about you, what it makes public, and how to
            get it removed. It is written to be read, not skimmed past.
          </p>
          <p>
            The short version: you can read everything on the site without giving us anything. If you
            sign in to contribute, we keep your Google name, email and picture, the profile details you
            choose to add, and the words and recordings you contribute. Your email is never shown
            publicly. Your contributions are—that is what a dictionary is.
          </p>
        </>
      }
    >
      <Section n={1} title="What we collect">
        <p>
          <b>If you only read the site:</b> nothing that identifies you. Our host, Vercel, records
          ordinary server logs (your IP address, browser type and the pages requested) for a short time
          to run the service and keep it secure. We use Vercel Web Analytics to count visits; it does
          not use cookies and does not identify individual visitors.
        </p>
        <p>
          <b>If you sign in:</b> sign-in is through Google. Google sends us your name, email address and
          profile picture, and we store them. We use a cookie to keep you signed in; it exists only for
          that purpose. We do not see your Google password.
        </p>
        <p>
          <b>Your profile:</b> anything you add on the account page—a display name, a profile
          picture, and, if you choose, where your Fuzhounese is from (a county or district, and
          optionally a town or village).
        </p>
        <p>
          <b>Your contributions:</b> the words, meanings, example sentences, pronunciations, requests
          and votes you submit, and any audio you record or upload. When you contribute, we also
          record the time and, if you have set it on your profile, where your Fuzhounese is from, so
          that a recording from Changle stays labelled Changle even if you later change your profile.
        </p>
        <p>
          <b>Suggestions and reviews:</b> if you suggest an improvement to a word, we keep the
          suggestion and whether it was accepted. If you are an editor, we keep a record of what you
          reviewed.
        </p>
      </Section>

      <Section n={2} title="What is public">
        <p>Anyone on the internet can see:</p>
        <Ul>
          <li>your display name and profile picture;</li>
          <li>
            where your Fuzhounese is from, only to the level you chose—nothing, the county or
            district, or the county and village;
          </li>
          <li>the month and year you joined;</li>
          <li>every word, meaning, example and recording you contributed that an editor has approved.</li>
        </Ul>
        <p>
          A recording is your voice, and it is published with your display name and origin label next
          to it. Please do not record if you are not comfortable with that.
        </p>
        <p>
          <b>Never public:</b> your email address, the exact time of your contributions, anything an
          editor rejected, and a village you entered but chose not to show. If you set your origin to
          &ldquo;Nothing&rdquo; or &ldquo;County only&rdquo;, the village field is not stored at all.
        </p>
      </Section>

      <Section n={3} title="How we use it">
        <p>Only to run the dictionary:</p>
        <Ul>
          <li>to sign you in and show you your own contributions;</li>
          <li>to credit you for what you add;</li>
          <li>to label recordings and words with where the speaker&apos;s Fuzhounese is from;</li>
          <li>to let editors review what is submitted and to stop abuse (rate limits and the like);</li>
          <li>to contact you about your account or a contribution, if we ever need to.</li>
        </Ul>
        <p>
          We do not sell your data, do not show advertising, do not build profiles of you, and do not
          send newsletters.
        </p>
      </Section>

      <Section n={4} title="Who else sees it">
        <p>
          Three companies process data on our behalf, each under its own privacy policy:{" "}
          <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noreferrer" className="text-lacquer hover:underline">Vercel</a>{" "}
          hosts the site and runs the analytics;{" "}
          <a href="https://supabase.com/privacy" target="_blank" rel="noreferrer" className="text-lacquer hover:underline">Supabase</a>{" "}
          stores the database, your sign-in session and the audio and picture files;{" "}
          <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer" className="text-lacquer hover:underline">Google</a>{" "}
          handles sign-in. Their servers may be in a different country from you, so using the site
          means your data can be transferred there.
        </p>
        <p>
          Beyond that, we share personal data only if the law requires it. Published contributions are,
          of course, shared with everyone: see the next section.
        </p>
      </Section>

      <Section n={5} title="Your contributions are open content">
        <p>
          Everything published in the dictionary is licensed{" "}
          <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer" className="text-lacquer hover:underline">
            CC BY-SA 4.0
          </a>
          , which lets anyone copy and reuse it as long as they credit the source and share alike.
          That includes recordings. Once a contribution is published, copies of it may exist elsewhere
          that we cannot recall. The <Link href="/terms" className="text-lacquer hover:underline">terms of service</Link>{" "}
          say more.
        </p>
      </Section>

      <Section n={6} title="How long we keep it">
        <p>
          Your account and profile: until you ask us to delete them. Approved contributions: as part of
          the dictionary, indefinitely, because removing words would break it for everyone else.
          Rejected submissions: kept privately with the editor&apos;s note so you can see why, until you
          delete your account. Server logs: a matter of weeks, set by Vercel.
        </p>
      </Section>

      <Section n={7} title="Your choices and rights">
        <p>
          You can change your display name, picture and origin settings on your account page at any
          time. For anything else, email{" "}
          <a href={`mailto:${LEGAL_CONTACT}`} className="text-lacquer hover:underline">{LEGAL_CONTACT}</a>{" "}
          from the address on your account and we will:
        </p>
        <Ul>
          <li>send you a copy of everything we hold about you;</li>
          <li>correct anything that is wrong;</li>
          <li>
            delete your account. Your profile, email, rejected submissions and pending items are
            removed. Recordings of your voice are removed too, if you ask. Words and meanings that were
            already published stay in the dictionary under the licence, credited to &ldquo;a
            contributor&rdquo; instead of your name.
          </li>
        </Ul>
        <p>
          We answer within 30 days. If you are in California or another place with a privacy law that
          gives you further rights, those rights apply and the same address is the way to use them. We
          do not discriminate against anyone for exercising them.
        </p>
      </Section>

      <Section n={8} title="Children">
        <p>
          You must be at least 13 to make an account. If you are under 13 we do not knowingly collect
          anything from you; if a parent tells us a child has made an account, we delete it. Recordings
          of younger speakers are welcome through a parent&apos;s account, with the parent&apos;s
          consent.
        </p>
      </Section>

      <Section n={9} title="Security">
        <p>
          Contributions and profile changes go over an encrypted connection. Editors can see pending
          submissions, and the site owner can see the whole database, including email addresses; both
          are bound by this policy. No website can promise perfect security, and if we learn of a
          breach that affects you we will tell you.
        </p>
      </Section>

      <Section n={10} title="Changes">
        <p>
          If this policy changes in a way that matters, the date at the top changes and, if you have
          an account, we will say so on the site before it takes effect. Small clarifications may be
          made without notice.
        </p>
      </Section>
    </LegalPage>
  );
}
