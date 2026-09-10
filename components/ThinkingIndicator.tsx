"use client";

/**
 * ThinkingIndicator — affiché entre l'envoi du message et le premier
 * événement de réponse (agent.token / agent.done / agent.error).
 *
 * Distinct du TypingIndicator (3 points qui pulsent, utilisé une fois que
 * le texte a commencé à arriver) : ici rien n'est encore produit, l'orbe
 * représente le traitement en cours côté backend (orchestrateur → LLM).
 */
export default function ThinkingIndicator() {
  return (
    <div
      className="flex items-center px-1 py-1 fade-in"
      role="status"
      aria-live="polite"
      aria-label="Néron réfléchit"
    >
      <ThinkingOrb />
    </div>
  );
}

function ThinkingOrb() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      {/* Anneau statique */}
      <circle
        cx="12"
        cy="12"
        r="8"
        stroke="rgba(34,211,238,0.15)"
        strokeWidth="1"
        className="neron-think-ring"
      />
      {/* Point en orbite */}
      <g className="neron-think-orbit">
        <circle cx="12" cy="4" r="1.3" fill="#22d3ee" opacity="0.8" />
      </g>
      {/* Noyau pulsant */}
      <circle cx="12" cy="12" r="2" fill="#22d3ee" className="neron-think-core" />
    </svg>
  );
}
