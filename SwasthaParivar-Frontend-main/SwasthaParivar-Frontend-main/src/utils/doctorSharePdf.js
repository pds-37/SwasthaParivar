import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const formatDateTime = (value) =>
  new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

const buildRecordsRows = (records = []) =>
  records.slice(0, 12).map((record) => [
    formatDateTime(record.date),
    record.bloodPressure || "-",
    record.heartRate ?? "-",
    record.bloodSugar ?? "-",
    record.weight ?? "-",
    record.sleep ?? "-",
    record.steps ?? "-",
  ]);

const buildReminderRows = (reminders = []) =>
  reminders.slice(0, 10).map((reminder) => [
    reminder.title,
    reminder.category || "custom",
    reminder.frequency || "once",
    reminder.nextRunAt ? formatDateTime(reminder.nextRunAt) : "-",
  ]);

const buildInsightRows = (insights = []) =>
  insights.slice(0, 6).map((insight) => [
    insight.symptoms?.join(", ") || "AI insight",
    insight.adviceSummary || "",
  ]);

const buildListRows = (items = []) =>
  items.length ? items.map((item) => [item]) : [["None recorded"]];

const addSectionTitle = (doc, title, y) => {
  doc.setFontSize(13);
  doc.text(title, 40, y);
  return y + 16;
};

export function exportDoctorSharePdf({
  member,
  records = [],
  reminders = [],
  insights = [],
}) {
  const doc = new jsPDF({
    unit: "pt",
    format: "a4",
  });

  const memberName = member?.name || "Family member";
  const fileName = `${memberName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-health-summary.pdf`;
  let currentY = 52;

  doc.setFontSize(22);
  doc.text("SwasthaParivar Doctor Share Summary", 40, currentY);
  currentY += 22;

  doc.setFontSize(10);
  doc.text(`Generated on ${formatDateTime(new Date())}`, 40, currentY);
  currentY += 26;

  doc.setFontSize(13);
  doc.text("Patient profile", 40, currentY);
  currentY += 16;

  doc.setFontSize(11);
  [
    `Name: ${memberName}`,
    `Relation: ${member?.relation || "Family member"}`,
    `Age: ${member?.age || "Not added"}`,
    `Gender: ${member?.gender || "Not added"}`,
    `Conditions: ${member?.conditions?.join(", ") || "None recorded"}`,
    `Medications: ${member?.medications?.join(", ") || "None recorded"}`,
    `Allergies: ${member?.allergies?.join(", ") || "None recorded"}`,
  ].forEach((line) => {
    doc.text(line, 40, currentY);
    currentY += 14;
  });

  currentY += 12;

  autoTable(doc, {
    startY: currentY,
    head: [["Recorded at", "BP", "HR", "Sugar", "Weight", "Sleep", "Steps"]],
    body: buildRecordsRows(records),
    theme: "grid",
    headStyles: { fillColor: [20, 74, 87] },
    styles: { fontSize: 9 },
    didDrawPage: (data) => {
      currentY = data.cursor.y + 18;
    },
  });

  autoTable(doc, {
    startY: currentY,
    head: [["Reminder", "Type", "Frequency", "Next run"]],
    body: buildReminderRows(reminders),
    theme: "grid",
    headStyles: { fillColor: [29, 92, 102] },
    styles: { fontSize: 9 },
    didDrawPage: (data) => {
      currentY = data.cursor.y + 18;
    },
  });

  autoTable(doc, {
    startY: currentY,
    head: [["Insight", "Summary"]],
    body: buildInsightRows(insights),
    theme: "grid",
    headStyles: { fillColor: [41, 108, 118] },
    styles: { fontSize: 9 },
  });

  doc.save(fileName);
}

export function exportAiCarePacketPdf({
  member,
  contextLabel = "Family member",
  userMessage = "",
  aiReply = "",
  triageSummary = {},
}) {
  const doc = new jsPDF({
    unit: "pt",
    format: "a4",
  });
  const memberName = member?.name || contextLabel || "Family member";
  const fileName = `${memberName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-ai-care-packet.pdf`;
  let currentY = 52;

  doc.setFontSize(22);
  doc.text("SwasthaParivar AI Care Packet", 40, currentY);
  currentY += 22;

  doc.setFontSize(10);
  doc.text(`Generated on ${formatDateTime(new Date())}`, 40, currentY);
  currentY += 28;

  currentY = addSectionTitle(doc, "Patient profile", currentY);
  doc.setFontSize(11);
  [
    `Name/context: ${memberName}`,
    `Age: ${member?.age || "Not added"}`,
    `Gender: ${member?.gender || "Not added"}`,
    `Conditions: ${member?.conditions?.join(", ") || "None recorded"}`,
    `Medications: ${member?.medications?.join(", ") || "None recorded"}`,
    `Allergies: ${member?.allergies?.join(", ") || "None recorded"}`,
  ].forEach((line) => {
    doc.text(line, 40, currentY);
    currentY += 14;
  });
  currentY += 10;

  autoTable(doc, {
    startY: currentY,
    head: [["Care routing", "Recommended action"]],
    body: [[triageSummary.label || "Contextual triage", triageSummary.action || "Review with a clinician if symptoms persist or worsen."]],
    theme: "grid",
    headStyles: { fillColor: [20, 74, 87] },
    styles: { fontSize: 9, cellPadding: 6 },
    didDrawPage: (data) => {
      currentY = data.cursor.y + 18;
    },
  });

  autoTable(doc, {
    startY: currentY,
    head: [["User concern"]],
    body: [[userMessage || "Not recorded"]],
    theme: "grid",
    headStyles: { fillColor: [29, 92, 102] },
    styles: { fontSize: 9, cellPadding: 6 },
    didDrawPage: (data) => {
      currentY = data.cursor.y + 18;
    },
  });

  autoTable(doc, {
    startY: currentY,
    head: [["Context checked"]],
    body: buildListRows(triageSummary.contextSignals || []),
    theme: "grid",
    headStyles: { fillColor: [41, 108, 118] },
    styles: { fontSize: 9, cellPadding: 6 },
    didDrawPage: (data) => {
      currentY = data.cursor.y + 18;
    },
  });

  autoTable(doc, {
    startY: currentY,
    head: [["Missing context to confirm"]],
    body: buildListRows(triageSummary.profileGaps || []),
    theme: "grid",
    headStyles: { fillColor: [82, 112, 122] },
    styles: { fontSize: 9, cellPadding: 6 },
    didDrawPage: (data) => {
      currentY = data.cursor.y + 18;
    },
  });

  autoTable(doc, {
    startY: currentY,
    head: [["Doctor-ready notes"]],
    body: buildListRows(triageSummary.doctorPacket || []),
    theme: "grid",
    headStyles: { fillColor: [121, 85, 72] },
    styles: { fontSize: 9, cellPadding: 6 },
    didDrawPage: (data) => {
      currentY = data.cursor.y + 18;
    },
  });

  autoTable(doc, {
    startY: currentY,
    head: [["Trend flags"]],
    body: buildListRows(triageSummary.trendFlags || []),
    theme: "grid",
    headStyles: { fillColor: [93, 64, 55] },
    styles: { fontSize: 9, cellPadding: 6 },
    didDrawPage: (data) => {
      currentY = data.cursor.y + 18;
    },
  });

  autoTable(doc, {
    startY: currentY,
    head: [["Reference", "Source"]],
    body: Array.isArray(triageSummary.sourceReferences) && triageSummary.sourceReferences.length
      ? triageSummary.sourceReferences.map((ref) => [
          ref.title || "Reference",
          [ref.source, ref.url].filter(Boolean).join(" - "),
        ])
      : [["None recorded", ""]],
    theme: "grid",
    headStyles: { fillColor: [84, 110, 122] },
    styles: { fontSize: 8, cellPadding: 6 },
    didDrawPage: (data) => {
      currentY = data.cursor.y + 18;
    },
  });

  autoTable(doc, {
    startY: currentY,
    head: [["AI guidance excerpt"]],
    body: [[String(aiReply || "Not recorded").slice(0, 1200)]],
    theme: "grid",
    headStyles: { fillColor: [96, 125, 139] },
    styles: { fontSize: 9, cellPadding: 6 },
  });

  doc.save(fileName);
}

export default exportDoctorSharePdf;
