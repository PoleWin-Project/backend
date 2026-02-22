export function landingStyles(): string {
    return `
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

    /* === Hero Video === */
    .hero-video-wrapper {
      position: relative;
      width: 100%;
      height: 65vh;
      min-height: 480px;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1;
    }

    .hero-video-iframe {
      position: absolute;
      top: 50%; left: 50%;
      /* Scale iframe to cover the container regardless of aspect ratio */
      width: 100vw;
      height: 56.25vw; /* 16:9 */
      min-height: 100%;
      min-width: 177.78vh; /* 16:9 inverse */
      transform: translate(-50%, -50%);
      border: none;
      pointer-events: none;
      opacity: 0.42;
      filter: saturate(1.3) brightness(0.85);
    }

    .hero-video-overlay {
      position: absolute;
      inset: 0;
      background: radial-gradient(ellipse at center, rgba(225,6,0,0.06) 0%, rgba(10,10,10,0.5) 100%);
      z-index: 2;
    }

    /* Gradient fade from video into the dark page background */
    .hero-video-gradient {
      position: absolute;
      bottom: 0; left: 0; right: 0;
      height: 55%;
      background: linear-gradient(to bottom, transparent 0%, var(--black) 100%);
      z-index: 3;
    }
    /* ================== */

    main {
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 48px 24px 60px;
      gap: 48px;
    }

    .hero { text-align: center; animation: fadeDown 0.8s ease both; position: relative; z-index: 4; }
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

    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(24px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 16px;
      width: 100%;
      max-width: 800px;
      animation: fadeUp 0.9s ease 0.2s both;
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
    .card-desc { font-size: 0.82rem; color: #666; margin-bottom: 14px; line-height: 1.5; }
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

    .endpoints { width: 100%; max-width: 800px; animation: fadeUp 1s ease 0.4s both; }

    .section-label {
      font-family: 'Orbitron', sans-serif;
      font-size: 0.7rem;
      letter-spacing: 4px;
      text-transform: uppercase;
      color: var(--red);
      margin-bottom: 16px;
    }

    .endpoint-list { display: flex; flex-direction: column; gap: 8px; }
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
    .ep-path { font-family: 'Courier New', monospace; font-size: 0.82rem; color: #ccc; }
    .ep-desc { margin-left: auto; font-size: 0.75rem; color: #555; }

    /* ===== Tech Section ===== */
    .techs { width: 100%; max-width: 800px; animation: fadeUp 1s ease 0.5s both; }

    .tech-controls { display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; }

    .tech-search { position: relative; }
    .tech-search input {
      width: 100%;
      padding: 10px 16px 10px 40px;
      background: var(--gray);
      border: 1px solid #2a2a2a;
      border-radius: 10px;
      color: var(--white);
      font-family: 'Inter', sans-serif;
      font-size: 0.85rem;
      outline: none;
      transition: border-color 0.2s;
    }
    .tech-search input:focus { border-color: var(--red); }
    .tech-search input::placeholder { color: #555; }
    .tech-search-icon {
      position: absolute;
      left: 14px; top: 50%;
      transform: translateY(-50%);
      color: #555; font-size: 0.88rem;
      pointer-events: none;
    }

    .tag-filters { display: flex; flex-wrap: wrap; gap: 8px; }
    .tag-filter-btn {
      padding: 4px 12px;
      border-radius: 999px;
      border: 1px solid currentColor;
      background: transparent;
      font-family: 'Inter', sans-serif;
      font-size: 0.72rem;
      font-weight: 600;
      letter-spacing: 1px;
      text-transform: uppercase;
      cursor: pointer;
      transition: background 0.2s, opacity 0.2s;
      opacity: 0.4;
    }
    .tag-filter-btn.active { opacity: 1; background: rgba(255,255,255,0.07); }
    .tag-filter-btn[data-tag="all"]      { color: var(--red); }
    .tag-filter-btn[data-tag="core"]     { color: #4a9eff; }
    .tag-filter-btn[data-tag="security"] { color: var(--red); }
    .tag-filter-btn[data-tag="database"] { color: #00c864; }
    .tag-filter-btn[data-tag="logging"]  { color: #ffd700; }
    .tag-filter-btn[data-tag="api"]      { color: #a855f7; }
    .tag-filter-btn[data-tag="test"]     { color: #ff6400; }
    .tag-filter-btn[data-tag="config"]   { color: #00bcd4; }
    .tag-filter-btn[data-tag="dev"]      { color: #888; }

    .tech-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(270px, 1fr)); gap: 10px; }

    .tech-card {
      background: var(--gray);
      border: 1px solid #2a2a2a;
      border-radius: 12px;
      overflow: hidden;
      cursor: pointer;
      transition: border-color 0.2s, box-shadow 0.2s;
      user-select: none;
    }
    .tech-card:hover { border-color: #3a3a3a; }
    .tech-card.expanded { border-color: var(--red); box-shadow: 0 8px 24px rgba(225,6,0,0.1); }

    .tech-header { display: flex; align-items: center; gap: 10px; padding: 14px 16px; }
    .tech-icon { font-size: 1.25rem; flex-shrink: 0; }
    .tech-info { flex: 1; min-width: 0; }
    .tech-name {
      font-family: 'Courier New', monospace;
      font-size: 0.85rem; font-weight: 700;
      color: var(--white); display: block;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .tech-version { font-size: 0.7rem; color: #555; font-family: 'Courier New', monospace; }
    .tech-header-tags { display: flex; gap: 4px; flex-wrap: wrap; justify-content: flex-end; }

    .tag {
      padding: 2px 8px; border-radius: 999px;
      font-size: 0.6rem; font-weight: 700;
      letter-spacing: 0.5px; text-transform: uppercase; white-space: nowrap;
    }
    .tag-core     { background: rgba(74,158,255,0.12);  color: #4a9eff; }
    .tag-security { background: rgba(225,6,0,0.12);     color: var(--red); }
    .tag-database { background: rgba(0,200,100,0.12);   color: #00c864; }
    .tag-logging  { background: rgba(255,215,0,0.1);    color: #ffd700; }
    .tag-api      { background: rgba(168,85,247,0.12);  color: #a855f7; }
    .tag-test     { background: rgba(255,100,0,0.12);   color: #ff6400; }
    .tag-config   { background: rgba(0,188,212,0.12);   color: #00bcd4; }
    .tag-dev      { background: rgba(136,136,136,0.12); color: #888; }

    .tech-chevron {
      font-size: 0.65rem; color: #555;
      transition: transform 0.25s; flex-shrink: 0; margin-left: 4px;
    }
    .tech-card.expanded .tech-chevron { transform: rotate(180deg); color: var(--red); }

    .tech-body { max-height: 0; overflow: hidden; transition: max-height 0.32s ease; }
    .tech-card.expanded .tech-body { max-height: 320px; }
    .tech-body-inner { padding: 12px 16px 16px; border-top: 1px solid #222; }
    .tech-short { font-size: 0.8rem; color: #bbb; margin-bottom: 8px; font-weight: 600; }
    .tech-desc { font-size: 0.78rem; color: #666; line-height: 1.65; margin-bottom: 12px; }
    .tech-npm {
      display: inline-flex; align-items: center; gap: 4px;
      font-size: 0.72rem; color: var(--red);
      text-decoration: none; font-weight: 600;
      letter-spacing: 0.5px; opacity: 0.8; transition: opacity 0.2s;
    }
    .tech-npm:hover { opacity: 1; text-decoration: underline; }

    .no-results { grid-column: 1 / -1; text-align: center; padding: 40px; color: #444; font-size: 0.85rem; }
    /* ======================== */

    footer {
      position: relative; z-index: 1;
      text-align: center; padding: 24px;
      font-size: 0.72rem; color: #444;
      letter-spacing: 2px; text-transform: uppercase;
    }
    footer span { color: var(--red); }
    `;
}
