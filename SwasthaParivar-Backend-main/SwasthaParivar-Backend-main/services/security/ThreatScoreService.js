export function createThreatScoreService({ ThreatScoreModel, SessionModel, securityConfig, loggerInstance }) {
  const applyDecay = (threatScore) => {
    const hoursSinceDecay = (Date.now() - threatScore.lastDecayAt.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceDecay >= 24) {
      // Exponential decay: score halves every 24 hours
      const intervals = Math.floor(hoursSinceDecay / 24);
      for (let i = 0; i < intervals; i++) {
        threatScore.currentScore = Math.floor(threatScore.currentScore / 2);
      }
      threatScore.lastDecayAt = new Date();
    }
  };

  const evaluateThresholds = async (threatScore) => {
    const score = threatScore.currentScore;

    if (score >= securityConfig.threatThresholds.autoSuspendThreshold) {
      loggerInstance.warn({ userId: threatScore.userId, score }, "User reached autoSuspendThreshold, revoking all sessions.");
      await SessionModel.updateMany({ userId: threatScore.userId, revokedAt: null }, { $set: { revokedAt: new Date() } });
      // In a full implementation, you might set a User flag `suspended: true` here.
    } else if (score >= securityConfig.threatThresholds.stepUpAuthThreshold) {
      loggerInstance.info({ userId: threatScore.userId, score }, "User reached stepUpAuthThreshold.");
      // This is a flag that can be checked in middleware for requiring MFA or re-auth.
    }
  };

  return {
    async applyScoreDelta(userId, delta, reason) {
    if (!userId || delta <= 0) return;

    let threatScore = await ThreatScoreModel.findOne({ userId });

    if (!threatScore) {
      threatScore = new ThreatScoreModel({ userId, currentScore: 0 });
    } else {
      applyDecay(threatScore);
    }

    threatScore.currentScore = Math.min(100, threatScore.currentScore + delta);
    threatScore.history.push({ scoreDelta: delta, reason });
    
    // Keep history bounded to last 50 events to prevent massive documents
    if (threatScore.history.length > 50) {
      threatScore.history.shift();
    }

    await threatScore.save();

    await evaluateThresholds(threatScore);
  }
  };
}
