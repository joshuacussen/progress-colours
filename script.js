const GCSE   = [9,8,7,6,5,4,3,2,1];
const ALEVEL = ['A*','A','B','C','D','E','U'];

function getColour(score) {
  if (score <= -2) return 'red';
  if (score === -1) return 'yellow';
  if (score ===  0) return 'blue';
  if (score ===  1) return 'green';
  return 'purple';
}

const LABELS = { red: 'Red', yellow: 'Yellow', blue: 'Blue', green: 'Green', purple: 'Purple' };

function scoreStr(n) { return n > 0 ? '+' + n : String(n); }

function calc(mode) {
  const isGCSE     = mode === 'gcse';
  const grades     = isGCSE ? GCSE : ALEVEL;
  const targetTerm = isGCSE ? 'blue grade' : 'MEG';
  const target     = document.getElementById(isGCSE ? 'gcse-blue' : 'alevel-meg').value;
  const actual     = document.getElementById(isGCSE ? 'gcse-actual' : 'alevel-actual').value;
  const container  = document.getElementById(mode + '-result');

  if (target) localStorage.setItem('pcc-target-' + mode, target);
  else        localStorage.removeItem('pcc-target-' + mode);

  if (!target) { container.innerHTML = ''; return; }

  // Both arrays run best to worst (index 0 = best).
  // Score = targetIdx - actualIdx: positive when actual is better than target.
  const targetIdx  = grades.indexOf(isGCSE ? parseInt(target) : target);
  let badgeHTML    = '';
  let highlightIdx = null;

  if (actual) {
    const actualIdx = grades.indexOf(isGCSE ? parseInt(actual) : actual);
    const score     = targetIdx - actualIdx;
    const colour    = getColour(score);
    badgeHTML = `
      <div class="result-badge colour-${colour}">
        <span class="swatch dot-${colour}"></span>
        <span>${LABELS[colour]}</span>
        <span class="score">progress score&nbsp; ${scoreStr(score)}</span>
      </div>`;
    highlightIdx = actualIdx;
  }

  let rows = '';
  grades.forEach((g, i) => {
    const score    = targetIdx - i;
    const colour   = getColour(score);
    const isTarget = i === targetIdx;
    const isActual = i === highlightIdx;
    const noteText = isTarget && isActual
      ? `${targetTerm} &amp; actual`
      : isTarget ? targetTerm
      : isActual ? 'actual'
      : '';
    const note = noteText ? `<span class="note">${noteText}</span>` : '';
    rows += `<tr class="${isActual ? 'is-actual' : ''}">
      <td class="grade-cell">${g}${note}</td>
      <td class="score-cell">${scoreStr(score)}</td>
      <td>
        <div class="colour-cell">
          <span class="colour-dot dot-${colour}"></span>
          <span class="pill colour-${colour}">${LABELS[colour]}</span>
        </div>
      </td>
    </tr>`;
  });

  container.innerHTML = `
    <div class="result-section">
      <div class="badge-slot">
        ${badgeHTML || '<div class="badge-placeholder"><span class="ph-dot"></span>Select an actual grade to see the result</div>'}
      </div>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th>Actual grade</th>
          <th>Score</th>
          <th>Progress colour</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function switchTab(mode) {
  localStorage.setItem('pcc-tab', mode);
  document.querySelectorAll('.tab').forEach((t, i) => {
    t.classList.toggle('active', (i === 0 && mode === 'gcse') || (i === 1 && mode === 'alevel'));
  });
  document.getElementById('gcse-panel').classList.toggle('active', mode === 'gcse');
  document.getElementById('alevel-panel').classList.toggle('active', mode === 'alevel');
}

(function restore() {
  const tab = localStorage.getItem('pcc-tab') || 'gcse';
  switchTab(tab);
  const gcseTarget   = localStorage.getItem('pcc-target-gcse');
  const alevelTarget = localStorage.getItem('pcc-target-alevel');
  if (gcseTarget)   { document.getElementById('gcse-blue').value  = gcseTarget;   calc('gcse');   }
  if (alevelTarget) { document.getElementById('alevel-meg').value = alevelTarget; calc('alevel'); }
})();
