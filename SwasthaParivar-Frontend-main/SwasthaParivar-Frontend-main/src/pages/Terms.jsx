import React from "react";
import { FileText, Mail } from "lucide-react";
import Navigation from "../components/Navigation";
import "./Legal.css";

const Terms = () => {
  return (
    <div className="legal-page">
      <Navigation variant="public" />

      <main className="legal-main">
        <header className="legal-hero">
          <span className="legal-kicker">
            <FileText size={16} />
            Terms of Service
          </span>
          <h1 className="text-h1">The rules that govern access to SwasthaParivar and its family care tools.</h1>
          <p className="text-body-lg">
            These terms describe how users may access and use the SwasthaParivar website, account
            system, dashboards, AI tools, reminders, reports, and related health organization
            features.
          </p>
        </header>

        <article className="legal-card card">
          <div className="legal-meta">
            <span>Effective date: March 23, 2026</span>
            <span>Service: SwasthaParivar family health platform</span>
          </div>

          <section className="legal-section">
            <h2 className="text-h4">Use of the service</h2>
            <p>
              SwasthaParivar is intended to help households organize family health information,
              reminders, records, and AI-supported guidance. Users must provide accurate account
              information and may use the service only for lawful and responsible purposes.
            </p>
          </section>

          <section className="legal-section">
            <h2 className="text-h4">Health and medical disclaimer</h2>
            <p>
              SwasthaParivar is not a substitute for professional medical diagnosis, treatment, or
              emergency care. AI responses and summaries are informational support tools and should
              not be treated as a replacement for licensed medical advice.
            </p>
          </section>

          <section className="legal-section">
            <h2 className="text-h4">Account responsibilities</h2>
            <p>
              Users are responsible for maintaining the confidentiality of their login credentials
              and for activity that occurs under their accounts. Shared family data should only be
              added when the user has the authority to manage it.
            </p>
          </section>

          <section className="legal-section">
            <h2 className="text-h4">Acceptable use</h2>
            <ul>
              <li>Do not upload harmful, deceptive, or unrelated files.</li>
              <li>Do not attempt unauthorized access to the platform or other users&apos; data.</li>
              <li>Do not use the AI system for non-health abuse, spam, or malicious content.</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2 className="text-h4">Service availability</h2>
            <p>
              We aim to keep the service available and secure, but we do not guarantee uninterrupted
              operation. Features may change, pause, or improve over time as the product evolves.
            </p>
          </section>

          <section className="legal-section">
            <h2 className="text-h4">Termination</h2>
            <p>
              We may suspend or terminate access if users violate these terms, misuse the platform,
              or create security or legal risk. Users may stop using the service at any time.
            </p>
          </section>

          <section className="legal-section">
            <h2 className="text-h4">Contact</h2>
            <p>
              Questions about these terms can be sent to the SwasthaParivar team at the address
              below.
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

export default Terms;
