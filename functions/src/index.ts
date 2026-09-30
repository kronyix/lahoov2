import { SpeechClient } from "@google-cloud/speech";
import { GoogleGenAI, Type } from "@google/genai";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { getAuth, type DecodedIdToken } from "firebase-admin/auth";
import { applicationDefault, initializeApp } from "firebase-admin/app";
import {
  FieldValue,
  Timestamp,
  getFirestore,
  type DocumentData,
  type Query,
} from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { onRequest } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";
import { z } from "zod";

initializeApp({ credential: applicationDefault() });
setGlobalOptions({ region: "asia-south1", maxInstances: 20 });

const db = getFirestore();
const speechClient = new SpeechClient();
const app = express();

type AppRequest = Request & {
  identity?: DecodedIdToken;
  profile?: DocumentData;
};

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const corsOrigin = (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
  if (
    !origin ||
    /^https?:\/\/localhost(:\d+)?$/.test(origin) ||
    /^https?:\/\/([a-z0-9-]+\.)*(web\.app|firebaseapp\.com|replit\.dev|replit\.app)$/.test(origin)
  ) {
    callback(null, true);
    return;
  }
  callback(null, false);
};

app.disable("x-powered-by");
app.use(cors({
  origin: corsOrigin,
  methods: ["GET", "POST", "PUT", "OPTIONS"],
  allowedHeaders: ["Authorization", "Content-Type"],
  maxAge: 600,
}));
app.use(express.json({ limit: "8mb" }));

function identity(req: Request): DecodedIdToken {
  const token = (req as AppRequest).identity;
  if (!token) throw new HttpError(401, "Sign in to continue.");
  return token;
}

async function loadProfile(req: Request): Promise<DocumentData> {
  const user = identity(req);
  const snapshot = await db.collection("profiles").doc(user.uid).get();
  if (!snapshot.exists) throw new HttpError(403, "Complete account setup before continuing.");
  return snapshot.data() ?? {};
}

async function requireRole(req: Request, role: "worker" | "donor"): Promise<DocumentData> {
  const profile = await loadProfile(req);
  if (profile.role !== role) throw new HttpError(403, "This view is not available for the current account.");
  if (role === "worker" && profile.workerVerified !== true) {
    throw new HttpError(403, "A verified clinic account is required for worker operations.");
  }
  return profile;
}

async function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.header("authorization");
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Sign in to continue." });
    return;
  }
  try {
    (req as AppRequest).identity = await getAuth().verifyIdToken(header.slice(7));
    next();
  } catch {
    res.status(401).json({ error: "Your session has expired. Sign in again." });
  }
}

function asyncRoute(
  handler: (req: Request, res: Response) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    void handler(req, res).catch(next);
  };
}

function safeBody<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) throw new HttpError(400, "Check the submitted information and try again.");
  return result.data;
}

function isoDate(value: unknown): string {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return typeof value === "string" ? value : new Date(0).toISOString();
}

function serialize(value: unknown): unknown {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(serialize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, serialize(item)]),
    );
  }
  return value;
}

function docValue(snapshot: FirebaseFirestore.DocumentSnapshot): Record<string, unknown> {
  return { id: snapshot.id, ...serialize(snapshot.data() ?? {}) as Record<string, unknown> };
}

async function records(query: Query): Promise<Record<string, unknown>[]> {
  const snapshot = await query.limit(100).get();
  return snapshot.docs.map(docValue);
}

function facilityId(profile: DocumentData, userId: string): string {
  return typeof profile.facilityId === "string" && profile.facilityId
    ? profile.facilityId
    : userId;
}

const profileInput = z.object({
  role: z.enum(["worker", "donor"]),
  displayName: z.string().trim().min(2).max(100),
  city: z.string().trim().min(2).max(100),
  facilityName: z.string().trim().max(160).optional(),
  communityName: z.string().trim().max(160).optional(),
  workerInviteCode: z.string().max(100).optional(),
});
const emergencyInput = z.object({
  bloodGroup: z.string().min(2).max(12),
  units: z.number().int().min(1).max(10),
  urgency: z.enum(["critical", "urgent", "routine"]),
  clinicalSummary: z.string().trim().min(3).max(280),
  destination: z.string().trim().min(2).max(160),
});
const rerouteInput = z.object({
  destination: z.string().trim().min(2).max(160),
  reason: z.string().trim().min(2).max(280),
});
const claimInput = z.object({
  appointmentAt: z.string().datetime({ offset: true }),
  donationHub: z.string().trim().min(2).max(160),
});
const guardianInput = z.object({
  active: z.boolean(),
  radiusKm: z.number().int().min(1).max(100),
  startTime: z.string().max(10),
  endTime: z.string().max(10),
  bloodGroups: z.array(z.string().max(12)).max(8),
});
const driveInput = z.object({
  communityName: z.string().trim().min(2).max(120),
  adoptedBsu: z.string().trim().min(2).max(160),
});
const voiceInput = z.object({
  audioBase64: z.string().min(16).max(7_000_000),
  languageCode: z.enum(["en-IN", "hi-IN", "te-IN", "kn-IN", "ta-IN", "mr-IN", "bn-IN"]),
  contentType: z.enum(["audio/webm", "audio/webm;codecs=opus", "audio/wav"]),
});

app.get("/api/healthz", (_req, res) => res.json({ status: "healthy" }));
app.use("/api", (req, res, next) => {
  if (req.path === "/healthz") return next();
  return authenticate(req, res, next);
});

app.get("/api/profiles/me", asyncRoute(async (req, res) => {
  const user = identity(req);
  const snapshot = await db.collection("profiles").doc(user.uid).get();
  if (!snapshot.exists) {
    res.status(404).json({ error: "Complete account setup." });
    return;
  }
  const profile = snapshot.data() ?? {};
  res.json({
    role: profile.role,
    displayName: profile.displayName,
    city: profile.city,
    facilityName: profile.facilityName ?? null,
    communityName: profile.communityName ?? null,
    workerVerified: profile.workerVerified === true,
  });
}));

app.put("/api/profiles/me", asyncRoute(async (req, res) => {
  const user = identity(req);
  const input = safeBody(profileInput, req.body);
  const profileRef = db.collection("profiles").doc(user.uid);
  const existing = await profileRef.get();
  const previous = existing.data();
  if (previous?.role && previous.role !== input.role) {
    throw new HttpError(409, "Account type cannot be changed after setup.");
  }
  let workerVerified = previous?.workerVerified === true;
  let resolvedFacilityId = previous?.facilityId;
  if (input.role === "worker" && !workerVerified) {
    const expected = process.env.WORKER_INVITE_CODE;
    if (!expected || input.workerInviteCode !== expected) {
      throw new HttpError(403, "A valid clinic invitation is required to verify a worker account.");
    }
    workerVerified = true;
    resolvedFacilityId = `clinic_${Buffer.from(expected).toString("hex").slice(0, 20)}`;
  }
  await profileRef.set({
    role: input.role,
    displayName: input.displayName,
    city: input.city,
    facilityName: input.facilityName ?? null,
    communityName: input.communityName ?? null,
    workerVerified,
    ...(resolvedFacilityId ? { facilityId: resolvedFacilityId } : {}),
    updatedAt: FieldValue.serverTimestamp(),
    ...(existing.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
  }, { merge: true });
  res.json({
    role: input.role,
    displayName: input.displayName,
    city: input.city,
    facilityName: input.facilityName ?? null,
    communityName: input.communityName ?? null,
    workerVerified,
  });
}));

app.get("/api/dashboard", asyncRoute(async (req, res) => {
  const role = req.query.role;
  if (role !== "worker" && role !== "donor") throw new HttpError(400, "Select a valid dashboard.");
  const user = identity(req);
  const profile = await requireRole(req, role);
  const key = role === "worker" ? facilityId(profile, user.uid) : user.uid;
  const stats = (await db.collection("dashboardStats").doc(key).get()).data() ?? {};
  res.json({
    role,
    averageDispatchMinutes: Number(stats.averageDispatchMinutes ?? 0),
    activeRequests: Number(stats.activeRequests ?? 0),
    activeNodes: Number(stats.activeNodes ?? 0),
    coldChainIntegrity: Number(stats.coldChainIntegrity ?? 1),
    wastagePreventedLiters: Number(stats.wastagePreventedLiters ?? 0),
    openDeficits: Number(stats.openDeficits ?? 0),
    livesImpacted: Number(stats.livesImpacted ?? 0),
  });
}));

app.get("/api/inventory", asyncRoute(async (req, res) => {
  const user = identity(req);
  const profile = await requireRole(req, "worker");
  res.json(await records(
    db.collection("inventory").where("facilityId", "==", facilityId(profile, user.uid)),
  ));
}));

app.get("/api/inventory/:unitId", asyncRoute(async (req, res) => {
  const user = identity(req);
  const profile = await requireRole(req, "worker");
  const snapshot = await db.collection("inventory").doc(req.params.unitId).get();
  if (!snapshot.exists || snapshot.get("facilityId") !== facilityId(profile, user.uid)) {
    throw new HttpError(404, "Inventory unit not found.");
  }
  res.json(docValue(snapshot));
}));

app.post("/api/emergency-requests", asyncRoute(async (req, res) => {
  const user = identity(req);
  const profile = await requireRole(req, "worker");
  const input = safeBody(emergencyInput, req.body);
  const now = new Date();
  const record = {
    ...input,
    facilityId: facilityId(profile, user.uid),
    createdBy: user.uid,
    status: "submitted_for_coordination",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
  const created = await db.collection("emergencyRequests").add(record);
  res.status(201).json({
    ...input,
    id: created.id,
    status: "submitted_for_coordination",
    createdAt: now.toISOString(),
  });
}));

app.get("/api/shipments", asyncRoute(async (req, res) => {
  const user = identity(req);
  const profile = await requireRole(req, "worker");
  res.json(await records(
    db.collection("shipments").where("facilityId", "==", facilityId(profile, user.uid)),
  ));
}));

app.post("/api/shipments/:shipmentId/reroute", asyncRoute(async (req, res) => {
  const user = identity(req);
  const profile = await requireRole(req, "worker");
  const input = safeBody(rerouteInput, req.body);
  const shipmentRef = db.collection("shipments").doc(req.params.shipmentId);
  const snapshot = await shipmentRef.get();
  if (!snapshot.exists || snapshot.get("facilityId") !== facilityId(profile, user.uid)) {
    throw new HttpError(404, "Shipment not found.");
  }
  await shipmentRef.update({
    rerouteRequest: {
      destination: input.destination,
      reason: input.reason,
      requestedBy: user.uid,
      requestedAt: FieldValue.serverTimestamp(),
      status: "awaiting_transport_confirmation",
    },
    status: "reroute_requested",
    updatedAt: FieldValue.serverTimestamp(),
  });
  // This records a request; it does not claim that a real bus or drone has
  // accepted the new route.
  res.json({
    ...docValue(snapshot),
    destination: input.destination,
    status: "reroute_requested",
  });
}));

app.get("/api/credit-ledger", asyncRoute(async (req, res) => {
  const user = identity(req);
  const profile = await requireRole(req, "worker");
  res.json(await records(
    db.collection("creditLedger").where("facilityId", "==", facilityId(profile, user.uid)),
  ));
}));

app.post("/api/credit-ledger/:creditId/voucher", asyncRoute(async (req, res) => {
  const user = identity(req);
  const profile = await requireRole(req, "worker");
  const credit = await db.collection("creditLedger").doc(req.params.creditId).get();
  if (!credit.exists || credit.get("facilityId") !== facilityId(profile, user.uid)) {
    throw new HttpError(404, "Credit entry not found.");
  }
  const token = crypto.randomBytes(24).toString("base64url");
  const message = `Lahoo AI blood grid: a voluntary donation is needed to rebalance ${Number(credit.get("units") ?? 1)} unit(s) of ${String(credit.get("bloodGroup") ?? "blood")} for a rural clinic. Use voucher ${token} to find a verified donation hub.`;
  const deepLink = `https://wa.me/?text=${encodeURIComponent(message)}`;
  await db.collection("creditVouchers").doc(token).set({
    creditId: credit.id,
    facilityId: facilityId(profile, user.uid),
    createdBy: user.uid,
    createdAt: FieldValue.serverTimestamp(),
    expiresAt: Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
    redeemedAt: null,
  });
  res.json({ message, deepLink, referenceCode: token.slice(0, 10).toUpperCase() });
}));

app.get("/api/deficits", asyncRoute(async (req, res) => {
  await requireRole(req, "donor");
  const scope = req.query.scope;
  if (scope !== "district" && scope !== "state" && scope !== "rare") {
    throw new HttpError(400, "Select a valid deficit scope.");
  }
  const items = await records(db.collection("deficits").where("status", "==", "open"));
  res.json(items
    .filter((item) => item.scope === scope)
    .sort((a, b) => Number(a.distanceKm ?? 0) - Number(b.distanceKm ?? 0)));
}));

app.post("/api/deficits/:deficitId/claim", asyncRoute(async (req, res) => {
  const user = identity(req);
  await requireRole(req, "donor");
  const input = safeBody(claimInput, req.body);
  const appointmentTime = new Date(input.appointmentAt);
  if (!Number.isFinite(appointmentTime.getTime()) || appointmentTime <= new Date()) {
    throw new HttpError(400, "Choose a future appointment.");
  }
  const deficitRef = db.collection("deficits").doc(req.params.deficitId);
  const claimRef = db.collection("claims").doc();
  const lockedUntil = new Date(Date.now() + 12 * 60 * 60 * 1000);
  await db.runTransaction(async (tx) => {
    const snapshot = await tx.get(deficitRef);
    if (!snapshot.exists || snapshot.get("status") !== "open") {
      throw new HttpError(409, "This deficit has already been claimed.");
    }
    tx.update(deficitRef, {
      status: "claimed",
      claimedBy: user.uid,
      lockedUntil: Timestamp.fromDate(lockedUntil),
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.set(claimRef, {
      deficitId: deficitRef.id,
      donorId: user.uid,
      appointmentAt: Timestamp.fromDate(appointmentTime),
      donationHub: input.donationHub,
      status: "reserved_pending_hub_confirmation",
      createdAt: FieldValue.serverTimestamp(),
    });
  });
  res.status(201).json({
    id: claimRef.id,
    status: "reserved_pending_hub_confirmation",
    lockedUntil: lockedUntil.toISOString(),
    confirmationMessage: "Your claim is reserved for 12 hours. Confirm the appointment with the donation hub before traveling.",
  });
}));

app.get("/api/impact-timeline", asyncRoute(async (req, res) => {
  const user = identity(req);
  await requireRole(req, "donor");
  res.json(await records(
    db.collection("impactEvents").where("donorId", "==", user.uid),
  ));
}));

app.get("/api/guardian", asyncRoute(async (req, res) => {
  const user = identity(req);
  await requireRole(req, "donor");
  const snapshot = await db.collection("guardianSettings").doc(user.uid).get();
  if (!snapshot.exists) {
    res.json({ active: false, radiusKm: 15, startTime: "08:00", endTime: "22:00", bloodGroups: [] });
    return;
  }
  const data = snapshot.data() ?? {};
  res.json({
    active: data.active === true,
    radiusKm: Number(data.radiusKm ?? 15),
    startTime: String(data.startTime ?? "08:00"),
    endTime: String(data.endTime ?? "22:00"),
    bloodGroups: Array.isArray(data.bloodGroups) ? data.bloodGroups : [],
  });
}));

app.put("/api/guardian", asyncRoute(async (req, res) => {
  const user = identity(req);
  await requireRole(req, "donor");
  const input = safeBody(guardianInput, req.body);
  await db.collection("guardianSettings").doc(user.uid).set({
    ...input,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  // Only a radius and availability window are stored, never exact coordinates.
  res.json(input);
}));

app.get("/api/communities", asyncRoute(async (req, res) => {
  await requireRole(req, "donor");
  res.json(await records(db.collection("communities").where("active", "==", true)));
}));

app.post("/api/drives", asyncRoute(async (req, res) => {
  const user = identity(req);
  const profile = await requireRole(req, "donor");
  if (profile.communityAdmin !== true) {
    throw new HttpError(403, "A verified community administrator is required to launch a drive.");
  }
  const input = safeBody(driveInput, req.body);
  const createdAt = new Date();
  const created = await db.collection("communities").add({
    name: input.communityName,
    adoptedBsu: input.adoptedBsu,
    adminUid: user.uid,
    active: true,
    members: 1,
    deficitsSettled: 0,
    wastagePreventedLiters: 0,
    progressPercent: 0,
    createdAt: FieldValue.serverTimestamp(),
  });
  res.status(201).json({
    id: created.id,
    name: input.communityName,
    members: 1,
    deficitsSettled: 0,
    wastagePreventedLiters: 0,
    progressPercent: 0,
    adoptedBsu: input.adoptedBsu,
  });
}));

app.post("/api/voice-intents", asyncRoute(async (req, res) => {
  await requireRole(req, "worker");
  const input = safeBody(voiceInput, req.body);
  const audio = Buffer.from(input.audioBase64, "base64");
  if (audio.length < 12 || audio.length > 5_000_000) {
    throw new HttpError(400, "Audio must be shorter than one minute.");
  }
  const [speechResponse] = await speechClient.recognize({
    audio: { content: audio },
    config: {
      encoding: input.contentType === "audio/wav" ? "LINEAR16" : "WEBM_OPUS",
      languageCode: input.languageCode,
      enableAutomaticPunctuation: true,
      model: "latest_short",
    },
  });
  const transcript = (speechResponse.results ?? [])
    .map((result) => result.alternatives?.[0]?.transcript ?? "")
    .filter(Boolean)
    .join(" ")
    .trim();
  if (!transcript) throw new HttpError(422, "Speech could not be transcribed. Try again or enter the request as text.");

  const projectId = process.env.GCLOUD_PROJECT;
  if (!projectId) throw new HttpError(503, "Vertex AI is not configured for this Google Cloud project.");
  const genAI = new GoogleGenAI({
    vertexai: true,
    project: projectId,
    location: process.env.GOOGLE_CLOUD_LOCATION ?? "asia-south1",
  });
  const generated = await genAI.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `Extract only the requested blood logistics fields from this transcript. Do not diagnose, recommend treatment, or add facts. If a field is unclear, use an empty string for bloodGroup, 1 for units, and urgent for urgency. Always require human confirmation. Transcript: ${transcript}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          bloodGroup: { type: Type.STRING },
          units: { type: Type.INTEGER },
          urgency: { type: Type.STRING, enum: ["critical", "urgent", "routine"] },
          clinicalSummary: { type: Type.STRING },
        },
        required: ["bloodGroup", "units", "urgency", "clinicalSummary"],
      },
    },
  });
  let details: { bloodGroup: string; units: number; urgency: "critical" | "urgent" | "routine"; clinicalSummary: string };
  try {
    details = JSON.parse(generated.text ?? "{}") as typeof details;
  } catch {
    throw new HttpError(502, "The request could not be structured. Please try again or enter it manually.");
  }
  res.json({
    transcript,
    languageCode: input.languageCode,
    bloodGroup: details.bloodGroup,
    units: Number.isInteger(details.units) && details.units > 0 ? details.units : 1,
    urgency: details.urgency,
    clinicalSummary: details.clinicalSummary,
    requiresConfirmation: true,
  });
}));

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: error.message });
    return;
  }
  logger.error("Lahoo API request failed", { error: error instanceof Error ? error.message : "unknown error" });
  res.status(500).json({ error: "The request could not be completed. Try again shortly." });
});

export const api = onRequest({ cors: false, memory: "1GiB", timeoutSeconds: 60 }, app);