/**
 * Basic rules to return reminders for a person based on age & gender.
 * member = { _id, name, dob (ISO), gender }
 * returns array of reminders { title, description, type, frequency, options, nextRunAt, meta }
 */

export function ageFromDOB(dob) {
  if (!dob) return null;
  const b = new Date(dob);
  const diff = Date.now() - b.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

export function generateGeneralRemindersForMember(member) {
  const reminders = [];
  const age = ageFromDOB(member.dob) || 0;
  const gender = (member.gender || "").toLowerCase();

  // child 0-5
  if (age <= 5) {
    reminders.push({
      title: "Childhood Vaccination Check",
      description: "Ensure routine childhood vaccines are completed (MMR, DTP, Polio boosters).",
      type: "general",
      frequency: "once",
      options: { time: "09:00" },
      meta: { source: "age-based" },
      nextRunAt: new Date(), // adjust logic to set correct dates if you have DOB + schedule mapping
    });
  }

  // adults 30+
  if (age >= 30 && age < 50) {
    reminders.push({
      title: "Annual Health Check-up",
      description: "Complete annual physical exam, blood sugar and lipids.",
      type: "general",
      frequency: "yearly",
      options: { time: "09:00" },
      meta: { source: "age-based" },
      nextRunAt: new Date(),
    });
  }

  // 50+
  if (age >= 50) {
    reminders.push({
      title: "Colonoscopy screening (discuss with doctor)",
      description: "Discuss colon cancer screening with your physician.",
      type: "general",
      frequency: "yearly",
      options: { time: "09:00" },
      meta: { source: "age-based" },
      nextRunAt: new Date(),
    });
  }

  // women specific
  if (gender === "female" && age >= 21) {
    reminders.push({
      title: "Cervical screening (Pap smear) reminder",
      description: "Cervical screening every 3 years (or per doctor guidance).",
      type: "general",
      frequency: "yearly",
      options: { time: "09:00" },
      meta: { source: "age-based" },
      nextRunAt: new Date(),
    });
  }

  return reminders;
}
