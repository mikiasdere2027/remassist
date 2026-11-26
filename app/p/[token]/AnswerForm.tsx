'use client';

import { useActionState, useState } from 'react';
import { answerProposal, type AnswerState } from './actions';
import s from './page.module.css';


/** Accept or decline. Accepting needs a name and a confirmation tick. */
export default function AnswerForm({ token }: { token: string }) {
  const accept = (prev: AnswerState, fd: FormData) => answerProposal(token, true, prev, fd);
  const decline = (prev: AnswerState, fd: FormData) => answerProposal(token, false, prev, fd);
  const [mode, setMode] = useState<'accept' | 'decline' | null>(null);
  const [aState, aAction, aPending] = useActionState(accept, null);
  const [dState, dAction, dPending] = useActionState(decline, null);
  const done = (aState?.ok && aState) || (dState?.ok && dState);
  if (done) {
    return (
      <div className={s.done} role="status">
        <h2>{done.accepted ? 'Thank you — accepted.' : 'Thank you for letting us know.'}</h2>
        <p>{done.accepted ? 'We will be in touch shortly to start onboarding.' : 'If anything changes, reply to our email and we will gladly revisit it.'}</p>
      </div>
    );
  }
  return (
    <div className={s.answer}>
      {!mode && (
        <div className={s.buttons}>
          <button type="button" className={s.primary} onClick={() => setMode('accept')}>Accept proposal</button>
          <button type="button" className={s.ghost} onClick={() => setMode('decline')}>Decline</button>
        </div>
      )}
      {mode === 'accept' && (
        <form action={aAction} className={s.form}>
          <input type="text" name="website" tabIndex={-1} autoComplete="off" className={s.honey} aria-hidden="true" />
          <label htmlFor="acc-name">Your full name</label>
          <input id="acc-name" name="name" required minLength={2} maxLength={120} autoComplete="name" />
          <label className={s.check}>
            <input type="checkbox" name="agree" required />
            I accept this proposal on behalf of my organisation.
          </label>
          {aState && !aState.ok && <p className={s.error} role="alert">{aState.error}</p>}
          <div className={s.buttons}>
            <button type="submit" className={s.primary} disabled={aPending}>{aPending ? 'Sending…' : 'Accept'}</button>
            <button type="button" className={s.ghost} onClick={() => setMode(null)}>Back</button>
          </div>
        </form>
      )}
      {mode === 'decline' && (
        <form action={dAction} className={s.form}>
          <input type="text" name="website" tabIndex={-1} autoComplete="off" className={s.honey} aria-hidden="true" />
          <label htmlFor="dec-name">Your name</label>
          <input id="dec-name" name="name" required minLength={2} maxLength={120} autoComplete="name" />
          <label htmlFor="dec-note">What would make it work? (optional)</label>
          <textarea id="dec-note" name="note" maxLength={2000} rows={3} />
          {dState && !dState.ok && <p className={s.error} role="alert">{dState.error}</p>}
          <div className={s.buttons}>
            <button type="submit" className={s.ghost} disabled={dPending}>{dPending ? 'Sending…' : 'Decline proposal'}</button>
            <button type="button" className={s.ghost} onClick={() => setMode(null)}>Back</button>
          </div>
        </form>
      )}
    </div>
  );
}
