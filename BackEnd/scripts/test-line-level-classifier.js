"use strict";

require("ts-node/register/transpile-only");

const assert = require("node:assert/strict");
const {
  deriveLineLevelEnglishDescription
} = require("../src/services/HR/lineLevel.service.ts");

const cases = [
  ["Management Committee Chair", "", "Board Committee Chairman"],
  ["", "رئيس مجلس الإدارة", "Board Committee Chairman"],
  ["Management Committee Member", "", "Board Committee Member"],
  ["", "عضو اللجنة للشؤون المالية", "Board Committee Member"],
  ["Maintenance Department Manager", "", "Department Manager"],
  ["", "رئيس القسم المالي", "Section Head"],
  ["Production Unit Supervisor", "", "Unit Supervisor"],
  ["", "منسقة خدمات الحاسوب", "Coordinator"],
  ["Operations Supervisor", "", "Supervisor"],
  ["Senior Accounting Specialist", "", "Employee"]
];

for (const [english, arabic, expected] of cases) {
  assert.equal(
    deriveLineLevelEnglishDescription(english, arabic),
    expected,
    `${english || arabic} should resolve to ${expected}`
  );
}

console.log(
  JSON.stringify({
    status: "passed",
    cases: cases.length
  })
);
