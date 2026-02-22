import { TECHS } from "./techs";

export function landingScript(): string {
    return `
    var TECHS = ${JSON.stringify(TECHS)};
    var activeTag = 'all';

    function renderTechs() {
      var query = document.getElementById('techSearch').value.toLowerCase().trim();
      var grid = document.getElementById('techGrid');
      grid.innerHTML = '';

      var filtered = TECHS.filter(function(t) {
        var matchTag = activeTag === 'all' || t.tags.indexOf(activeTag) !== -1;
        var matchSearch = !query || t.name.toLowerCase().indexOf(query) !== -1;
        return matchTag && matchSearch;
      });

      if (!filtered.length) {
        grid.innerHTML = '<div class="no-results">Aucune librairie trouv\u00e9e \u{1F3C1}</div>';
        return;
      }

      filtered.forEach(function(t) {
        var tagsHtml = t.tags.map(function(tag) {
          return '<span class="tag tag-' + tag + '">' + tag + '</span>';
        }).join('');

        var card = document.createElement('div');
        card.className = 'tech-card';
        card.innerHTML =
          '<div class="tech-header">' +
            '<span class="tech-icon">' + t.icon + '</span>' +
            '<div class="tech-info">' +
              '<span class="tech-name">' + t.name + '</span>' +
              '<span class="tech-version">' + t.version + '</span>' +
            '</div>' +
            '<div class="tech-header-tags">' + tagsHtml + '</div>' +
            '<span class="tech-chevron">\u25BC</span>' +
          '</div>' +
          '<div class="tech-body">' +
            '<div class="tech-body-inner">' +
              '<div class="tech-short">' + t.short + '</div>' +
              '<div class="tech-desc">' + t.desc + '</div>' +
              '<a class="tech-npm" href="https://www.npmjs.com/package/' + t.name + '" target="_blank" rel="noopener noreferrer">npm \u2197</a>' +
            '</div>' +
          '</div>';

        // Stop npm link click from toggling the card
        card.querySelector('.tech-npm').addEventListener('click', function(e) { e.stopPropagation(); });
        card.addEventListener('click', function() { card.classList.toggle('expanded'); });
        grid.appendChild(card);
      });
    }

    // Replace inline onclick/oninput handlers — required by CSP (script-src-attr 'none')
    document.addEventListener('DOMContentLoaded', function() {
      document.getElementById('techSearch').addEventListener('input', function() { renderTechs(); });

      document.getElementById('tagFilters').addEventListener('click', function(e) {
        var btn = e.target.closest('[data-tag]');
        if (!btn) return;
        activeTag = btn.getAttribute('data-tag');
        document.querySelectorAll('.tag-filter-btn').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        renderTechs();
      });

      renderTechs();
    });
    `;
}
