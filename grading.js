// ─────────────────────────────────────────────────────────────────
// SUB-GRADES
// Builds the full ordered list of grades including +/- (best to
// worst) and their point values, generated from a grade type's
// whole grades — never hand-typed. The top grade has no "+", since
// nothing sits above it to be "secure" toward. Every other grade,
// including the bottom one, gets both "+" and "-", because "U" sits
// below the lowest listed grade as a universal floor — added here,
// not as part of the +/- pattern, since it has no shades of its own.
// ─────────────────────────────────────────────────────────────────
function buildSubGrades(gradeTypeKey) {
  const gradeType = GRADE_TYPES[gradeTypeKey];
  const list = [];
  gradeType.grades.forEach((g, i) => {
    const base = gradeType.points[g];
    if (gradeType.hasSubGrades) {
      if (i !== 0) list.push({ label: g + "+", points: round2(base + 1 / 3) });
      list.push({ label: g, points: base });
      list.push({ label: g + "-", points: round2(base - 1 / 3) });
    } else {
      list.push({ label: g, points: base });
    }
  });
  const uPoints = gradeType.points["U"] !== undefined ? gradeType.points["U"] : 0;
  list.push({ label: "U", points: uPoints });
  return list; // best to worst
}

function round2(n) { return Math.round(n * 100) / 100; }

// Look up a sub-grade's point value by its label, e.g. "7+" -> 7.33
function pointsForLabel(gradeTypeKey, label) {
  const found = buildSubGrades(gradeTypeKey).find(g => g.label === label);
  return found ? found.points : null;
}

// ─────────────────────────────────────────────────────────────────
// MARK -> GRADE (with quarters-based +/-)
// Given a percentage-style "score" (0-100, or raw marks against a
// reference total — the function doesn't care which, as long as
// `thresholds` and `score` use the same scale) this finds which
// grade band the score falls into, then applies a 25/50/25 split
// within that band to decide -, plain, or +.
//
// thresholds: { 9: 69, 8: 63, ... } — lowest score (inclusive) that
// earns each grade, for whichever grade labels are in use.
// maxScore: the top of the scale (used as the open end of the top band).
// Returns null if the score doesn't reach even the lowest defined
// grade — callers treat that as "U".
// ─────────────────────────────────────────────────────────────────
function evaluateScore(thresholds, maxScore, gradeOrder, score) {
  for (let i = 0; i < gradeOrder.length; i++) {
    const grade = gradeOrder[i];
    const lower = thresholds[grade];
    if (lower === undefined || score < lower) continue;

    const upper = i === 0 ? maxScore + 1 : thresholds[gradeOrder[i - 1]];
    const bandWidth = upper - lower;
    const pct = bandWidth > 0 ? (score - lower) / bandWidth : 0;

    let suffix = "";
    if (pct < 0.25) suffix = "-";
    else if (pct >= 0.75) suffix = i === 0 ? "" : "+";

    return { label: grade + suffix, grade, lower, upper, index: i };
  }
  return null; // below every defined boundary
}

function gradeFromScore(thresholds, maxScore, gradeOrder) {
  return function (score) {
    const result = evaluateScore(thresholds, maxScore, gradeOrder, score);
    return result ? result.label : "U";
  };
}

// ─────────────────────────────────────────────────────────────────
// DERIVED AVERAGE BOUNDARIES
// Builds a percentage-based threshold table from paper1 + paper2,
// grade by grade, so an "average" boundary set never has to be
// typed in or kept in sync by hand.
// ─────────────────────────────────────────────────────────────────
function deriveAverageThresholds(paper1, paper2, gradeOrder) {
  const thresholds = {};
  gradeOrder.forEach(grade => {
    const p1 = paper1.thresholds[grade];
    const p2 = paper2.thresholds[grade];
    if (p1 === undefined || p2 === undefined) return;
    const pct1 = (p1 / paper1.maxMark) * 100;
    const pct2 = (p2 / paper2.maxMark) * 100;
    thresholds[grade] = round2((pct1 + pct2) / 2);
  });
  return thresholds;
}

// ─────────────────────────────────────────────────────────────────
// Work out a grade — and how close the student is to the grade
// above and below it — from a raw mark, for a given course /
// series / boundary set ("paper1" | "paper2" | "average").
//
// "Marks above/to next" are always expressed in the student's own
// paper total, even when the boundary set being compared against
// has a different total — the scaling is undone on the way back out.
// ─────────────────────────────────────────────────────────────────
function calculateGradeDetails(course, seriesKey, boundaryKey, studentMark, studentMax) {
  const gradeType  = GRADE_TYPES[course.gradeType];
  const gradeOrder  = gradeType.grades; // top to bottom, real grades only — "U" is never in here
  const series      = course.series[seriesKey];

  let thresholds, refMax;
  if (boundaryKey === "average") {
    thresholds = deriveAverageThresholds(series.paper1, series.paper2, gradeOrder);
    refMax = 100;
  } else {
    thresholds = series[boundaryKey].thresholds;
    refMax = series[boundaryKey].maxMark;
  }

  const scaledScore = (studentMark / studentMax) * refMax;
  const scaleFactor  = studentMax / refMax; // converts a gap in the boundary's scale back to the student's own marks
  const result = evaluateScore(thresholds, refMax, gradeOrder, scaledScore);

  if (!result) {
    // Below even the lowest defined grade — "U".
    const lowestGrade = gradeOrder[gradeOrder.length - 1];
    const lowestLower = thresholds[lowestGrade];
    return {
      label: "U",
      grade: "U",
      marksAboveBoundary: null,
      marksToNextGrade: lowestLower !== undefined ? Math.ceil((lowestLower - scaledScore) * scaleFactor) : null,
      nextGrade: lowestGrade,
      thresholds, refMax, scaleFactor
    };
  }

  // marksAboveBoundary rounds down (marks already secured shouldn't be
  // overstated); marksToNextGrade rounds up (you can't partially clear
  // a threshold — real marks only come in whole numbers).
  const marksAboveBoundary = Math.floor((scaledScore - result.lower) * scaleFactor);
  const marksToNextGrade   = result.index === 0 ? null : Math.ceil((result.upper - scaledScore) * scaleFactor);
  const nextGrade           = result.index === 0 ? null : gradeOrder[result.index - 1];

  return {
    label: result.grade, // bare whole grade only — the calculator never invents a +/-
    grade: result.grade,
    marksAboveBoundary,
    marksToNextGrade,
    nextGrade,
    thresholds, refMax, scaleFactor
  };
}

// Thin wrapper for callers that only want the label.
function calculateGradeFromMark(course, seriesKey, boundaryKey, studentMark, studentMax) {
  return calculateGradeDetails(course, seriesKey, boundaryKey, studentMark, studentMax).label;
}

function round1(n) { return Math.round(n * 10) / 10; }

// ─────────────────────────────────────────────────────────────────
// PROGRESS BAND
// Compares actual points to target points using floor() of the
// difference — confirmed against real Arbor behaviour:
//   floor(diff) ==  0  -> blue
//   floor(diff) ==  1  -> green
//   floor(diff) >=  2  -> purple
//   floor(diff) == -1  -> yellow
//   floor(diff) <= -2  -> red
// ─────────────────────────────────────────────────────────────────
function progressColour(targetPoints, actualPoints) {
  const diff = round2(actualPoints - targetPoints);
  const band = Math.floor(diff + 1e-9); // tiny epsilon guards float rounding at exact boundaries
  if (band <= -2) return "red";
  if (band === -1) return "yellow";
  if (band === 0) return "blue";
  if (band === 1) return "green";
  return "purple";
}
