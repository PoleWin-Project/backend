export function landingHtml(): string {
    return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>PoleWin API</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&family=Orbitron:wght@700;900&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --red: #e10600;
      --red-dark: #a00400;
      --black: #0a0a0a;
      --white: #f5f5f5;
      --gray: #1a1a1a;
    }

    body {
      background: var(--black);
      color: var(--white);
      font-family: 'Inter', system-ui, sans-serif;
      min-height: 100vh;
      overflow-x: hidden;
    }

    body::before {
      content: '';
      position: fixed;
      inset: 0;
      background: repeating-linear-gradient(
        105deg,
        transparent 0px, transparent 60px,
        rgba(225,6,0,0.03) 60px, rgba(225,6,0,0.03) 62px
      );
      pointer-events: none;
      z-index: 0;
    }

    .racing-bar {
      position: fixed;
      top: 0; left: 0; right: 0;
      height: 4px;
      background: linear-gradient(90deg, var(--red-dark), var(--red), #ff4444, var(--red), var(--red-dark));
      background-size: 200% 100%;
      animation: barSlide 2.5s linear infinite;
      z-index: 100;
    }
    @keyframes barSlide {
      0%   { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    .speed-lines {
      position: fixed;
      top: 0; left: -100%; width: 300%; height: 100%;
      background: repeating-linear-gradient(
        90deg,
        transparent 0px, transparent 120px,
        rgba(255,255,255,0.012) 120px, rgba(255,255,255,0.012) 122px
      );
      animation: speedMove 4s linear infinite;
      pointer-events: none;
      z-index: 0;
    }
    @keyframes speedMove {
      0%   { transform: translateX(0); }
      100% { transform: translateX(33.33%); }
    }

    main {
      position: relative;
      z-index: 1;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 24px;
      gap: 48px;
    }

    .hero {
      text-align: center;
      animation: fadeDown 0.8s ease both;
    }
    @keyframes fadeDown {
      from { opacity: 0; transform: translateY(-24px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .flag-icon {
      font-size: 3rem;
      animation: wave 1.5s ease-in-out infinite alternate;
      display: inline-block;
    }
    @keyframes wave {
      from { transform: rotate(-6deg); }
      to   { transform: rotate(6deg); }
    }

    .hero-title {
      font-family: 'Orbitron', sans-serif;
      font-size: clamp(2.8rem, 8vw, 6rem);
      font-weight: 900;
      line-height: 1;
      margin: 16px 0 8px;
      background: linear-gradient(135deg, var(--white) 40%, var(--red) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      letter-spacing: -1px;
    }

    .hero-sub {
      font-size: 1rem;
      color: #888;
      letter-spacing: 4px;
      text-transform: uppercase;
      font-weight: 600;
    }

    .version-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-top: 20px;
      padding: 6px 14px;
      background: var(--gray);
      border: 1px solid #333;
      border-radius: 999px;
      font-size: 0.75rem;
      color: #aaa;
      letter-spacing: 1px;
    }
    .version-badge .dot {
      width: 6px; height: 6px;
      border-radius: 50%;
      background: var(--red);
      animation: pulse 1.5s ease-in-out infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50%       { opacity: 0.4; transform: scale(0.8); }
    }

    .divider {
      width: 100%;
      max-width: 640px;
      height: 1px;
      background: linear-gradient(90deg, transparent, var(--red), transparent);
      animation: fadeDown 1s ease 0.3s both;
    }

    .cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 16px;
      width: 100%;
      max-width: 800px;
      animation: fadeUp 0.9s ease 0.2s both;
    }
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(24px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .card {
      background: var(--gray);
      border: 1px solid #2a2a2a;
      border-radius: 16px;
      padding: 24px;
      text-decoration: none;
      color: inherit;
      transition: border-color 0.25s, transform 0.25s, box-shadow 0.25s;
      position: relative;
      overflow: hidden;
    }
    .card::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 2px;
      background: linear-gradient(90deg, var(--red-dark), var(--red));
      transform: scaleX(0);
      transform-origin: left;
      transition: transform 0.3s ease;
    }
    .card:hover::before { transform: scaleX(1); }
    .card:hover {
      border-color: var(--red);
      transform: translateY(-4px);
      box-shadow: 0 16px 40px rgba(225,6,0,0.15);
    }

    .card-icon { font-size: 1.6rem; margin-bottom: 12px; }
    .card-title {
      font-family: 'Orbitron', sans-serif;
      font-size: 0.85rem;
      font-weight: 700;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: var(--white);
      margin-bottom: 6px;
    }
    .card-desc {
      font-size: 0.82rem;
      color: #666;
      margin-bottom: 14px;
      line-height: 1.5;
    }
    .card-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--red);
      letter-spacing: 1px;
      text-transform: uppercase;
    }
    .card-link::after { content: '→'; transition: transform 0.2s; }
    .card:hover .card-link::after { transform: translateX(4px); }

    .endpoints {
      width: 100%;
      max-width: 800px;
      animation: fadeUp 1s ease 0.4s both;
    }

    .section-label {
      font-family: 'Orbitron', sans-serif;
      font-size: 0.7rem;
      letter-spacing: 4px;
      text-transform: uppercase;
      color: var(--red);
      margin-bottom: 16px;
    }

    .endpoint-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .endpoint {
      display: flex;
      align-items: center;
      gap: 12px;
      background: var(--gray);
      border: 1px solid #222;
      border-radius: 10px;
      padding: 12px 16px;
      transition: border-color 0.2s;
    }
    .endpoint:hover { border-color: #444; }

    .method {
      font-family: 'Orbitron', sans-serif;
      font-size: 0.65rem;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 5px;
      letter-spacing: 1px;
      min-width: 56px;
      text-align: center;
    }
    .method.get    { background: rgba(0,200,100,0.15);  color: #00c864; }
    .method.post   { background: rgba(225,6,0,0.15);    color: var(--red); }
    .method.patch  { background: rgba(90,120,255,0.15); color: #7b9fff; }
    .method.del    { background: rgba(255,100,0,0.15);  color: #ff6400; }

    .ep-path {
      font-family: 'Courier New', monospace;
      font-size: 0.82rem;
      color: #ccc;
    }
    .ep-desc {
      margin-left: auto;
      font-size: 0.75rem;
      color: #555;
    }

    footer {
      position: relative;
      z-index: 1;
      text-align: center;
      padding: 24px;
      font-size: 0.72rem;
      color: #444;
      letter-spacing: 2px;
      text-transform: uppercase;
    }
    footer span { color: var(--red); }
  </style>
</head>
<body>
  <div class="racing-bar"></div>
  <div class="speed-lines"></div>

  <main>
    <section class="hero">
      <div class="flag-icon">🏁</div>
      <h1 class="hero-title">POLE<span style="-webkit-text-fill-color:var(--red);color:var(--red)">WIN</span></h1>
      <p class="hero-sub">Formula 1 Prediction API</p>
      <div class="version-badge">
        <span class="dot"></span>
        Express 5 &nbsp;·&nbsp; TypeScript &nbsp;·&nbsp; PostgreSQL
      </div>
    </section>

    <div class="divider"></div>

    <div class="cards">
      <a class="card" href="/api/v1/docs">
        <div class="card-icon">📖</div>
        <div class="card-title">Documentation</div>
        <div class="card-desc">Explorez tous les endpoints via Swagger UI interactif.</div>
        <span class="card-link">Swagger UI</span>
      </a>
      <a class="card" href="/api/v1/health">
        <div class="card-icon">🏎️</div>
        <div class="card-title">Health Check</div>
        <div class="card-desc">Vérifiez le statut du serveur et de la base de données.</div>
        <span class="card-link">Voir le statut</span>
      </a>
      <a class="card" href="/api/v1">
        <div class="card-icon">🔗</div>
        <div class="card-title">Discovery</div>
        <div class="card-desc">Découvrez tous les endpoints disponibles via HATEOAS.</div>
        <span class="card-link">/api/v1</span>
      </a>
    </div>

    <div class="endpoints">
      <p class="section-label">// Endpoints v1 — principaux</p>
      <div class="endpoint-list">
        <div class="endpoint">
          <span class="method post">POST</span>
          <span class="ep-path">/api/v1/auth/register</span>
          <span class="ep-desc">Créer un compte</span>
        </div>
        <div class="endpoint">
          <span class="method post">POST</span>
          <span class="ep-path">/api/v1/auth/login</span>
          <span class="ep-desc">Connexion</span>
        </div>
        <div class="endpoint">
          <span class="method get">GET</span>
          <span class="ep-path">/api/v1/users/me</span>
          <span class="ep-desc">Profil courant</span>
        </div>
        <div class="endpoint">
          <span class="method patch">PATCH</span>
          <span class="ep-path">/api/v1/users/me</span>
          <span class="ep-desc">Modifier le profil</span>
        </div>
        <div class="endpoint">
          <span class="method get">GET</span>
          <span class="ep-path">/api/v1/users/:id/public</span>
          <span class="ep-desc">Profil public</span>
        </div>
        <div class="endpoint">
          <span class="method del">DELETE</span>
          <span class="ep-path">/api/v1/auth/delete-account</span>
          <span class="ep-desc">Supprimer le compte</span>
        </div>
      </div>
    </div>
  </main>

  <footer>
    PoleWin &nbsp;<span>©</span>&nbsp; ${new Date().getFullYear()} &nbsp;·&nbsp; Lights out and away we go 🚦
  </footer>
</body>
</html>`;
}
