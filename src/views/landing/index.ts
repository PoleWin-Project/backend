import { landingStyles } from "./styles";

const VIDEO_ID = "MwBFDzz2i-0";

export function landingHtml(): string {
    return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>PoleWin API</title>
  <style>${landingStyles()}</style>
</head>
<body>
  <div class="racing-bar"></div>
  <div class="speed-lines"></div>

  <!-- Hero video section — full width, sits above the main content -->
  <section class="hero-video-wrapper">
    <div class="hero-video-overlay"></div>
    <div class="hero-video-gradient"></div>

    <!-- Hero content sits on top of the video -->
    <div class="hero">
      <div class="flag-icon">🏁</div>
      <h1 class="hero-title">POLE<span style="-webkit-text-fill-color:var(--red);color:var(--red)">WIN</span></h1>
      <p class="hero-sub">Formula 1 Prediction API</p>
      <div class="version-badge">
        <span class="dot"></span>
        Express 5 &nbsp;·&nbsp; TypeScript &nbsp;·&nbsp; PostgreSQL
      </div>
    </div>
  </section>

  <!-- Main content — below the video, with gradient transition -->
  <main>
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

    <div class="techs">
      <p class="section-label">// Stack Technique — Libraries</p>
      <div class="tech-controls">
        <div class="tech-search">
          <span class="tech-search-icon">🔍</span>
          <input type="text" id="techSearch" placeholder="Rechercher une librairie..." />
        </div>
        <div class="tag-filters" id="tagFilters">
          <button class="tag-filter-btn active" data-tag="all">Tout</button>
          <button class="tag-filter-btn" data-tag="core">Core</button>
          <button class="tag-filter-btn" data-tag="security">Sécurité</button>
          <button class="tag-filter-btn" data-tag="database">Database</button>
          <button class="tag-filter-btn" data-tag="logging">Logging</button>
          <button class="tag-filter-btn" data-tag="api">API / Docs</button>
          <button class="tag-filter-btn" data-tag="test">Tests</button>
          <button class="tag-filter-btn" data-tag="config">Config</button>
          <button class="tag-filter-btn" data-tag="dev">Dev</button>
        </div>
      </div>
      <div class="tech-grid" id="techGrid"></div>
    </div>
  </main>

  <footer>
    PoleWin &nbsp;<span>©</span>&nbsp; ${new Date().getFullYear()} &nbsp;·&nbsp; Lights out and away we go 🚦
  </footer>

  <script src="/landing.js"></script>
</body>
</html>`;
}
