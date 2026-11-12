'use client';

import { forwardRef } from 'react';
import Image from 'next/image';
import styles from './MayaLive.module.css';

/**
 * Maya's round portrait: two aligned photos, lip-synced by loudness.
 *
 * The open-mouth photo sits on top of the closed-mouth one, masked down to the
 * mouth and jaw so nothing else in the frame can flicker. MayaLive drives its
 * opacity every frame through `mouthRef`, and the ring glow through the
 * `--lvl` custom property on the root — straight onto the elements, because
 * this runs at 60 fps and has no business re-rendering React.
 *
 * The two portraits are cropped from Maya_*_Mouth.jpg with the same box, so
 * they stay pixel-aligned; the mask in the CSS module is placed in their
 * coordinates.
 */

const CLOSED = '/images/Agents/maya-portrait-closed.jpg';
const OPEN = '/images/Agents/maya-portrait-open.jpg';

export type AvatarState = 'idle' | 'listening' | 'speaking';

const MayaAvatar = forwardRef<HTMLDivElement, { state: AvatarState; mouthRef: React.Ref<HTMLDivElement> }>(
  function MayaAvatar({ state, mouthRef }, ref) {
    return (
      <div ref={ref} className={styles.avatar} data-state={state}>
        <svg className={styles.rings} viewBox="0 0 200 200" aria-hidden="true">
          <circle className={styles.ringA} cx="100" cy="100" r="96" />
          <circle className={styles.ringB} cx="100" cy="100" r="88" />
          <circle className={styles.ringC} cx="100" cy="100" r="80" />
        </svg>
        <div className={styles.disc}>
          <Image src={CLOSED} alt="Maya, REM's AI assistant" fill sizes="112px" className={styles.photo} />
          <div ref={mouthRef} className={styles.mouth} aria-hidden="true" data-testid="maya-mouth">
            <Image src={OPEN} alt="" fill sizes="112px" className={styles.photo} />
          </div>
        </div>
      </div>
    );
  },
);

export default MayaAvatar;
