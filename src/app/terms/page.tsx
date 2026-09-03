import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, Section, Ul, LEGAL_CONTACT } from "@/components/Legal";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of service",
  description: `The rules for using and contributing to the ${SITE_NAME}.`,
  alternates: { canonical: "/terms" },
};

const UPDATED = "3 September 2026";

/* Governing law: the state the site is run from. */
const GOVERNING_STATE = "New York";

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of service"
      updated={UPDATED}
      intro={
        <>
          <p>
            These are the rules for using fuzhounese.org. Reading the dictionary needs no account and
            no agreement beyond the licence on the content. Signing in and contributing means you
            accept everything below. They are short on purpose; please read them.
          </p>
          <p>
            The site is run by Noah Lee (&ldquo;we&rdquo;), a private individual in the United States,
            not a company. Contact:{" "}
            <a href={`mailto:${LEGAL_CONTACT}`} className="text-lacquer hover:underline">{LEGAL_CONTACT}</a>.
          </p>
        </>
      }
    >
      <Section n={1} title="Using the dictionary">
        <p>
          Everything published here—words, meanings, examples, pronunciations, notes and
          recordings—is licensed under{" "}
          <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer" className="text-lacquer hover:underline">
            Creative Commons Attribution-ShareAlike 4.0
          </a>
          . You may copy, share, adapt and build on it, including commercially, provided you credit
          fuzhounese.org and the contributor where one is named, and release anything you build on it
          under the same licence. The site&apos;s design, code and name are not covered by that licence.
        </p>
        <p>
          Do not do anything that gets in the way of other people using the site: no attacks, no
          scraping at a rate that harms the service, no attempts to get around the review process or
          the limits on submissions.
        </p>
      </Section>

      <Section n={2} title="Accounts">
        <p>
          You need a Google account to sign in, and you must be at least 13 years old. Your account is
          yours: do not share it, and tell us if you think someone else has used it. We may suspend or
          close an account that breaks these terms, and we may close inactive or abandoned accounts.
          You can ask us to delete yours at any time; the{" "}
          <Link href="/privacy" className="text-lacquer hover:underline">privacy policy</Link> says what
          happens then.
        </p>
      </Section>

      <Section n={3} title="Contributing">
        <p>When you add a word, a meaning, an example, a pronunciation, a note or a recording, you promise that:</p>
        <Ul>
          <li>
            it is your own work, or something you have the right to share—in particular, you have
            not copied definitions or example sentences from a published dictionary or other
            copyrighted source;
          </li>
          <li>
            a recording is of your own voice, or of someone who has agreed to be recorded and
            published under these terms;
          </li>
          <li>it is offered in good faith as an honest record of how Fuzhounese is spoken.</li>
        </Ul>
        <p>
          By contributing you license your contribution to us and to everyone else under CC BY-SA 4.0,
          irrevocably. You keep the copyright. You agree to be credited by the display name on your
          profile, and you agree that we may edit, shorten, correct, merge or reject your contribution,
          and remove it at any time.
        </p>
        <p>
          Nothing appears on the site until an editor has approved it. We can decline anything, for
          any reason, and we do not owe an explanation, though we usually give one.
        </p>
      </Section>

      <Section n={4} title="What not to submit">
        <Ul>
          <li>anything you do not have the right to share (see above);</li>
          <li>personal information about other people;</li>
          <li>slurs, harassment, or content meant to demean a group of people—with the obvious exception that a dictionary records offensive words as words, labelled as such;</li>
          <li>spam, advertising, or content unrelated to Fuzhounese;</li>
          <li>deliberately false entries.</li>
        </Ul>
      </Section>

      <Section n={5} title="Copyright complaints">
        <p>
          If you believe something on the site infringes your copyright, email{" "}
          <a href={`mailto:${LEGAL_CONTACT}`} className="text-lacquer hover:underline">{LEGAL_CONTACT}</a>{" "}
          with the address of the page, a description of the work you say is infringed, your contact
          details, and a statement that you believe in good faith the use is not authorised. We will
          take the material down while we look into it, and tell the contributor.
        </p>
      </Section>

      <Section n={6} title="No warranty">
        <p>
          This is a volunteer project. The dictionary is offered as it is, with no promise that any
          entry is complete or correct, that the site will always be available, or that it will suit
          your purpose. Fuzhounese varies from village to village; an entry records what one speaker
          says, not a standard. Do not rely on the site for anything where an error would matter
          without checking elsewhere.
        </p>
      </Section>

      <Section n={7} title="Limitation of liability">
        <p>
          To the fullest extent the law allows, we are not liable for any loss or damage arising from
          your use of the site or from anything on it, including other people&apos;s contributions.
          Where liability cannot be excluded, it is limited to the amount you paid to use the site,
          which is nothing.
        </p>
      </Section>

      <Section n={8} title="Changes and ending">
        <p>
          We may change these terms; the date at the top changes when we do, and a change that
          matters is announced on the site. Continuing to contribute after a change means you accept
          it. We may stop running the site at any time. Because the content is openly licensed, anyone
          may keep a copy and carry it on.
        </p>
      </Section>

      <Section n={9} title="Law">
        <p>
          These terms are governed by the laws of the State of {GOVERNING_STATE}, United States, and
          any dispute will be heard in the courts there. If a court finds part of these terms
          unenforceable, the rest still applies.
        </p>
      </Section>
    </LegalPage>
  );
}
