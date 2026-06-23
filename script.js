const LABELS = { red: "Red", yellow: "Yellow", blue: "Blue", green: "Green", purple: "Purple" };
const TARGET_LABEL = { gcse: "Blue grade", alevel: "MEG" };

function scoreStr(n) { return n > 0 ? "+" + n : String(n); }

function isNumericGradeType(gradeTypeKey) {
  return GRADE_TYPES[gradeTypeKey].grades.every(g => /^[0-9]+$/.test(g));
}

// ── Populate a grade dropdown with every sub-grade for a grade type ──
function populateGradeSelect(selectEl, gradeTypeKey) {
  const subGrades = buildSubGrades(gradeTypeKey);
  selectEl.innerHTML = '<option value="">—</option>' +
    subGrades.map(g => `<option value="${g.label}">${g.label}</option>`).join("");
}

// Where targetMinimumOnly is set (GCSE), the target (blue grade) is
// always set as the "-" — the minimum boundary. Otherwise (A-level,
// where MEG can itself be any +/- shade) every sub-grade is offered.
function populateTargetSelect(selectEl, gradeTypeKey) {
  const gradeType = GRADE_TYPES[gradeTypeKey];
  const subGrades = buildSubGrades(gradeTypeKey);
  const targets = gradeType.targetMinimumOnly
    ? subGrades.filter(g => g.label.endsWith("-"))
    : subGrades.filter(g => g.label !== "U");
  selectEl.innerHTML = '<option value="">—</option>' +
    targets.map(g => `<option value="${g.label}">${g.label}</option>`).join("");
}

// ── Course dropdown (all courses, any qualification) ──
function populateCourseSelect() {
  const select = document.getElementById("course");
  select.innerHTML = Object.entries(COURSES)
    .map(([key, c]) => `<option value="${key}">${c.name}</option>`).join("");
}

function currentCourse() {
  return COURSES[document.getElementById("course").value];
}

// Called when the course changes: re-labels and repopulates the
// target/actual dropdowns for the new grade type, and rebuilds the
// series list for the mark calculator.
function onTopCourseChange() {
  const course = currentCourse();
  if (!course) return;

  document.getElementById("target-label").textContent = TARGET_LABEL[course.qualification] || "Target grade";

  const targetSel = document.getElementById("target");
  const actualSel = document.getElementById("actual-select");
  const prevTarget = targetSel.value;
  const prevActual = actualSel.value;

  populateTargetSelect(targetSel, course.gradeType);
  populateGradeSelect(actualSel, course.gradeType);

  // Keep the previous selection if it still exists for this grade type
  if ([...targetSel.options].some(o => o.value === prevTarget)) targetSel.value = prevTarget;
  if ([...actualSel.options].some(o => o.value === prevActual)) actualSel.value = prevActual;

  const seriesSelect = document.getElementById("series");
  seriesSelect.innerHTML = Object.keys(course.series)
    .map(s => `<option value="${s}">${formatSeries(s)}</option>`).join("");

  localStorage.setItem("pcc-course", document.getElementById("course").value);
  updateActualFieldVisibility();
  onSeriesChange();
  calc();
}

function onSeriesChange() {
  computeFromMark();
}

function formatSeries(key) {
  // "june-2024" -> "June 2024"
  return key.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

// Keeps the mark field's native max attribute in sync with whatever
// the paper total currently holds, so the up/down spinner respects
// it. Purely a nicety — the explicit error messages below do the
// real validation, and nothing here ever rewrites a typed value.
function syncMarkBounds() {
  const markEl = document.getElementById("mark");
  const maxEl  = document.getElementById("maxmark");
  const maxVal = parseFloat(maxEl.value);
  markEl.max = Number.isFinite(maxVal) && maxVal > 0 ? maxVal : "";
}

// ── Run the mark -> grade calculation and show the result ──
function computeFromMark() {
  syncMarkBounds();

  const resultEl    = document.getElementById("calc-result");
  const course      = currentCourse();
  const seriesKey   = document.getElementById("series").value;
  const boundaryKey = document.getElementById("boundary").value;
  const mark    = parseFloat(document.getElementById("mark").value);
  const maxMark = parseFloat(document.getElementById("maxmark").value);

  if (!course || !seriesKey) { resultEl.innerHTML = ""; renderBoundaryTable(); clearCalculatedGrade(); return; }

  if (!Number.isFinite(mark) || !Number.isFinite(maxMark)) {
    resultEl.innerHTML = '<p class="calc-prompt">Enter your mark and the paper total to see your grade.</p>';
    renderBoundaryTable();
    clearCalculatedGrade();
    return;
  }
  if (maxMark < 1) {
    resultEl.innerHTML = '<p class="calc-error">The paper total must be at least 1.</p>';
    renderBoundaryTable();
    clearCalculatedGrade();
    return;
  }
  if (mark < 0) {
    resultEl.innerHTML = '<p class="calc-error">Your mark can\'t be negative.</p>';
    renderBoundaryTable();
    clearCalculatedGrade();
    return;
  }
  if (mark > maxMark) {
    resultEl.innerHTML = '<p class="calc-error">Your mark can\'t be higher than the paper total.</p>';
    renderBoundaryTable();
    clearCalculatedGrade();
    return;
  }

  const details = calculateGradeDetails(course, seriesKey, boundaryKey, mark, maxMark);

  let detailLine = "";
  if (details.label === "U") {
    detailLine = details.marksToNextGrade != null
      ? `${pluralMarks(details.marksToNextGrade)} needed to reach grade ${details.nextGrade}.`
      : "";
  } else {
    const aboveText = details.marksAboveBoundary === 0
      ? `Exactly on the grade ${details.grade} boundary`
      : `${pluralMarks(details.marksAboveBoundary)} above the grade ${details.grade} boundary`;
    const nextText = details.nextGrade
      ? `; ${pluralMarks(details.marksToNextGrade)} to reach grade ${details.nextGrade}`
      : "; already at the top grade";
    detailLine = aboveText + nextText + ".";
  }

  const scalingNote = maxMark !== details.refMax
    ? `<p class="calc-hint">Boundaries are scaled to ${maxMark} marks rather than ${details.refMax}.</p>`
    : "";

  resultEl.innerHTML = `
    <p class="calc-result-row">${mark}/${maxMark} (${((mark / maxMark) * 100).toFixed(1)}%) is ${announceGrade(details.label, course.gradeType)}.</p>
    <p class="calc-detail">${detailLine}</p>
    ${scalingNote}`;

  useCalculatedGrade(details.label);
  renderBoundaryTable();
}

function announceGrade(label, gradeTypeKey) {
  if (isNumericGradeType(gradeTypeKey)) return `grade ${label}`;
  const article = /^[AE]/.test(label) ? "an" : "a"; // "U" correctly falls to "a" (sounds like "yoo")
  return `${article} ${label}`;
}

function pluralMarks(n) {
  return `${n} mark${n === 1 ? "" : "s"}`;
}

// ── Boundary table: shows the original boundaries alongside their
// scaled equivalent for the student's own paper total ──
function toggleBoundaryTable() {
  const wrap = document.getElementById("boundary-table-wrap");
  wrap.hidden = !wrap.hidden;
  document.getElementById("boundary-toggle-chevron").classList.toggle("chevron-open", !wrap.hidden);
  renderBoundaryTable();
}

function renderBoundaryTable() {
  const wrap = document.getElementById("boundary-table-wrap");
  if (wrap.hidden) return;

  const course     = currentCourse();
  const seriesKey   = document.getElementById("series").value;
  const boundaryKey = document.getElementById("boundary").value;
  if (!course || !seriesKey) { wrap.innerHTML = ""; return; }

  const gradeOrder  = GRADE_TYPES[course.gradeType].grades;
  const series      = course.series[seriesKey];
  const isAverage   = boundaryKey === "average";
  const studentMax  = parseFloat(document.getElementById("maxmark").value);
  const hasStudentMax = Number.isFinite(studentMax) && studentMax > 0;

  let thresholds, refMax;
  if (isAverage) {
    thresholds = deriveAverageThresholds(series.paper1, series.paper2, gradeOrder);
    refMax = 100;
  } else {
    thresholds = series[boundaryKey].thresholds;
    refMax = series[boundaryKey].maxMark;
  }

  const rows = gradeOrder.map(g => {
    const lower = thresholds[g];
    if (lower === undefined) return "";
    const pct = isAverage ? lower : (lower / refMax) * 100;
    const originalText = isAverage ? "—" : `${lower} / ${refMax}`;
    const scaledText = hasStudentMax
      ? (isAverage ? `${Math.ceil(lower / 100 * studentMax)} / ${studentMax}` : `${Math.ceil(lower * (studentMax / refMax))} / ${studentMax}`)
      : "—";
    return `<tr><td class="grade-cell">${g}</td><td>${pct.toFixed(1)}%</td><td>${originalText}</td><td>${scaledText}</td></tr>`;
  }).join("");

  wrap.innerHTML = `
    <div class="boundary-table-inner">
      <table>
        <thead><tr>
          <th>Grade</th>
          <th>%</th>
          <th>${isAverage ? "Original" : "Original boundary"}</th>
          <th>Scaled to your paper</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function useCalculatedGrade(grade) {
  const course = currentCourse();
  if (isNumericGradeType(course.gradeType)) {
    document.getElementById("actual-number").value = grade; // numeric label, or "U" — both fine in a text field
  } else {
    document.getElementById("actual-select").value = grade;
  }
  calc();
}

// Clears whatever value the calculator last wrote into Actual grade.
// Called whenever the mark/total inputs become invalid or incomplete,
// so an old result can never keep showing a colour that no longer
// matches what's actually in the calculator.
function clearCalculatedGrade() {
  const course = currentCourse();
  if (!course) return;
  if (isNumericGradeType(course.gradeType)) {
    document.getElementById("actual-number").value = "";
  } else {
    document.getElementById("actual-select").value = "";
  }
  calc();
}

// Switches the Actual grade field between "type it in" and "work it
// out from a mark". The underlying value is never cleared on switch,
// so flipping back to "Enter grade" shows whatever was last
// calculated, ready to fine-tune by hand. The choice itself persists
// across visits, since which mode gets used more is still unclear.
function setActualMode(which) {
  document.querySelectorAll(".mode-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.mode === which);
  });
  localStorage.setItem("pcc-mode", which);
  updateActualFieldVisibility();
  calc();
}

// Decides which of the three possible views shows: the letter-grade
// dropdown, the numeric text entry, or the mark calculator — based on
// both the current mode and whether this course uses number or letter
// grades.
function updateActualFieldVisibility() {
  const course = currentCourse();
  const mode = document.querySelector(".mode-btn.active")?.dataset.mode || "enter";
  const numeric = course && isNumericGradeType(course.gradeType);

  document.getElementById("actual-select").hidden = !(mode === "enter" && !numeric);
  document.getElementById("actual-number").hidden = !(mode === "enter" && numeric);
  document.getElementById("calc-panel").hidden = mode !== "calc";
  document.getElementById("grade-card").hidden = mode !== "calc";
}

// Reads the student's actual points from whichever field is currently
// holding the value — the free-text number entry for numeric grade
// types, or the letter-grade dropdown otherwise. A typed number is
// used directly as points, so it doesn't have to land on a third —
// genuinely fractional entries (e.g. an average across assessments)
// are fine. Typing "U" also works, even in the numeric field.
function getActualPoints(course) {
  if (isNumericGradeType(course.gradeType)) {
    const raw = document.getElementById("actual-number").value.trim();
    if (raw === "") return null;
    if (raw.toUpperCase() === "U") return pointsForLabel(course.gradeType, "U");
    const v = parseFloat(raw);
    return Number.isFinite(v) ? v : null;
  }
  const label = document.getElementById("actual-select").value;
  return label ? pointsForLabel(course.gradeType, label) : null;
}

// ── Main comparison: target grade vs actual grade ──
function calc() {
  const course = currentCourse();
  if (!course) return;
  const gradeTypeKey = course.gradeType;
  const targetTerm = course.qualification === "alevel" ? "MEG" : "blue grade";

  const target    = document.getElementById("target").value;
  const container = document.getElementById("result");

  if (target) localStorage.setItem("pcc-blue-grade", target);
  else        localStorage.removeItem("pcc-blue-grade");

  if (!target) {
    container.innerHTML = `<div class="badge-placeholder"><span class="ph-dot"></span>Enter your ${targetTerm} to see your progress colour</div>`;
    return;
  }

  const targetPoints = pointsForLabel(gradeTypeKey, target);
  const actualPoints = getActualPoints(course);
  let badgeHTML = "";

  if (actualPoints !== null) {
    const colour = progressColour(targetPoints, actualPoints);
    const diff   = Math.round((actualPoints - targetPoints) * 100) / 100;
    badgeHTML = `
      <div class="result-badge colour-${colour}">
        <span class="swatch dot-${colour}"></span>
        <div>
          <p class="badge-title">${LABELS[colour]}</p>
          <p class="badge-subtitle">${diff === 0 ? "On target" : scoreStr(diff) + " points"}</p>
        </div>
      </div>`;
  }

  // In Calculate-from-mark mode, the grade-card above already prompts
  // for what's missing — repeating "enter an actual grade" here would
  // point at a field that's currently hidden, so stay silent instead.
  const mode = document.querySelector(".mode-btn.active")?.dataset.mode || "enter";
  if (!badgeHTML && mode === "calc") { container.innerHTML = ""; return; }

  container.innerHTML = badgeHTML || '<div class="badge-placeholder"><span class="ph-dot"></span>Enter an actual grade to see the result</div>';
}

// ── Init ──
(function init() {
  populateCourseSelect();

  const savedCourse = localStorage.getItem("pcc-course");
  if (savedCourse && COURSES[savedCourse]) {
    document.getElementById("course").value = savedCourse;
  }

  onTopCourseChange(); // builds target/actual options, series list, and restores the saved target grade via calc()

  const savedMode = localStorage.getItem("pcc-mode");
  setActualMode(savedMode === "calc" ? "calc" : "enter");
})();
