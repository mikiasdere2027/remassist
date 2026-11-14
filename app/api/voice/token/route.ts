import { GoogleGenAI, Modality } from '@google/genai';
import { guard } from '@/lib/voice/guard';
import {
  LIVE_MODEL,
  SESSION_MAX_MS,
  TOKEN_START_WINDOW_MS,
  VOICE_NAME,
  voiceAgentConfigured,
} from '@/lib/voice/config';
import { buildSystemPrompt } from '@/lib/voice/prompt';
import { VOICE_TOOLS } from '@/lib/voice/tools';

/**
 * POST /api/voice/token — mint a single-use Gemini Live token for Maya.
 *
 * The browser talks to Gemini directly (no websocket proxy, so nothing changes
 * in Nginx and it works on Vercel too), but it never holds the API key. What
 * it gets is an ephemeral token with the model, voice, system prompt and tools
 * locked in through liveConnectConstraints: the client can open one session
 * with it and cannot change what that session is.
 *
 * Every token costs real money once it is used, so this is rate-limited much
 * harder than /api/leads.
 */
export const dynamic = 'force-dynamic';

/* The prompt is built from static modules, so build it once per process. */
let prompt: string | undefined;

export async function POST(req: Request) {
  if (!voiceAgentConfigured()) {
    return Response.json({ ok: false, error: 'disabled' }, { status: 404 });
  }
  const refused = guard(req, 'voice', 3, 600);
  if (refused) return refused;

  prompt ??= buildSystemPrompt();
  const now = Date.now();

  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: { apiVersion: 'v1alpha' },
    });
    const token = await ai.authTokens.create({
      config: {
        uses: 1,
        newSessionExpireTime: new Date(now + TOKEN_START_WINDOW_MS).toISOString(),
        expireTime: new Date(now + SESSION_MAX_MS).toISOString(),
        liveConnectConstraints: {
          model: LIVE_MODEL,
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE_NAME } } },
            /* The date changes and the prompt does not, so it rides on the token:
               without it "next Tuesday" has nothing to count from. */
            systemInstruction: `${prompt}\nToday is ${new Date(now).toUTCString().slice(0, 16)} (UTC).`,
            tools: [{ functionDeclarations: VOICE_TOOLS }],
            inputAudioTranscription: {},
            outputAudioTranscription: {},
          },
        },
        httpOptions: { apiVersion: 'v1alpha' },
      },
    });
    if (!token.name) throw new Error('no token name');
    return Response.json({ ok: true, token: token.name, model: LIVE_MODEL });
  } catch (err) {
    console.error('[voice] token mint failed', err);
    return Response.json({ ok: false, error: 'upstream' }, { status: 502 });
  }
}
