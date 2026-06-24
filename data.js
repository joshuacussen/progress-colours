// ─────────────────────────────────────────────────────────────────
// GRADE TYPES
// Defines the whole-grade scale and its point value for each
// qualification style. +/- sub-grades and their thirds-based point
// values (e.g. "7+" = 7.33) are generated automatically from this —
// never hand-typed — so every course built on a grade type stays
// consistent automatically.
// ─────────────────────────────────────────────────────────────────
const GRADE_TYPES = {
  "gcse-9-1": {
    label: "GCSE (9–1)",
    grades: ["9", "8", "7", "6", "5", "4", "3", "2", "1"],
    points: { "9": 9, "8": 8, "7": 7, "6": 6, "5": 5, "4": 4, "3": 3, "2": 2, "1": 1, "U": 0 },
    hasSubGrades: true,
    targetMinimumOnly: true // Blue grade is always set as the "-" boundary
  },
  "alevel-letter": {
    label: "A-level (UCAS tariff points)",
    grades: ["A*", "A", "B", "C", "D", "E"],
    points: { "A*": 6, "A": 5, "B": 4, "C": 3, "D": 2, "E": 1, "U": 0 },
    hasSubGrades: true,
    targetMinimumOnly: false // MEG can itself be +/-, not pinned to the minimum
  }
};

// ─────────────────────────────────────────────────────────────────
// COURSES
// Each course points at a grade type and holds raw-mark thresholds
// per exam series and paper. "Average" boundary sets are never
// stored — they're always derived at runtime from paper1 + paper2,
// so there's nothing here to keep in sync by hand.
//
// thresholds: lowest mark (inclusive) that earns each grade,
// highest grade first. maxMark is this paper's total for that series.
// ─────────────────────────────────────────────────────────────────
const COURSES = {
  "ocr-j277": {
    name: "Computer Science (OCR J277)",
    qualification: "gcse",
    gradeType: "gcse-9-1",
    series: {
      "june-2019": {
        paper1: { maxMark: 80, thresholds: { 9: 69, 8: 63, 7: 57, 6: 50, 5: 43, 4: 36, 3: 28, 2: 20, 1: 12 } },
        paper2: { maxMark: 80, thresholds: { 9: 68, 8: 62, 7: 56, 6: 49, 5: 42, 4: 35, 3: 26, 2: 18, 1: 10 } }
      },
      "june-2023": {
        paper1: { maxMark: 80, thresholds: { 9: 69, 8: 63, 7: 57, 6: 50, 5: 44, 4: 37, 3: 27, 2: 17, 1: 7 } },
        paper2: { maxMark: 80, thresholds: { 9: 64, 8: 56, 7: 49, 6: 41, 5: 33, 4: 26, 3: 19, 2: 12, 1: 5 } }
      },
      "june-2024": {
        paper1: { maxMark: 80, thresholds: { 9: 65, 8: 61, 7: 58, 6: 51, 5: 44, 4: 38, 3: 27, 2: 17, 1: 7 } },
        paper2: { maxMark: 80, thresholds: { 9: 71, 8: 65, 7: 59, 6: 51, 5: 43, 4: 34, 3: 25, 2: 15, 1: 6 } }
      },
      "june-2025": {
        paper1: { maxMark: 80, thresholds: { 9: 70, 8: 65, 7: 61, 6: 54, 5: 47, 4: 41, 3: 30, 2: 20, 1: 10 } },
        paper2: { maxMark: 80, thresholds: { 9: 71, 8: 67, 7: 62, 6: 54, 5: 46, 4: 37, 3: 28, 2: 19, 1: 10 } }
      }
    }
  },

  // OCR H446 A-level Computer Science. Both papers are 140 marks each
  // (Computer systems / Algorithms and programming). "Average" rows
  // from the board's own boundary sheet are never stored — they're
  // derived automatically from paper1 + paper2, same as for GCSE.
  "ocr-h446": {
    name: "Computer Science (OCR H446)",
    qualification: "alevel",
    gradeType: "alevel-letter",
    series: {
      "june-2019": {
        paper1: { maxMark: 140, thresholds: { "A*": 108, "A": 94, "B": 79, "C": 65, "D": 51, "E": 37 } },
        paper2: { maxMark: 140, thresholds: { "A*": 114, "A": 101, "B": 86, "C": 69, "D": 53, "E": 37 } }
      },
      "june-2023": {
        paper1: { maxMark: 140, thresholds: { "A*": 103, "A": 91, "B": 75, "C": 60, "D": 45, "E": 30 } },
        paper2: { maxMark: 140, thresholds: { "A*": 120, "A": 105, "B": 88, "C": 69, "D": 51, "E": 33 } }
      },
      "june-2025": {
        paper1: { maxMark: 140, thresholds: { "A*": 112, "A": 99, "B": 84, "C": 69, "D": 54, "E": 40 } },
        paper2: { maxMark: 140, thresholds: { "A*": 116, "A": 101, "B": 85, "C": 70, "D": 54, "E": 39 } }
      }

      // "Y12 Practice 2024" intentionally omitted: only an Average
      // boundary was supplied (no paper1/paper2 to derive it from),
      // and this practice paper's own total mark wasn't given. Add it
      // here once both are known — same shape as the series above,
      // or as a standalone average set if there's genuinely no split paper.
    }
  }
};
