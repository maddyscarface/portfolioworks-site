import { flags, type Env } from "../p4/flags";

/**
 * Native / vendor measurement provider CONTRACTS. All disabled. The mobile web walkthrough (photos, video and the
 * customer's tape measurements) is the baseline and always works. These adapters exist so a future native app or
 * vendor licence can plug in without changing the estimator: every value they produce must carry source, unit and
 * confidence, and is treated as unverified until staff confirm it. No AR accuracy is claimed anywhere.
 */
export type ProviderId = "arkit" | "roomplan" | "arcore" | "hover" | "cubicasa";
export type Capability = { supported: boolean; reason: string };
export type ProviderMeasurement = { field: string; value_in: number; source: `provider:${ProviderId}`; confidence: "provider_estimate"; unit: "in"; evidence_refs: string[]; fixture?: boolean; caveats: string[] };
export type ProviderSession = { provider: ProviderId; session_id: string; status: "created" | "processing" | "complete" | "failed" | "cancelled"; job_ref?: string };

export interface MeasurementProvider {
  id: ProviderId; label: string; platform: "ios-native" | "android-native" | "vendor-service";
  bestFor: string; limits: string[];
  capability(device: { platform?: string; hasLidar?: boolean; arSupported?: boolean; nativeApp?: boolean }): Capability;
  createSession(projectId: string): Promise<ProviderSession>;
  correlateJob(sessionId: string, jobRef: string): Promise<ProviderSession>;
  status(sessionId: string): Promise<ProviderSession>;
  normalize(payload: unknown): ProviderMeasurement[];
  cancel(sessionId: string): Promise<void>;
  fallback: "mobile_web_walkthrough";
}

const off = (id: ProviderId) => async (): Promise<never> => { throw new Error(`${id} provider is disabled (no native app, device validation or licence)`); };

function provider(id: ProviderId, label: string, platform: MeasurementProvider["platform"], bestFor: string, limits: string[], flagOn: boolean, needs: (d: Parameters<MeasurementProvider["capability"]>[0]) => string | null): MeasurementProvider {
  return {
    id, label, platform, bestFor, limits, fallback: "mobile_web_walkthrough",
    capability(d) {
      if (!flagOn) return { supported: false, reason: "Disabled by feature flag (pending real-device QA and licensing)" };
      const why = needs(d);
      return why ? { supported: false, reason: why } : { supported: false, reason: "No native app or vendor contract is deployed yet" };
    },
    createSession: off(id), correlateJob: off(id), status: off(id), cancel: off(id),
    normalize(payload) {
      // Contract shape only: accepts {measurements:[{field, meters|inches, refs}]} and tags every value as an unverified provider estimate.
      const arr = (payload as { measurements?: { field: string; meters?: number; inches?: number; refs?: string[] }[]; fixture?: boolean })?.measurements ?? [];
      return arr.filter((m) => typeof m.field === "string" && (typeof m.meters === "number" || typeof m.inches === "number")).map((m) => ({
        field: m.field, value_in: Math.round(((m.inches ?? (m.meters! * 39.3701)) * 100)) / 100, source: `provider:${id}` as const, confidence: "provider_estimate" as const, unit: "in" as const,
        evidence_refs: m.refs ?? [], fixture: Boolean((payload as { fixture?: boolean }).fixture), caveats: limits,
      }));
    },
  };
}

export function measurementProviders(e: Env = process.env): MeasurementProvider[] {
  const f = flags(e);
  return [
    provider("arkit", "Apple ARKit (point-to-point)", "ios-native", "Spot checks of room distances and ceiling heights on iPhone/iPad in a native app", ["Tracking drift on plain walls", "Needs good light and texture", "Not available in mobile Safari"], f.arArkit, (d) => (d.platform !== "ios" ? "iOS device required" : !d.nativeApp ? "Native PortfolioWorks app required" : null)),
    provider("roomplan", "Apple RoomPlan", "ios-native", "Interior room layouts and wall/floor areas on LiDAR devices", ["Requires LiDAR hardware", "Scans may capture residents' belongings: privacy review required before any rollout in occupied units"], f.arRoomplan, (d) => (d.platform !== "ios" ? "iOS device required" : !d.hasLidar ? "LiDAR-equipped device required" : !d.nativeApp ? "Native app required" : null)),
    provider("arcore", "Google ARCore (hit tests / anchors)", "android-native", "Spot checks on supported Android devices in a native app", ["Supported-device list only", "Glossy or low-texture surfaces and low light reduce reliability", "Scale must be confirmed"], f.arArcore, (d) => (d.platform !== "android" ? "Android device required" : !d.arSupported ? "ARCore-supported device required" : !d.nativeApp ? "Native app required" : null)),
    provider("hover", "Hover (vendor)", "vendor-service", "Exterior models for capital-improvement work (siding, roofs, facades); evaluate on samples first", ["Licence and API access required", "Field coverage for multifamily exteriors unverified until sample outputs are reviewed"], f.hover, () => "Vendor licence and sample-output review required"),
    provider("cubicasa", "CubiCasa (vendor)", "vendor-service", "Optional interior floor plans for unit rehab / turnover scoping", ["Accuracy unverified until sampled against tape measurements", "Licence required"], f.cubicasa, () => "Vendor licence required"),
  ];
}
