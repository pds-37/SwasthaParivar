import { normalizeText, uniqueStrings } from "./shared.js";

const SAFETY_RULES = [
  {
    ingredients: ["honey"],
    status: "use_with_caution",
    when: (context) => context.flags.highSugar,
    reason: "Sweeteners can worsen sugar control in high-glucose profiles.",
    source: "Internal safety rule: sugar-sensitive household profile",
    saferSubstitute: "Skip sweetener and use plain warm water",
  },
  {
    ingredients: ["licorice", "mulethi"],
    status: "avoid",
    when: (context) => context.flags.highBp,
    reason: "Licorice may worsen blood pressure control.",
    source: "Internal safety rule: hypertension interaction",
    saferSubstitute: "Use tulsi instead of licorice",
  },
  {
    ingredients: ["salt", "rock salt"],
    status: "use_with_caution",
    when: (context) => context.flags.highBp,
    reason: "Extra salt can conflict with a blood-pressure-sensitive profile.",
    source: "Internal safety rule: blood pressure caution",
    saferSubstitute: "Use plain warm water without added salt",
  },
  {
    ingredients: ["black pepper", "long pepper", "trikatu"],
    status: "use_with_caution",
    when: (context) => context.flags.childSensitive || context.flags.pregnant,
    reason: "Strong heating spices may be too intense for child or pregnancy-sensitive profiles.",
    source: "Internal safety rule: age and pregnancy caution",
    saferSubstitute: "Reduce the spice or switch to plain ginger water",
  },
  {
    ingredients: ["ajwain"],
    status: "use_with_caution",
    when: (context) => context.flags.pregnant,
    reason: "Ajwain is not preferred without clinician advice during pregnancy.",
    source: "Internal safety rule: pregnancy caution",
    saferSubstitute: "Use coriander water instead",
  },
  {
    ingredients: ["ginger", "turmeric"],
    status: "use_with_caution",
    when: (context) => context.flags.bloodThinner,
    reason: "This ingredient may need caution when the member is on blood thinners.",
    source: "Internal safety rule: medication interaction",
    saferSubstitute: "Use a milder, non-spiced hydration option",
  },
];

function matchesIngredient(ingredient = "", candidates = []) {
  const normalized = normalizeText(ingredient);
  return candidates.some((candidate) => normalized.includes(normalizeText(candidate)));
}

function buildCheck({ ingredient, status, reason, source, saferSubstitute }) {
  return {
    ingredient,
    status,
    reason,
    source,
    saferSubstitute: saferSubstitute || "",
  };
}

export function scoreRemedySafety(context, remedy) {
  const checks = [];
  const blockedIngredients = [];
  const cautionIngredients = [];
  const saferSubstitutes = [];
  const allergies = context.allergies || [];
  const avoidedIngredients = context.avoidedIngredients || [];
  const ingredients = remedy.ingredients || [];

  ingredients.forEach((ingredient) => {
    const normalizedIngredient = normalizeText(ingredient);

    const allergyMatch = allergies.find((item) =>
      normalizedIngredient.includes(item) || item.includes(normalizedIngredient)
    );

    if (allergyMatch) {
      checks.push(buildCheck({
        ingredient,
        status: "avoid",
        reason: `Ingredient conflicts with saved allergy: ${allergyMatch}.`,
        source: "Allergy profile",
        saferSubstitute: "Choose a remedy without the allergen",
      }));
      blockedIngredients.push(ingredient);
      saferSubstitutes.push("Choose a remedy without the allergen");
      return;
    }

    const avoidedMatch = avoidedIngredients.find((item) =>
      normalizedIngredient.includes(item) || item.includes(normalizedIngredient)
    );

    if (avoidedMatch) {
      checks.push(buildCheck({
        ingredient,
        status: "use_with_caution",
        reason: `Ingredient is listed in the member's avoided ingredients: ${avoidedMatch}.`,
        source: "Baseline preferences",
        saferSubstitute: "Pick a substitute from the member preference list",
      }));
      cautionIngredients.push(ingredient);
      saferSubstitutes.push("Pick a substitute from the member preference list");
    }

    SAFETY_RULES.forEach((rule) => {
      if (matchesIngredient(ingredient, rule.ingredients) && rule.when(context)) {
        checks.push(buildCheck({
          ingredient,
          status: rule.status,
          reason: rule.reason,
          source: rule.source,
          saferSubstitute: rule.saferSubstitute,
        }));

        if (rule.status === "avoid") {
          blockedIngredients.push(ingredient);
        } else {
          cautionIngredients.push(ingredient);
        }

        if (rule.saferSubstitute) {
          saferSubstitutes.push(rule.saferSubstitute);
        }
      }
    });
  });

  const overallStatus = blockedIngredients.length > 0
    ? "avoid"
    : cautionIngredients.length > 0
      ? "use_with_caution"
      : "safe";

  const passed = [];

  if (checks.length === 0) {
    passed.push("No direct allergy, medication, blood pressure, sugar, age, or pregnancy conflicts were detected.");
  } else {
    if (!blockedIngredients.length) {
      passed.push("No hard-stop safety blockers were found in the selected ingredients.");
    }

    if (!context.flags.highBp) {
      passed.push("No blood-pressure escalation was detected in the saved profile.");
    }

    if (!context.flags.highSugar) {
      passed.push("No high-sugar caution is active from the latest saved data.");
    }
  }

  const failed = checks
    .filter((check) => check.status !== "safe")
    .map((check) => `${check.ingredient}: ${check.reason}`);

  const warnings = uniqueStrings(
    checks
      .filter((check) => check.status !== "safe")
      .map((check) => `${check.ingredient}: ${check.reason}`)
  );

  return {
    overallStatus,
    checks,
    blockedIngredients: uniqueStrings(blockedIngredients),
    cautionIngredients: uniqueStrings(cautionIngredients),
    saferSubstitutes: uniqueStrings(saferSubstitutes),
    passed,
    failed,
    warnings,
  };
}
