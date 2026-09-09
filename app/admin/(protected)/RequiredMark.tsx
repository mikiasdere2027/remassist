import styles from '../admin.module.css';

/**
 * The red asterisk on a required field's label.
 *
 * Shared by the two document-shaped editors — a post and a popup — because a
 * required field should look the same in both, and a second asterisk written a
 * second way is how two forms end up disagreeing about what the mark means.
 *
 * It marks what the publish gate requires, not what the browser's `required`
 * attribute happens to cover. Those differ on purpose: a draft may be saved
 * half-written, and being unable to save your work because a field you have
 * not reached yet is empty would be the wrong kind of strict. What is still
 * missing is also named in full above the form, where it reads as a list
 * rather than as punctuation to decode; the asterisk is there so a field can
 * be recognised on its own.
 *
 * Not a client component: it renders a span and nothing else.
 */
export default function RequiredMark() {
  return (
    <span className={styles.reqMark} title="Required to publish">
      *<span className={styles.srOnly}> (required)</span>
    </span>
  );
}
