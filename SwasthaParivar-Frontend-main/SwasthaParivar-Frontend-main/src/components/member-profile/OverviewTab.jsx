import React from "react";

const OverviewTab = ({ member, insights = [] }) => (
  <div className="member-profile__overview">
    <article className="card member-profile__panel">
      <h3 className="text-h4">Profile summary</h3>
      <p className="text-body-sm">
        {member.relation || "Family member"} | {member.age || "Age not added"} years | {member.gender}
      </p>
    </article>

    <article className="card member-profile__panel">
      <h3 className="text-h4">Conditions</h3>
      <div className="member-profile__pill-row">
        {(member.conditions?.length ? member.conditions : ["No active conditions saved"]).map((item) => (
          <span key={item} className="badge badge--primary">
            {item}
          </span>
        ))}
      </div>
    </article>

    <article className="card member-profile__panel">
      <h3 className="text-h4">Allergies</h3>
      <div className="member-profile__pill-row">
        {(member.allergies?.length ? member.allergies : ["No allergies saved"]).map((item) => (
          <span key={item} className="badge badge--warning">
            {item}
          </span>
        ))}
      </div>
    </article>

    <article className="card member-profile__panel">
      <h3 className="text-h4">AI insights</h3>
      {insights.length ? (
        <div className="member-profile__insight-list">
          {insights.slice(0, 3).map((insight) => (
            <article key={insight._id || insight.id} className="member-profile__insight-item">
              <strong>{insight.symptoms?.join(", ") || "AI conversation insight"}</strong>
              <p>{insight.adviceSummary}</p>
              {insight.remedies?.length ? (
                <div className="member-profile__pill-row">
                  {insight.remedies.map((item) => (
                    <span key={item} className="badge badge--success">
                      {item}
                    </span>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <p className="text-body-sm">AI conversations for this member will surface here as structured care insights.</p>
      )}
    </article>
  </div>
);

export default OverviewTab;
