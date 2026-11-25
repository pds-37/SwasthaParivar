import { z } from "zod";
import { objectIdSchema } from "./commonSchemas.js";

const safeGeoString = z.string().trim().min(1).max(80);

export const healthStateIdParamSchema = z.object({
  id: objectIdSchema,
});

export const healthStateTransitionParamSchema = z.object({
  healthStateId: objectIdSchema,
});

export const capacityIdParamSchema = z.object({
  id: objectIdSchema,
});

export const interventionFeedbackSchema = z.object({
  observedSeverity: z.coerce.number().min(0).max(1),
  notes: z.string().trim().max(500).optional(),
});

export const convergenceEvaluateSchema = z.object({
  state: safeGeoString.optional(),
  district: safeGeoString.optional(),
  pincode: z.string().trim().regex(/^\d{6}$/, "Pincode must be a 6-digit postal code").optional(),
  windowHours: z.coerce.number().int().min(1).max(720).optional().default(72),
});

export const ashaSurveySchema = z.object({
  state: safeGeoString.optional(),
  district: safeGeoString.optional(),
  pincode: z.string().trim().regex(/^\d{6}$/, "Pincode must be a 6-digit postal code").optional(),
  ward: z.string().trim().max(100).optional(),
  symptoms: z.array(z.string().trim().min(1).max(60)).max(20).optional().default([]),
  householdCount: z.coerce.number().int().min(1).max(500).optional().default(1),
  positiveScreenCount: z.coerce.number().int().min(0).max(500).optional().default(0),
  notes: z.string().trim().max(500).optional().default(""),
});

export const createFacilitySchema = z.object({
  facilityId: z.string().trim().min(2).max(60),
  name: z.string().trim().min(2).max(160),
  tier: z.enum(["SubCenter", "PHC", "CHC", "DistrictHospital", "StateMedicalCollege"]).default("PHC"),
  state: safeGeoString.optional().default("Uttar Pradesh"),
  district: safeGeoString,
  pincode: z.string().trim().regex(/^\d{6}$/, "Pincode must be a 6-digit postal code"),
  contactPhone: z.string().trim().max(30).optional().default(""),
  operationalStatus: z.enum(["active", "overflow", "restricted", "emergency_surge"]).optional().default("active"),
});

export const updateCapacitySchema = z.object({
  totalBeds: z.coerce.number().int().min(0).max(10000).optional(),
  availableBeds: z.coerce.number().int().min(0).max(10000).optional(),
  icuBedsTotal: z.coerce.number().int().min(0).max(5000).optional(),
  icuBedsAvailable: z.coerce.number().int().min(0).max(5000).optional(),
  doctorsOnDuty: z.coerce.number().int().min(0).max(2000).optional(),
  nursesOnDuty: z.coerce.number().int().min(0).max(5000).optional(),
  ambulancesAvailable: z.coerce.number().int().min(0).max(500).optional(),
  diagnosticCapacityPerDay: z.coerce.number().int().min(0).max(50000).optional(),
  criticalMedicineStockIndex: z.coerce.number().min(0).max(1).optional(),
  currentPatientLoad: z.coerce.number().int().min(0).max(50000).optional(),
}).refine((val) => Object.keys(val).length > 0, "Provide at least one capacity metric to update");

export const dispatchInterventionSchema = z.object({
  healthStateId: objectIdSchema,
});
