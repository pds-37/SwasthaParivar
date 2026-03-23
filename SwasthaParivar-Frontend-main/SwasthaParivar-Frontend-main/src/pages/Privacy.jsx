import React from "react";
import { Mail, ShieldCheck } from "lucide-react";
import Navigation from "../components/Navigation";
import "./Legal.css";

const Privacy = () => {
  return (
    <div className="legal-page">
      <Navigation variant="public" />

      <main className="legal-main">
        <header className="legal-hero">
          <span className="legal-kicker">
            <ShieldCheck size={16} />
            Privacy Policy
          </span>
          <h1 className="text-h1">How SwasthaParivar collects, uses, and protects family health data.</h1>
          <p className="text-body-lg">
            This privacy policy explains what information we collect, how it is used inside the
            SwasthaParivar family care platform, and the controls available to users.
          </p>
        </header>

        <article className="legal-card card">
          <div className="legal-meta">
            <span>Effective date: March 23, 2026</span>
            <span>Applies to: Website, dashboard, reminders, reports, and AI features</span>
          </div>

          <section className="legal-section">
            <h2 className="text-h4">Information we collect</h2>
            <p>
              We may collect account information such as name, email address, and profile details,
              along with family member information, reminders, uploaded reports, health snapshots,
              and AI chat inputs that you choose to provide.
            </p>
          </section>

          <section className="legal-section">
            <h2 className="text-h4">How we use your information</h2>
            <p>
              SwasthaParivar uses submitted data to provide family health organization features
              such as reminders, report summaries, household dashboards, and personalized care
              guidance. Data may also be used to improve reliability, security, and user support.
            </p>
          </section>

          <section className="legal-section">
            <h2 className="text-h4">AI and uploaded health reports</h2>
            <p>
              If you upload reports or ask AI care questions, the content may be processed by
              integrated AI services to classify reports, summarize medical details, and generate
              health-related responses. Users should avoid uploading irrelevant personal documents.
            </p>
          </section>

          <section className="legal-section">
            <h2 className="text-h4">Data sharing and disclosure</h2>
            <p>
              We do not sell personal data. Information may be shared with infrastructure and
              platform providers only as necessary to operate features such as authentication,
              secure hosting, push notifications, storage, and error monitoring.
            </p>
          </section>

          <section className="legal-section">
            <h2 className="text-h4">Security and retention</h2>
            <p>
              We use authentication controls, transport encryption, role-based access, and logging
              to protect household data. Information is retained only as long as needed to operate
              the service, comply with law, or support account recovery and audit needs.
            </p>
          </section>

          <section className="legal-section">
            <h2 className="text-h4">Your choices</h2>
            <ul>
              <li>You can update profile and member information inside the app.</li>
              <li>You can export certain account data where supported.</li>
              <li>You can request account deletion through the account settings area.</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2 className="text-h4">Contact</h2>
            <p>
              If you have privacy questions, please contact the SwasthaParivar team using the email
              address below.
            </p>
            <a className="legal-contact" href="mailto:official.priyanshu.37@gmail.com">
              <Mail size={16} />
              official.priyanshu.37@gmail.com
            </a>
          </section>
        </article>
      </main>
    </div>
  );
};

export default Privacy;
