import type { CSSProperties } from "react";

const teamDisciplines = [
  { mark: "P", name: "Product" },
  { mark: "E", name: "Engineering" },
  { mark: "O", name: "Operations" },
  { mark: "D", name: "Design" },
  { mark: "C", name: "Client work" },
  { mark: "L", name: "Leadership" },
] as const;

export function TrustedTeams() {
  return (
    <section
      aria-labelledby="trusted-teams-title"
      className="marketing-trust-bar"
    >
      <div className="marketing-section-shell">
        <h2
          className="marketing-motion-reveal marketing-motion-reveal--up"
          data-marketing-reveal
          id="trusted-teams-title"
        >
          One workspace for every part of delivery
        </h2>
        <ul
          aria-label="Disciplines connected by TaskMiner"
          className="marketing-logos marketing-motion-reveal marketing-motion-reveal--up"
          data-marketing-reveal
          style={{ "--reveal-delay": "80ms" } as CSSProperties}
        >
          {teamDisciplines.map((discipline) => (
            <li key={discipline.name}>
              <span aria-hidden="true">{discipline.mark}</span>
              <strong>{discipline.name}</strong>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
