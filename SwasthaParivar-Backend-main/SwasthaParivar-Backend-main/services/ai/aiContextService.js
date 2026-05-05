import familyMemberService from "../member/FamilyMemberService.js";
import { logger } from "../../utils/logger.js";

class AIContextService {
  /**
   * Generates a "Health Memory" string for a family member.
   * This acts as the Shared Memory for AI agents.
   */
  async getMemberHealthContext(ownerId, memberId) {
    try {
      const result = await familyMemberService.get(ownerId, memberId);
      if (result.error || !result.data) {
        return "No specific health history available for this member.";
      }

      const m = result.data;
      const latestVitals = familyMemberService.buildSnapshotTimeline(m)[0] || {};

      const lines = [
        `Member Profile: ${m.name} (${m.age} years old, ${m.gender})`,
        `Relation: ${m.relation}`,
        m.conditions?.length ? `Known Conditions: ${m.conditions.join(", ")}` : "No known chronic conditions.",
        m.allergies?.length ? `Allergies: ${m.allergies.join(", ")}` : "No known allergies.",
        m.medications?.length ? `Current Medications: ${m.medications.join(", ")}` : "No active medications recorded.",
        m.childSensitive ? "Note: This is a child-sensitive profile." : "",
      ];

      // Add latest vital signs if available
      if (Object.keys(latestVitals).length > 1) {
        lines.push("Latest Vitals:");
        if (latestVitals.bloodPressure) lines.push(`- Blood Pressure: ${latestVitals.bloodPressure}`);
        if (latestVitals.bloodSugar) lines.push(`- Blood Sugar: ${latestVitals.bloodSugar}`);
        if (latestVitals.weight) lines.push(`- Weight: ${latestVitals.weight}kg`);
      }

      return lines.filter(Boolean).join("\n");
    } catch (error) {
      logger.error({ memberId, error: error.message }, "Error building AI context");
      return "Error retrieving member health context.";
    }
  }
}

export const aiContextService = new AIContextService();
export default aiContextService;
