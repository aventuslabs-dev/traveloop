import { parseLinkedText } from "@/lib/urban-sprint/linked-text";

/**
 * Staff-edited wording (the declaration, the Rules & Regulations) with its
 * `[label](/path)` links made real. Line breaks survive through CSS
 * (white-space: pre-line on the container), so a numbered list of rules typed
 * one per line reads as one.
 */
export default function LinkedText({ text }: { text: string }) {
  return (
    <>
      {parseLinkedText(text).map((part, index) =>
        part.href ? (
          <a key={index} href={part.href} target="_blank" rel="noopener noreferrer">
            {part.text}
          </a>
        ) : (
          <span key={index}>{part.text}</span>
        )
      )}
    </>
  );
}
