import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import {
  ClipboardList,
  CheckCircle,
  AlertCircle,
  Send,
  Home,
  Users,
  Thermometer,
  FileCheck2,
  Globe,
} from "lucide-react";
import "./AshaWorkerPortal.css";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const AshaWorkerPortal = () => {
  const [lang, setLang] = useState("hi"); // Default Hindi for ASHA workers
  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(true);

  // Survey Form State
  const [pincode, setPincode] = useState("201306");
  const [ward, setWard] = useState("Knowledge Park Sector 1");
  const [householdCount, setHouseholdCount] = useState(5);
  const [positiveScreenCount, setPositiveScreenCount] = useState(1);
  const [selectedSymptoms, setSelectedSymptoms] = useState(["fever"]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const t = {
    en: {
      title: "ASHA & Community Health Worker Field Portal",
      subtitle: "Task-oriented mobile interface for doorstep surveillance, surveys, and decentralized triage",
      assignedTasks: "My Assigned Field Tasks",
      noTasks: "No active field tasks assigned for this sector.",
      surveyTitle: "Doorstep Health Survey Log",
      pincodeLabel: "Area Pincode",
      wardLabel: "Ward / Village Sector",
      householdsCovered: "Households Inspected",
      symptomaticFound: "Symptomatic Individuals Identified",
      observedSymptoms: "Observed Symptoms in Households",
      notesLabel: "Field Observations / Environmental Flags",
      submitBtn: "Submit Field Survey to Intelligence Grid",
      submitting: "Submitting to Grid...",
      successMsg: "Survey logged! Ground-truth evidence submitted to Convergence Engine.",
    },
    hi: {
      title: "आशा कार्यकर्ता स्वास्थ्य निगरानी पोर्टल",
      subtitle: "घर-घर स्वास्थ्य सर्वेक्षण, लक्षण रिपोर्टिंग और त्वरित प्राथमिक उपचार",
      assignedTasks: "सौंपे गए कार्य (Assigned Tasks)",
      noTasks: "वर्तमान में इस क्षेत्र के लिए कोई लंबित कार्य नहीं है।",
      surveyTitle: "घर-घर स्वास्थ्य सर्वेक्षण दर्ज करें",
      pincodeLabel: "पिनकोड",
      wardLabel: "वार्ड / ग्रामीण क्षेत्र",
      householdsCovered: "निरीक्षण किए गए घर",
      symptomaticFound: "लक्षण वाले व्यक्तियों की संख्या",
      observedSymptoms: "घरों में पाए गए मुख्य लक्षण",
      notesLabel: "क्षेत्रीय टिप्पणी / जल एवं स्वच्छता स्थिति",
      submitBtn: "सर्वेक्षण डेटा ग्रिड में भेजें",
      submitting: "डेटा भेजा जा रहा है...",
      successMsg: "सर्वेक्षण सफलतापूर्वक दर्ज! सबूत सांख्यिकी इंजन में जुड़ गया।",
    },
  }[lang];

  const symptomOptions = [
    { id: "fever", label: lang === "hi" ? "बुखार (Fever)" : "Fever" },
    { id: "cough", label: lang === "hi" ? "खांसी / सांस फूलना (Cough / Breathlessness)" : "Cough / Breathlessness" },
    { id: "diarrhea", label: lang === "hi" ? "उल्टी / दस्त (Vomiting / Diarrhea)" : "Vomiting / Diarrhea" },
    { id: "chills", label: lang === "hi" ? "कंपकंपी / ठंड लगना (Chills)" : "Chills" },
    { id: "rash", label: lang === "hi" ? "त्वचा पर चकत्ते (Skin Rash)" : "Skin Rash" },
  ];

  const fetchTasks = useCallback(async () => {
    try {
      setLoadingTasks(true);
      const res = await axios.get(`${API_BASE}/hierarchical/asha/tasks`, {
        params: { pincode },
        withCredentials: true,
      });
      if (res.data?.success) {
        setTasks(res.data.data || []);
      }
    } catch {
      // Non-blocking fallback
    } finally {
      setLoadingTasks(false);
    }
  }, [pincode]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const toggleSymptom = (id) => {
    if (selectedSymptoms.includes(id)) {
      setSelectedSymptoms(selectedSymptoms.filter((s) => s !== id));
    } else {
      setSelectedSymptoms([...selectedSymptoms, id]);
    }
  };

  const handleSubmitSurvey = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await axios.post(
        `${API_BASE}/hierarchical/asha/survey`,
        {
          pincode,
          ward,
          symptoms: selectedSymptoms,
          householdCount: Number(householdCount),
          positiveScreenCount: Number(positiveScreenCount),
          notes,
        },
        { withCredentials: true }
      );

      if (res.data?.success) {
        toast.success(t.successMsg);
        setNotes("");
        setPositiveScreenCount(1);
        fetchTasks();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit survey");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="asha-portal-container">
      {/* Top Bar with Language Toggle */}
      <div className="asha-header">
        <div>
          <div className="asha-role-pill">
            <ClipboardList size={16} /> ASHA / Community Health Worker
          </div>
          <h1 className="asha-title">{t.title}</h1>
          <p className="asha-subtitle">{t.subtitle}</p>
        </div>

        <button
          className="btn-lang-toggle"
          onClick={() => setLang(lang === "hi" ? "en" : "hi")}
        >
          <Globe size={16} /> {lang === "hi" ? "Switch to English" : "हिंदी में बदलें"}
        </button>
      </div>

      <div className="asha-grid">
        {/* Left: Assigned Tasks */}
        <div className="asha-panel">
          <div className="asha-panel-header">
            <h2>{t.assignedTasks}</h2>
            <span className="task-count-badge">{tasks.length}</span>
          </div>

          <div className="tasks-container">
            {loadingTasks ? (
              <p className="empty-tasks">Loading tasks...</p>
            ) : tasks.length === 0 ? (
              <div className="empty-tasks">
                <CheckCircle size={32} color="#16a34a" />
                <p>{t.noTasks}</p>
              </div>
            ) : (
              tasks.map((task) => (
                <div key={task._id} className="asha-task-card">
                  <div className="task-card-top">
                    <span className={`task-badge priority-${task.priority?.toLowerCase()}`}>
                      {task.priority}
                    </span>
                    <span className="task-date">
                      {new Date(task.dispatchedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="task-card-title">{task.title}</h3>
                  <ul className="task-card-recs">
                    {(task.recommendations || []).map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                  <div className="task-status-row">
                    <span className="task-status-pill">{task.status}</span>
                    <span className="task-pincode">Pincode: {task.targetScope?.pincode}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Doorstep Field Survey Form */}
        <div className="asha-panel">
          <div className="asha-panel-header">
            <h2>{t.surveyTitle}</h2>
            <FileCheck2 size={20} color="#2563eb" />
          </div>

          <form onSubmit={handleSubmitSurvey} className="survey-form">
            <div className="form-row">
              <div className="form-group">
                <label>{t.pincodeLabel}</label>
                <input
                  type="text"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>{t.wardLabel}</label>
                <input
                  type="text"
                  value={ward}
                  onChange={(e) => setWard(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>{t.householdsCovered}</label>
                <input
                  type="number"
                  min="1"
                  value={householdCount}
                  onChange={(e) => setHouseholdCount(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>{t.symptomaticFound}</label>
                <input
                  type="number"
                  min="0"
                  value={positiveScreenCount}
                  onChange={(e) => setPositiveScreenCount(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>{t.observedSymptoms}</label>
              <div className="symptom-chips">
                {symptomOptions.map((sym) => {
                  const active = selectedSymptoms.includes(sym.id);
                  return (
                    <button
                      type="button"
                      key={sym.id}
                      className={`symptom-chip ${active ? "active" : ""}`}
                      onClick={() => toggleSymptom(sym.id)}
                    >
                      {sym.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="form-group">
              <label>{t.notesLabel}</label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={lang === "hi" ? "पानी का रंग गंदा, मच्छरों का जमाव, या अन्य टिप्पणी..." : "Turbid drinking water, mosquito breeding, or family details..."}
              />
            </div>

            <button type="submit" className="btn-submit-survey" disabled={submitting}>
              <Send size={16} /> {submitting ? t.submitting : t.submitBtn}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AshaWorkerPortal;
