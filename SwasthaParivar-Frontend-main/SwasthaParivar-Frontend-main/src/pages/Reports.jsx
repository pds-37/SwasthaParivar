import React, { useMemo, useState } from "react";
import {
  Brain,
  FileImage,
  FilePlus2,
  FileText,
  LoaderCircle,
  Sparkles,
  UploadCloud,
} from "lucide-react";

import { Button, DatePicker, EmptyState, Modal, PullToRefresh, Select, Skeleton, Textarea } from "../components/ui";
import notify from "../lib/notify";
import { useReports } from "../hooks/useReports";
import { useFamilyStore } from "../store/family-store";
import { trackEvent } from "../utils/analytics";
import "./Reports.css";

const reportTypes = ["Lab report", "Prescription", "Scan", "Discharge summary", "Other"];

const inferReportTypeFromFile = (fileName = "") => {
  const normalized = fileName.toLowerCase();

  if (/(prescription|rx|medicine|medication)/.test(normalized)) return "Prescription";
  if (/(scan|xray|x-ray|mri|ct|ultrasound|sonography)/.test(normalized)) return "Scan";
  if (/(discharge|summary|hospital)/.test(normalized)) return "Discharge summary";
  if (/(lab|blood|urine|test|cbc|hba1c|lipid|thyroid)/.test(normalized)) return "Lab report";

  return reportTypes[0];
};

const UploadReportModal = ({ members, onClose, onUploaded }) => {
  const [memberId, setMemberId] = useState("");
  const [reportType, setReportType] = useState(reportTypes[0]);
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState({});

  React.useEffect(() => {
    if (members.length === 1 && members[0]?._id) {
      setMemberId(members[0]._id);
    }
  }, [members]);

  const handleFileChange = (nextFile) => {
    setFile(nextFile || null);
    setErrors((previous) => ({ ...previous, file: "" }));
    if (nextFile?.name) {
      setReportType(inferReportTypeFromFile(nextFile.name));
    }
  };

  const handleUpload = async () => {
    const nextErrors = {};
    if (!file) nextErrors.file = "Choose a report file before uploading.";
    if (!memberId) nextErrors.memberId = "Select a family member for this report.";
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("memberId", memberId);
      formData.append("reportType", reportType);
      formData.append("notes", notes);

      await onUploaded(formData);
    } catch (error) {
      const message =
        error?.data?.error?.code === "INVALID_HEALTH_REPORT"
          ? error.message || "Please upload a genuine health report."
          : error.message || "Could not process this report right now";

      setErrors((previous) => ({
        ...previous,
        file: message,
      }));
      notify.error(message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title="Upload health report"
      description="Attach a report, assign it to a member, and keep it ready for AI review whenever you need it."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleUpload} loading={uploading}>
            Upload report
          </Button>
        </>
      }
    >
      <div className="reports-upload-grid">
        <div className="reports-dropzone-wrap">
          <div
            className={`reports-dropzone ${dragOver ? "is-active" : ""} ${errors.file ? "is-error" : ""}`}
            onDragOver={(event) => {
              event.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragOver(false);
              const nextFile = event.dataTransfer.files?.[0];
              if (nextFile) handleFileChange(nextFile);
            }}
          >
            <input
              id="report-file-picker"
              type="file"
              accept=".pdf,image/*"
              onChange={(event) => handleFileChange(event.target.files?.[0] || null)}
            />
            <UploadCloud size={24} />
            <strong>{file ? file.name : "Drag and drop or choose a report"}</strong>
            <p>
              Supports PDFs and images up to 10MB. Each file is checked to confirm it looks like a genuine medical
              report before it is stored.
            </p>
            <Button as="label" htmlFor="report-file-picker" variant="secondary" size="sm">
              Choose file
            </Button>
          </div>

          {errors.file ? <span className="ui-field__error">{errors.file}</span> : null}
        </div>

        <div className="reports-upload-fields">
          <Select
            label="Family member"
            value={memberId}
            onChange={(event) => {
              setMemberId(event.target.value);
              setErrors((previous) => ({ ...previous, memberId: "" }));
            }}
            error={errors.memberId}
          >
            <option value="">Select member</option>
            {members.map((member) => (
              <option key={member._id} value={member._id}>
                {member.name}
              </option>
            ))}
          </Select>

          <Select label="Report type" value={reportType} onChange={(event) => setReportType(event.target.value)}>
            {reportTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </Select>

          <Textarea
            label="Notes"
            rows={4}
            placeholder="Optional context for the report review"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />

          {uploading ? (
            <div className="reports-processing">
              <LoaderCircle size={18} className="spin" />
              <span>Uploading report and preparing it for later AI review...</span>
            </div>
          ) : null}
        </div>
      </div>
    </Modal>
  );
};

const Reports = () => {
  const { members, selfMember, activeView, loading: membersLoading } = useFamilyStore();
  const { reports, loading: reportsLoading, mutate, uploadReport, analyzeReport } = useReports();
  const [showUpload, setShowUpload] = useState(false);
  const [memberFilter, setMemberFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [analyzingId, setAnalyzingId] = useState("");
  const loading = membersLoading || reportsLoading;
  const availableMembers = useMemo(
    () => (activeView === "self" ? (selfMember ? [selfMember] : []) : members),
    [activeView, members, selfMember]
  );

  const reportsWithMembers = useMemo(() => {
    const memberMap = new Map(members.map((member) => [member._id, member.name]));
    return reports.map((report) => ({
      ...report,
      memberName: memberMap.get(report.memberId) || "Family member",
    }));
  }, [members, reports]);
  const hasReports = reportsWithMembers.length > 0;

  const filteredReports = useMemo(
    () =>
      reportsWithMembers.filter((report) => {
        const createdAt = new Date(report.createdAt);
        const effectiveMemberFilter =
          activeView === "self" && selfMember?._id ? selfMember._id : memberFilter;

        if (effectiveMemberFilter !== "all" && report.memberId !== effectiveMemberFilter) return false;
        if (typeFilter !== "all" && report.reportType !== typeFilter) return false;
        if (startDate && createdAt < new Date(startDate)) return false;
        if (endDate && createdAt > new Date(`${endDate}T23:59`)) return false;
        return true;
      }),
    [activeView, endDate, memberFilter, reportsWithMembers, selfMember?._id, startDate, typeFilter]
  );

  React.useEffect(() => {
    if (activeView === "self" && selfMember?._id) {
      setMemberFilter(selfMember._id);
      return;
    }

    setMemberFilter("all");
  }, [activeView, selfMember?._id]);

  const handleUploaded = async (formData) => {
    await uploadReport(formData);
    setShowUpload(false);
    trackEvent("report_uploaded", {
      active_view: activeView,
    });
    notify.success("Report uploaded");
  };

  const handleAnalyzeReport = async (reportId) => {
    setAnalyzingId(reportId);

    try {
      await analyzeReport(reportId);
      trackEvent("report_ai_analysis_completed", {
        report_id: reportId,
        active_view: activeView,
      });
      notify.success("AI summary generated");
    } catch (error) {
      if (!error?.data?.upgradeRequired) {
        trackEvent("report_ai_analysis_failed", {
          report_id: reportId,
        });
        notify.error(error.message || "Could not analyze report");
      }
    } finally {
      setAnalyzingId("");
    }
  };

  return (
    <div className="reports-page">
      <PullToRefresh onRefresh={() => mutate?.()}>
        <div className="app-shell reports-shell">
          <section className="reports-hero">
            <div>
              <span className="eyebrow">
                <FileText size={16} />
                Reports & records
              </span>
              <h1 className="text-h2">Keep every family report easy to find and easy to understand.</h1>
              <p className="text-body-md">
                {activeView === "self"
                  ? "Upload and review only your own reports, summaries, and documents from Self View."
                  : "Upload reports, attach them to the right member, and review AI-generated summaries without losing the original context."}
              </p>
            </div>

            {hasReports ? (
              <Button leftIcon={<FilePlus2 size={18} />} onClick={() => setShowUpload(true)}>
                Upload report
              </Button>
            ) : null}
          </section>

          {hasReports ? (
            <section className="reports-filters card">
              <Select
                label="Member"
                value={memberFilter}
                onChange={(event) => setMemberFilter(event.target.value)}
                disabled={activeView === "self"}
              >
                <option value="all">All members</option>
                {availableMembers.map((member) => (
                  <option key={member._id} value={member._id}>
                    {member.name}
                  </option>
                ))}
              </Select>

              <Select label="Type" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
                <option value="all">All types</option>
                {reportTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </Select>

              <DatePicker
                label="From"
                value={startDate}
                max={endDate || undefined}
                onChange={(event) => setStartDate(event.target.value)}
              />

              <DatePicker
                label="To"
                value={endDate}
                min={startDate || undefined}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </section>
          ) : null}

          {loading ? (
            <div className="reports-grid">
              {[1, 2, 3].map((item) => (
                <Skeleton key={item} variant="card" />
              ))}
            </div>
          ) : !hasReports ? (
            <EmptyState
              type="reports"
              onAction={() => setShowUpload(true)}
            />
          ) : filteredReports.length === 0 ? (
            <EmptyState
              type="reports"
              heading="No matching reports"
              description="Try changing the member, type, or date range filters."
              ctaLabel={null}
            />
          ) : (
            <div className="reports-grid">
              {filteredReports.map((report) => (
                <article key={report.id} className="reports-card card card-hover">
                  <div className="reports-card__preview">
                    {report.mimeType?.startsWith("image/") ? (
                      <img src={report.signedUrl} alt={report.originalName} loading="lazy" />
                    ) : report.mimeType === "application/pdf" ? (
                      <FileText size={28} />
                    ) : (
                      <FileImage size={28} />
                    )}
                  </div>

                  <div className="reports-card__body">
                    <div className="reports-card__meta">
                      <span className="badge badge--primary">{report.reportType}</span>
                      <span>{new Date(report.createdAt).toLocaleDateString("en-IN")}</span>
                    </div>

                    <h3>{report.originalName}</h3>
                    <p>{report.memberName}</p>

                    <div className="reports-card__summary">
                      <span>
                        <Sparkles size={14} />
                        AI summary
                      </span>
                      <p>
                        {report.aiSummary ||
                          "No AI summary yet. Run AI analysis when you want a doctor-ready quick read."}
                      </p>
                    </div>

                    {report.notes ? <small>{report.notes}</small> : null}

                    <div className="reports-card__actions">
                      {!report.aiSummary ? (
                        <Button
                          variant="primary"
                          size="sm"
                          leftIcon={<Brain size={16} />}
                          loading={analyzingId === report.id}
                          onClick={() => handleAnalyzeReport(report.id)}
                        >
                          Analyze with AI
                        </Button>
                      ) : null}
                      <Button as="a" href={report.signedUrl} target="_blank" rel="noreferrer" variant="secondary" size="sm">
                        Open file
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </PullToRefresh>

      {showUpload ? <UploadReportModal members={availableMembers} onClose={() => setShowUpload(false)} onUploaded={handleUploaded} /> : null}
    </div>
  );
};

export default Reports;
