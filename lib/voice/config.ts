/**
 * Maya — the live voice mode of Ask RemAssist.
 *
 * Every knob the token route and the browser agree on lives here, so the
 * session the server locks into an ephemeral token and the limits the client
 * enforces cannot drift apart.
 */

/**
 * The Gemini Live model. Overridable because Live model ids are renamed far
 * more often than anything else in the API; a rename should be an env change
 * on the box, not a deploy.
 */
export const LIVE_MODEL = process.env.GEMINI_LIVE_MODEL || 'gemini-3.8-live';

/** Prebuilt Live voice. Aoede is the warm, unhurried female one. */
export const VOICE_NAME = 'Aoede';

/** How long a minted token may be used to open a session (ms). */
export const TOKEN_START_WINDOW_MS = 2 * 60_000;

/**
 * Hard ceiling on a session, enforced twice: by Google through the token's
 * expireTime, and by the browser, which hangs up a minute earlier so the
 * visitor hears a goodbye instead of a dropped line.
 */
export const SESSION_MAX_MS = 10 * 60_000;
export const CLIENT_SESSION_MAX_MS = SESSION_MAX_MS - 60_000;

/** Server side: the key is set, and the feature has not been switched off. */
export function voiceAgentConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY && process.env.NEXT_PUBLIC_VOICE_AGENT_ENABLED === '1';
}
