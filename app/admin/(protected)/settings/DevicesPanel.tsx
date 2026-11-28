'use client';

import { useState } from 'react';
import { api } from '@/lib/api/client';
import { describeDevice, type DeviceSession } from '@/lib/auth/devices';
import { LocalTime } from '../leads/[id]/LeadClient';
import styles from '../../admin.module.css';

/**
 * Where your account is signed in, with a way to sign the other devices out
 * (a lost phone, a shared computer you forgot). The list updates itself after
 * a sign-out, without waiting for a page refresh.
 */
export default function DevicesPanel({ initial }: { initial: DeviceSession[] }) {
  const [devices, setDevices] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);
  const others = devices.filter((d) => !d.current);

  async function signOut(d: DeviceSession) {
    setBusy(d.id);
    setMsg(null);
    try {
      await api.delete(`/admin/auth/sessions/${d.id}`);
      setDevices((list) => list.filter((x) => x.id !== d.id));
      setMsg({ tone: 'ok', text: `${describeDevice(d.userAgent)} was signed out.` });
    } catch (err) {
      setMsg({ tone: 'err', text: err instanceof Error ? err.message : 'Something went wrong.' });
    } finally {
      setBusy(null);
    }
  }

  async function signOutOthers() {
    setBusy('all');
    setMsg(null);
    try {
      const { revoked } = await api.post<{ revoked: number }>('/admin/auth/sessions/revoke-others');
      setDevices((list) => list.filter((x) => x.current));
      setMsg({ tone: 'ok', text: revoked === 0 ? 'No other devices were signed in.' : `Signed out ${revoked} other ${revoked === 1 ? 'device' : 'devices'}.` });
    } catch (err) {
      setMsg({ tone: 'err', text: err instanceof Error ? err.message : 'Something went wrong.' });
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Device</th>
              <th scope="col">Last active</th>
              <th scope="col">Signed in</th>
              <th scope="col" style={{ position: 'relative' }}><span className={styles.srOnly}>Action</span></th>
            </tr>
          </thead>
          <tbody>
            {devices.map((d) => (
              <tr key={d.id}>
                <td>
                  <span className={styles.cellPrimary}>{describeDevice(d.userAgent)}</span>
                  {d.current && <span className={`${styles.pill} ${styles.rolePill}`} style={{ marginLeft: 8 }}>This device</span>}
                  {d.ip && <span className={`${styles.cellSecondary} ${styles.mono}`}>{d.ip}</span>}
                </td>
                <td><LocalTime iso={d.lastSeenAt} /></td>
                <td><LocalTime iso={d.createdAt} mode="date" /></td>
                <td>
                  {!d.current && (
                    <button
                      type="button"
                      className={`${styles.btn} ${styles.btnGhost}`}
                      disabled={busy !== null}
                      aria-label={`Sign out ${describeDevice(d.userAgent)}`}
                      onClick={() => signOut(d)}
                    >
                      {busy === d.id ? 'Signing out…' : 'Sign out'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {others.length > 0 && (
        <p>
          <button type="button" className={`${styles.btn} ${styles.btnGhost}`} disabled={busy !== null} onClick={signOutOthers}>
            {busy === 'all' ? 'Signing out…' : `Sign out all ${others.length} other ${others.length === 1 ? 'device' : 'devices'}`}
          </button>
        </p>
      )}
      {msg && <p role={msg.tone === 'err' ? 'alert' : 'status'} className={`${styles.signinMsg} ${msg.tone === 'err' ? styles.msgErr : ''}`}>{msg.text}</p>}
    </>
  );
}
