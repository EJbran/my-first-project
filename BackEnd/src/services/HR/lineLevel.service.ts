export const LINE_LEVEL_ENGLISH_DESCRIPTIONS = {
  chairman: "Board Committee Chairman",
  committeeMember: "Board Committee Member",
  manager: "Department Manager",
  sectionHead: "Section Head",
  unitSupervisor: "Unit Supervisor",
  coordinator: "Coordinator",
  supervisor: "Supervisor",
  employee: "Employee"
} as const;

export type LineLevelEnglishDescription =
  (typeof LINE_LEVEL_ENGLISH_DESCRIPTIONS)[keyof typeof LINE_LEVEL_ENGLISH_DESCRIPTIONS];

type NormalizedJobTitle = {
  english: string;
  arabic: string;
  arabicWords: Set<string>;
};

const ENGLISH_WORD_PATTERNS = {
  chairman: /(^|\s)chairman(?=\s|$)/,
  chair: /(^|\s)chair(?=\s|$)/,
  manager: /(^|\s)manager(?=\s|$)/,
  coordinator: /(^|\s)coordinator(?=\s|$)/,
  supervisor: /(^|\s)supervisor(?=\s|$)/
} as const;

const normalizeEnglish = (value: unknown): string =>
  String(value ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");

const normalizeArabic = (value: unknown): string =>
  String(value ?? "")
    .normalize("NFKC")
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
    .replace(/\u0640/g, "")
    .replace(/[\u0623\u0625\u0622\u0671]/g, "\u0627")
    .replace(/[\u0649\u06CC]/g, "\u064A")
    .replace(/\u0624/g, "\u0648")
    .replace(/\u0626/g, "\u064A")
    .replace(/\u0629/g, "\u0647")
    .replace(/\u06A9/g, "\u0643")
    .replace(/[^\u0600-\u06FF0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");

const normalizeJobTitle = (
  jobNameEnglish: unknown,
  jobNameArabic: unknown
): NormalizedJobTitle => {
  const arabic = normalizeArabic(jobNameArabic);
  return {
    english: normalizeEnglish(jobNameEnglish),
    arabic,
    arabicWords: new Set(arabic.split(" ").filter(Boolean))
  };
};

const includesEnglishPhrase = (text: string, phrase: string): boolean =>
  ` ${text} `.includes(` ${normalizeEnglish(phrase)} `);

const includesArabicPhrase = (text: string, phrase: string): boolean => {
  const normalizedPhrase = normalizeArabic(phrase);
  return normalizedPhrase.length > 0
    && ` ${text} `.includes(` ${normalizedPhrase} `);
};

const includesArabicWord = (
  words: Set<string>,
  ...candidates: string[]
): boolean => candidates.some((candidate) => words.has(normalizeArabic(candidate)));

/**
 * Derives the organizational line level from the official bilingual job title.
 * The first matching rule wins, so specific leadership titles are checked before
 * their more general terms (for example, Unit Supervisor before Supervisor).
 */
export const deriveLineLevelEnglishDescription = (
  jobNameEnglish: unknown,
  jobNameArabic: unknown
): LineLevelEnglishDescription => {
  const title = normalizeJobTitle(jobNameEnglish, jobNameArabic);

  if (
    ENGLISH_WORD_PATTERNS.chairman.test(title.english)
    || (
      ENGLISH_WORD_PATTERNS.chair.test(title.english)
      && (title.english.includes("committee") || title.english.includes("board"))
    )
    || includesArabicPhrase(title.arabic, "\u0631\u0626\u064A\u0633 \u0644\u062C\u0646\u0629")
    || includesArabicPhrase(title.arabic, "\u0631\u0626\u064A\u0633 \u0627\u0644\u0644\u062C\u0646\u0629")
    || includesArabicPhrase(
      title.arabic,
      "\u0631\u0626\u064A\u0633 \u0645\u062C\u0644\u0633 \u0627\u0644\u0625\u062F\u0627\u0631\u0629"
    )
  ) {
    return LINE_LEVEL_ENGLISH_DESCRIPTIONS.chairman;
  }

  if (
    (title.english.includes("committee") && title.english.includes("member"))
    || includesArabicPhrase(title.arabic, "\u0639\u0636\u0648 \u0644\u062C\u0646\u0629")
    || includesArabicPhrase(title.arabic, "\u0639\u0636\u0648 \u0627\u0644\u0644\u062C\u0646\u0629")
  ) {
    return LINE_LEVEL_ENGLISH_DESCRIPTIONS.committeeMember;
  }

  if (
    ENGLISH_WORD_PATTERNS.manager.test(title.english)
    || includesArabicWord(
      title.arabicWords,
      "\u0645\u062F\u064A\u0631",
      "\u0645\u062F\u064A\u0631\u0629"
    )
  ) {
    return LINE_LEVEL_ENGLISH_DESCRIPTIONS.manager;
  }

  if (
    includesEnglishPhrase(title.english, "section head")
    || (title.english.includes("head of") && title.english.includes("section"))
    || includesArabicPhrase(title.arabic, "\u0631\u0626\u064A\u0633 \u0642\u0633\u0645")
    || includesArabicPhrase(title.arabic, "\u0631\u0626\u064A\u0633 \u0627\u0644\u0642\u0633\u0645")
  ) {
    return LINE_LEVEL_ENGLISH_DESCRIPTIONS.sectionHead;
  }

  if (
    includesEnglishPhrase(title.english, "unit supervisor")
    || (title.english.includes("supervisor of") && title.english.includes("unit"))
    || includesArabicPhrase(title.arabic, "\u0645\u0634\u0631\u0641 \u0648\u062D\u062F\u0629")
    || includesArabicPhrase(title.arabic, "\u0645\u0634\u0631\u0641 \u0627\u0644\u0648\u062D\u062F\u0629")
  ) {
    return LINE_LEVEL_ENGLISH_DESCRIPTIONS.unitSupervisor;
  }

  if (
    ENGLISH_WORD_PATTERNS.coordinator.test(title.english)
    || includesArabicWord(
      title.arabicWords,
      "\u0645\u0646\u0633\u0642",
      "\u0645\u0646\u0633\u0642\u0629"
    )
  ) {
    return LINE_LEVEL_ENGLISH_DESCRIPTIONS.coordinator;
  }

  if (
    ENGLISH_WORD_PATTERNS.supervisor.test(title.english)
    || includesArabicWord(
      title.arabicWords,
      "\u0645\u0631\u0627\u0642\u0628",
      "\u0645\u0634\u0631\u0641",
      "\u0645\u0634\u0631\u0641\u0629"
    )
  ) {
    return LINE_LEVEL_ENGLISH_DESCRIPTIONS.supervisor;
  }

  return LINE_LEVEL_ENGLISH_DESCRIPTIONS.employee;
};
