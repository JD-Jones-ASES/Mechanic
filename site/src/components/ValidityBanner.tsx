/**
 * Severity-tagged validity messages (invariant 5). aria-live so screen
 * readers hear "cannot assemble"-class changes as they happen (ADR-0006).
 */
import type { ValidityMessage } from "../engines/types";

export function ValidityBanner({ messages }: { messages: ValidityMessage[] }) {
  return (
    <div aria-live="polite" class="validity">
      {messages.map((m) => (
        <p class={`validity-msg validity-${m.severity}`} key={m.message}>
          <strong>{m.severity === "invalid" ? "Invalid: " : "Caution: "}</strong>
          {m.message}
          {m.citation ? <span class="validity-cite"> [{m.citation}]</span> : null}
        </p>
      ))}
    </div>
  );
}
