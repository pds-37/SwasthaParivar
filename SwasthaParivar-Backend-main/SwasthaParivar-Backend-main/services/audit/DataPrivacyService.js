export function createDataPrivacyService({
  SessionModel,
  ThreatScoreModel,
  SecurityEventModel,
  PromptLogModel,
  ReportModel,
  UserModel,
  auditLoggerServiceInstance,
  loggerInstance
}) {
  return {
    /**
     * Completely purges a user's footprint from the system (Right to be Forgotten).
     * Note: PHI records and Audit Logs are anonymized rather than deleted to preserve cryptographic chains and statistical integrity.
     */
    async purgeUserData(userId) {
      loggerInstance.info({ msg: "Starting user data purge", userId });

    try {
      // 1. Terminate all active sessions
      await SessionModel.deleteMany({ userId });

      // 2. Anonymize Tamper-Evident Audit Logs
      await auditLoggerServiceInstance.anonymizeUserLogs(userId);

      // 3. Delete / Anonymize Threat & Security Data
      await ThreatScoreModel.deleteOne({ userId });
      
      // Anonymize Security Events
      await SecurityEventModel.updateMany(
        { userId },
        {
          $set: {
            userId: null,
            ipAddress: "redacted"
          }
        }
      );

      // Anonymize Prompt Logs
      await PromptLogModel.updateMany(
        { userId },
        {
          $set: {
            userId: null,
            ipAddress: "redacted"
          }
        }
      );

      // 4. Anonymize Reports (The fields are encrypted, but we remove the owner link)
      await ReportModel.updateMany(
        { ownerId: userId },
        {
          $set: { ownerId: null }
        }
      );

      // 5. Delete User Profile
      await UserModel.findByIdAndDelete(userId);

      loggerInstance.info({ msg: "User data purge completed successfully", userId });
      return true;
    } catch (error) {
      loggerInstance.error({ msg: "Failed to purge user data", userId, error: error.message });
      throw new Error("Failed to process data deletion request.");
    }
  }
  };
}
