const trustedTeams = [
  { mark: "N", name: "NorthStudio" },
  { mark: "N°", name: "Nova Labs" },
  { mark: "PF", name: "PixelForge" },
  { mark: "V", name: "Vertex" },
  { mark: "L", name: "Luma" },
  { mark: "O", name: "Orbit" },
] as const;

export function TrustedTeams() {
  return (
    <section
      aria-labelledby="trusted-teams-title"
      className="marketing-trust-bar"
    >
      <div className="marketing-section-shell">
        <p id="trusted-teams-title">Trusted by ambitious teams</p>
        <ul aria-label="Teams using TaskMiner" className="marketing-logos">
          {trustedTeams.map((team) => (
            <li key={team.name}>
              <span aria-hidden="true">{team.mark}</span>
              <strong>{team.name}</strong>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
