/**
 * Hook copy — every word a player reads on the public /c challenge (the viral
 * hook). THIS IS YOURS TO VOICE. Edit any line/label here; no component changes
 * needed. The headline and the share text are the two that matter most — those
 * are literally the ad.
 *
 * Only rule: keep it HONEST. A tier DESCRIBES the score — never invent a ranking
 * or a "top X%". The pull is a real challenge + a real friend beating a real
 * score, not a fake stat.
 *
 * NOT here: the link-unfurl preview copy — that's the OG/twitter <meta> tags in
 * index.html (static HTML the app can't import), so edit those in index.html.
 */
export const HOOK_COPY = {
  intro: {
    eyebrowFresh: 'Arena Challenge',
    eyebrowIncoming: 'You were challenged',
    headline: 'Train your mind.',
    blurbFresh:
      '10 quick drills against the clock — math, memory, patterns. Fire your neurons, see where you land, then dare a friend to beat it.',
    /** Shown when arriving via a friend's link. name = who challenged you. */
    taunt: (name: string, score: number) =>
      `${name} scored ${score.toLocaleString()}. Beat it — same 10 questions.`,
    startFresh: 'Start training',
    startIncoming: 'Beat their score',
    footnote: 'No signup to play. Plays instantly.',
    someone: 'Someone', // fallback when the challenger has no name
  },
  result: {
    yourScore: 'Your score',
    verdict: { win: 'You won', loss: 'You lost', tie: 'Tied' },
    /** my = your score; name/their = the challenger. */
    headToHead: (my: number, name: string, their: number) =>
      `You ${my.toLocaleString()} · ${name} ${their.toLocaleString()}`,
    challengerFallback: 'Challenger',
    ctaSaveAuthed: 'Keep playing',
    ctaSaveGuest: 'Save your rank · play daily',
    playAgain: 'Play again',
  },
  share: {
    label: 'Challenge a friend',
    /** What posts to WhatsApp/TikTok (the link is attached separately). */
    text: (score: number) => `I scored ${score.toLocaleString()} on Arena. Beat me.`,
    cardEyebrow: 'Challenge',
    cardKicker: 'I scored',
    cardCta: 'Beat me.',
  },
  /** Honest score-band tiers (descending). Rename labels / retune thresholds freely. */
  tiers: [
    { label: 'Lightning', min: 7500 },
    { label: 'Fast', min: 5500 },
    { label: 'Sharp', min: 3000 },
    { label: 'Warming up', min: 0 },
  ] as ReadonlyArray<{ label: string; min: number }>,
};
