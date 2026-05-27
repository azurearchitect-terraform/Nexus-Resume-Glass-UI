import express from "express";
import path from "path";
import puppeteer from "puppeteer";
import bodyParser from "body-parser";
import cors from "cors";
import crypto from "crypto";
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import dotenv from "dotenv";
import { v4 as uuidv4 } from 'uuid';
import { google } from "googleapis";
import stream from "stream";
import fs from "fs";
import admin from "firebase-admin";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import * as Optimization from "./server/optimization.ts";
import { renderResumeToHTML } from "./server/resumeTemplate.ts";
import { pipelineCache } from "./server/cacheUtility";
import { calculateCost, UsageLog } from "./server/analytics";
import { runAgents } from "./server/agents";
import { generatePerRole } from "./server/roleGenerator";
import { deduplicateAndScore } from "./server/dedup";
import { saveResumeVersion } from "./server/memory";
// import { scrapeJobs } from "./server/jobScraper";

dotenv.config();

type FirebaseAppletConfig = {
  projectId?: string;
  firestoreDatabaseId?: string;
};

function toError(error: unknown) {
  return error instanceof Error ? error : new Error(String(error));
}

async function generateContentWithFallback(
  genAI: GoogleGenAI,
  modelChain: string[],
  contents: any,
  config?: any
): Promise<{ response: any; modelUsed: string }> {
  let lastError: any = null;
  for (const model of modelChain) {
    try {
      console.log(`[Gemini Fallback] Attempting generateContent with model: ${model}`);
      const response = await genAI.models.generateContent({
        model,
        contents,
        config
      });
      return { response, modelUsed: model };
    } catch (error: any) {
      lastError = error;
      const errorMsg = error?.message?.toLowerCase() || "";
      const isQuotaError = errorMsg.includes("quota") || errorMsg.includes("429") || errorMsg.includes("limit") || errorMsg.includes("exhausted");
      if (isQuotaError) {
        console.warn(`[Gemini Fallback] Quota error on model ${model}. Falling back to next model in chain...`);
        continue;
      }
      throw error;
    }
  }
  throw lastError || new Error("All models in the fallback chain failed.");
}

function normalizeFirestoreDatabaseId(firestoreDatabaseId?: string) {
  const trimmedDatabaseId = firestoreDatabaseId?.trim();
  return trimmedDatabaseId ? trimmedDatabaseId : undefined;
}

function loadFirebaseConfig(): FirebaseAppletConfig {
  const firebaseConfigPath = path.join(process.cwd(), "firebase-applet-config.json");

  try {
    if (!fs.existsSync(firebaseConfigPath)) {
      console.warn("[Server] firebase-applet-config.json not found. Firebase-backed endpoints will be unavailable.");
      return {};
    }

    return JSON.parse(fs.readFileSync(firebaseConfigPath, "utf8"));
  } catch (error) {
    console.warn("[Server] Failed to load firebase-applet-config.json. Firebase-backed endpoints will be unavailable.", error);
    return {};
  }
}

const firebaseConfig = loadFirebaseConfig();

let firebaseAdminApp: admin.app.App | null | undefined;
let firebaseAdminInitError: Error | null = null;
let db: admin.firestore.Firestore | null | undefined;
let firestoreInitError: Error | null = null;

function getFirebaseAdminApp() {
  if (firebaseAdminApp !== undefined) {
    return firebaseAdminApp;
  }

  try {
    firebaseAdminApp = admin.apps.length
      ? admin.apps[0]
      : admin.initializeApp(firebaseConfig.projectId ? { projectId: firebaseConfig.projectId } : {});
  } catch (error) {
    firebaseAdminInitError = toError(error);
    firebaseAdminApp = null;
    console.warn("[Server] Firebase Admin initialization failed. Firebase-backed endpoints will be unavailable.", firebaseAdminInitError);
  }

  return firebaseAdminApp;
}

function getFirestoreDb() {
  if (db !== undefined) {
    return db;
  }

  const firebaseApp = getFirebaseAdminApp();
  if (!firebaseApp) {
    db = null;
    return db;
  }

  const firestoreDatabaseId = normalizeFirestoreDatabaseId(firebaseConfig.firestoreDatabaseId);

  try {
    db = firestoreDatabaseId ? getFirestore(firebaseApp, firestoreDatabaseId) : getFirestore(firebaseApp);
  } catch (error) {
    if (firestoreDatabaseId) {
      console.warn("[Server] Failed to initialize Firestore with the configured database ID. Falling back to the default database.", error);
      try {
        db = getFirestore(firebaseApp);
      } catch (fallbackError) {
        firestoreInitError = toError(fallbackError);
        db = null;
      }
    } else {
      firestoreInitError = toError(error);
      db = null;
    }

    if (!db) {
      console.warn("[Server] Firestore initialization failed. Firebase-backed endpoints will be unavailable.", firestoreInitError);
    }
  }

  return db;
}

function createFirebaseUnavailableError(operation: string) {
  const reason = firestoreInitError?.message || firebaseAdminInitError?.message || "missing Firebase configuration or credentials";
  return new Error(`FIREBASE_UNAVAILABLE:${operation}:${reason}`);
}

function isFirebaseUnavailableError(error: unknown): error is Error {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.message.startsWith("FIREBASE_UNAVAILABLE:")
    || error.message.includes("Unable to detect a Project Id")
    || error.message.includes("Could not load the default credentials")
    || error.message.includes("Credential implementation provided to initializeApp()")
    || error.message.includes("The default Firebase app does not exist");
}

function getFirebaseUnavailableDetails(error?: unknown) {
  if (error instanceof Error) {
    return error.message.startsWith("FIREBASE_UNAVAILABLE:")
      ? error.message.split(":").slice(2).join(":")
      : error.message;
  }

  return firestoreInitError?.message || firebaseAdminInitError?.message || "missing Firebase configuration or credentials";
}

function requireFirestoreDb(operation: string) {
  const firestore = getFirestoreDb();
  if (!firestore) {
    throw createFirebaseUnavailableError(operation);
  }
  return firestore;
}

function sendFirebaseUnavailable(res: any, operation: string, error?: unknown) {
  return res.status(503).json({
    error: `${operation} is unavailable because Firebase Admin/Firestore is not configured for this environment.`,
    details: getFirebaseUnavailableDetails(error),
  });
}

// Helper to get API keys from Firestore securely
async function getApiKeys(idToken: string) {
    if (idToken === "SYSTEM_PIPELINE") return null;
    try {
      const firebaseApp = getFirebaseAdminApp();
      if (!firebaseApp) {
        throw createFirebaseUnavailableError("API key lookup");
      }

      const firestore = requireFirestoreDb("API key lookup");
      const decodedToken = await admin.auth(firebaseApp).verifyIdToken(idToken);
      const uid = decodedToken.uid;
      const doc = await firestore.collection("users").doc(uid).get();
      
      if (!doc.exists) {
        return null; // Return null instead of throwing
      }
      
      let data = doc.data();
      
      // FALLBACK: If current user has no key, check for a "shared" key in 'users/admin'
      if (!data || !data.encryptedApiKey) {
        console.log(`[Server] User ${uid} has no key. Checking for fallback in 'users/admin'...`);
        const adminDoc = await firestore.collection("users").doc("admin").get();
        if (adminDoc.exists) {
          data = adminDoc.data();
          console.log(`[Server] Found fallback key in 'users/admin'.`);
        }
      }

      if (!data || !data.encryptedApiKey) {
        return null; // Return null instead of throwing
      }

      // Decrypt the keys before returning
      try {
        const decrypted = decrypt(data.encryptedApiKey);
        try {
          return JSON.parse(decrypted);
        } catch (e) {
          // Fallback for older single-key format
          return { gemini: decrypted };
        }
      } catch (error) {
        const normalizedError = toError(error);
        if (normalizedError.message.includes("DECRYPTION_FAILED")) {
          console.warn(`[Server] Decryption failed for user ${uid}. Treating as no key found.`);
          return null;
        }
        throw normalizedError;
      }
    } catch (error) {
      if (isFirebaseUnavailableError(error)) {
        throw error;
      }
      console.error("Error fetching API keys:", error);
      throw new Error("UNAUTHORIZED_OR_MISSING_KEYS");
    }
}

async function getUserIdFromToken(idToken: string): Promise<string> {
    if (!idToken) return "anonymous";
    try {
      const firebaseApp = getFirebaseAdminApp();
      if (!firebaseApp) return "anonymous";
      const decodedToken = await admin.auth(firebaseApp).verifyIdToken(idToken);
      return decodedToken.uid;
    } catch (error) {
      console.error("Error verifying ID token:", error);
      return "anonymous";
    }
}

// Function to log usage to Firestore
async function logUsage(log: UsageLog) {
  const firestore = getFirestoreDb();
  if (!firestore) {
    console.warn("[Server] Skipping analytics log because Firestore is unavailable.");
    return;
  }

  try {
    await firestore.collection("analytics").add({
      ...log,
      timestamp: FieldValue.serverTimestamp()
    });
  } catch (error) {
    if (isFirebaseUnavailableError(error)) {
      console.warn("[Server] Skipping analytics log because Firestore is unavailable.", getFirebaseUnavailableDetails(error));
      return;
    }
    console.error("Error logging usage to Firestore:", error);
  }
}

// PDF Sessions storage
const pdfSessions = new Map<string, { html: string, css: string, fonts: string, title?: string, timestamp: number }>();

// Cleanup old sessions every 30 minutes
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of pdfSessions.entries()) {
    if (now - session.timestamp > 1800000) { // 30 minutes
      pdfSessions.delete(id);
    }
  }
}, 600000);

// Encryption Setup
// We use a stable key derived from GEMINI_API_KEY if ENCRYPTION_KEY is not provided.
// This prevents "bad decrypt" errors after server restarts.
const getEncryptionKey = () => {
  const envKey = process.env.ENCRYPTION_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  
  if (envKey) {
    if (envKey.length === 64) {
      console.log("[Encryption] Using ENCRYPTION_KEY from environment.");
      return envKey;
    } else {
      console.warn("[Encryption] ENCRYPTION_KEY in environment is not 64 characters. Hashing it to ensure 32-byte key.");
      return crypto.createHash('sha256').update(envKey).digest('hex');
    }
  }
  
  if (geminiKey) {
    console.log("[Encryption] Deriving ENCRYPTION_KEY from GEMINI_API_KEY.");
    return crypto.createHash('sha256').update(geminiKey).digest('hex');
  }
  
  console.warn("[Encryption] No ENCRYPTION_KEY or GEMINI_API_KEY found. Using static fallback key. WARNING: Your encrypted data will be lost if you provide an API key later.");
  return "4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b"; 
};

const ENCRYPTION_KEY = getEncryptionKey();
const IV_LENGTH = 16;

function encrypt(text: string) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text: string) {
  try {
    const textParts = text.split(':');
    if (textParts.length < 2) throw new Error("Invalid encrypted text format");
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (error: any) {
    console.error("Decryption Error:", error);
    if (error.message.includes('bad decrypt') || error.code === 'ERR_OSSL_EVP_BAD_DECRYPT') {
      throw new Error("DECRYPTION_FAILED: The encryption key has changed or the data is corrupted. Please re-save your API keys in your profile.");
    }
    throw error;
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(bodyParser.json({ limit: '50mb' }));
  app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

  // Debug: Log all incoming requests
  app.use((req, res, next) => {
    console.log(`[Server] ${req.method} ${req.url}`);
    next();
  });

  app.get("/api/health-check", (req, res) => {
    res.json({ status: "alive", timestamp: new Date().toISOString() });
  });

  app.get("/api/generate-resume-pdf", async (req, res) => {
    try {
      const html = renderResumeToHTML();
      const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      const page = await browser.newPage();
      await page.setContent(html);
      const pdf = await page.pdf({ format: 'A4', printBackground: true });
      await browser.close();

      res.contentType("application/pdf");
      res.setHeader('Content-Disposition', 'attachment; filename="resume.pdf"');
      res.send(pdf);
    } catch (error) {
      console.error(error);
      res.status(500).send("Failed to generate PDF");
    }
  });

  console.log("Environment Variables Check:");
  console.log("PUPPETEER_EXECUTABLE_PATH:", process.env.PUPPETEER_EXECUTABLE_PATH);
  console.log("HTTP_PROXY:", process.env.HTTP_PROXY);

  // Google Drive Client Setup
  const getDriveClient = (accessToken?: string) => {
    // Ensure accessToken is a valid string and not "null", "undefined", or empty
    const isValidToken = accessToken && 
                        typeof accessToken === 'string' && 
                        accessToken !== 'null' && 
                        accessToken !== 'undefined' && 
                        accessToken.trim() !== '';

    if (isValidToken) {
      const auth = new google.auth.OAuth2();
      auth.setCredentials({ access_token: accessToken });
      return google.drive({ version: 'v3', auth });
    }

    const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    const folderId = process.env.GOOGLE_SERVICE_ACCOUNT_FOLDER_ID;

    if (!serviceAccountKey) {
      console.warn("GOOGLE_SERVICE_ACCOUNT_KEY is not set. Drive fallback to Service Account will be unavailable.");
      return null;
    }

    if (folderId && (folderId.startsWith('{') || folderId.includes('service_account'))) {
      throw new Error("GOOGLE_SERVICE_ACCOUNT_FOLDER_ID appears to contain a Service Account JSON instead of a Folder ID. Please check your environment variables.");
    }
    
    let credentials;
    try {
      credentials = JSON.parse(serviceAccountKey);
    } catch (e) {
      throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY is not a valid JSON string. Ensure it is the full content of your service account key file.");
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: credentials.client_email,
        private_key: credentials.private_key,
      },
      scopes: ['https://www.googleapis.com/auth/drive'],
    });

    return google.drive({ version: 'v3', auth });
  };

  app.post("/api/save-to-drive", async (req, res) => {
    const { pdfData, fileName, versioningEnabled, accessToken, parentFolderId } = req.body;
    
    if (!pdfData || !fileName) {
      return res.status(400).json({ error: "PDF data and file name are required" });
    }

    // Escape single quotes in file name for Drive query
    const escapedFileName = fileName.replace(/'/g, "\\'");

    try {
      const drive = getDriveClient(accessToken);
      const folderId = parentFolderId || process.env.GOOGLE_SERVICE_ACCOUNT_FOLDER_ID;
      
      // Determine mimeType from fileName
      const mimeType = fileName.endsWith('.csv') ? 'text/csv' : 'application/pdf';

      // Convert base64 to stream
      const buffer = Buffer.from(pdfData, 'base64');
      const bufferStream = new stream.PassThrough();
      bufferStream.end(buffer);

      let fileId = null;
      
      if (!versioningEnabled) {
        // Search for existing file with same name
        const query = folderId 
          ? `name = '${escapedFileName}' and '${folderId}' in parents and trashed = false`
          : `name = '${escapedFileName}' and trashed = false`;

        const response = await drive.files.list({
          q: query,
          fields: 'files(id, name)',
          spaces: 'drive',
          supportsAllDrives: true,
          includeItemsFromAllDrives: true,
        });
        
        if (response.data.files && response.data.files.length > 0) {
          fileId = response.data.files[0].id;
        }
      }

      if (fileId) {
        // Update existing file
        await drive.files.update({
          fileId: fileId,
          media: {
            mimeType: mimeType,
            body: bufferStream,
          },
          supportsAllDrives: true,
        });
        res.json({ success: true, message: "File updated successfully", fileId });
      } else {
        // Create new file
        const finalFileName = versioningEnabled 
          ? `${fileName.replace(/\.(pdf|csv)$/, '')} (v${new Date().toISOString().replace(/[:.]/g, '-')})${fileName.endsWith('.csv') ? '.csv' : '.pdf'}`
          : fileName;

        const fileMetadata: any = {
          name: finalFileName,
          mimeType: mimeType,
        };

        if (folderId) {
          fileMetadata.parents = [folderId];
        }
        
        const media = {
          mimeType: mimeType,
          body: bufferStream,
        };

        const file = await drive.files.create({
          requestBody: fileMetadata,
          media: media,
          fields: 'id',
          supportsAllDrives: true,
        });
        res.json({ success: true, message: "File created successfully", fileId: file.data.id });
      }
    } catch (error: any) {
      console.error("Drive Save Error:", error.message || error);
      let errorData = null;
      if (error.response && error.response.data) {
        errorData = error.response.data;
        console.error("Drive Save Error Details:", JSON.stringify(errorData));
      }
      
      let errorMessage = "Failed to save to Google Drive";
      let statusCode = error.response?.status || 500;
      
      if (statusCode === 401) {
        errorMessage = "AUTH_EXPIRED: Your Google Drive session has expired. Please reconnect your Drive in settings.";
      } else if (statusCode === 403 && errorData?.error?.message?.includes("storage quota")) {
        errorMessage = "STORAGE_QUOTA_EXCEEDED: Service Account has no storage quota on personal drives. Please set your parent folder to a folder inside a 'Shared Drive' (created in Google Drive).";
      } else if (error.code === 404) {
        errorMessage = "Folder or File not found. Please verify your folder ID and permissions.";
      } else if (error.message && error.message.includes("invalid_grant")) {
        errorMessage = "Authentication failed. Please check your Service Account configuration.";
      } else {
        errorMessage = error.message || errorMessage;
      }

      res.status(statusCode).json({ error: errorMessage });
    }
  });

  app.get("/api/list-drive-folders", async (req, res) => {
    const accessToken = req.query.accessToken as string | undefined;
    try {
      const drive = getDriveClient(accessToken);
      if (!drive) {
        return res.status(401).json({ error: "Google Drive is not connected. Please connect via OAuth in settings." });
      }
      const response = await drive.files.list({
        // List folders that are not trashed
        q: "mimeType = 'application/vnd.google-apps.folder' and trashed = false",
        pageSize: 1000,
        fields: 'files(id, name, modifiedTime)',
        spaces: 'drive',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });

      res.json({ 
        success: true, 
        folders: response.data.files || [] 
      });
    } catch (error: any) {
      console.error("Drive Folder List Error:", error.message || error);
      
      let errorMessage = error.message || "Failed to fetch Drive folders";
      if (error.code === 401 || (error.response && error.response.status === 401)) {
        errorMessage = "AUTH_EXPIRED: Your Google Drive session has expired. Please reconnect your Drive in settings.";
      }

      res.status(error.response?.status || 500).json({ 
        success: false, 
        error: errorMessage
      });
    }
  });

  app.get("/api/list-drive-files", async (req, res) => {
    const accessToken = req.query.accessToken as string | undefined;
    try {
      const drive = getDriveClient(accessToken);
      if (!drive) {
        return res.status(401).json({ error: "Google Drive is not connected. Please connect via OAuth in settings." });
      }
      const folderId = process.env.GOOGLE_SERVICE_ACCOUNT_FOLDER_ID;
      
      const query = folderId 
        ? `'${folderId}' in parents and mimeType = 'application/pdf' and trashed = false`
        : "mimeType = 'application/pdf' and trashed = false";

      const response = await drive.files.list({
        q: query,
        pageSize: 50,
        fields: 'files(id, name, webViewLink, modifiedTime)',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });

      res.json({ 
        success: true, 
        files: response.data.files || [] 
      });
    } catch (error: any) {
      console.error("Drive List Error:", error.message || error);
      if (error.response && error.response.data) {
        console.error("Drive List Error Details:", JSON.stringify(error.response.data));
      }
      
      let errorMessage = error.message || "Failed to fetch Drive files";
      if (error.code === 401 || (error.response && error.response.status === 401)) {
        errorMessage = "AUTH_EXPIRED: Your Google Drive session has expired. Please reconnect your Drive in settings.";
      }

      res.status(error.response?.status || 500).json({ 
        success: false, 
        error: errorMessage
      });
    }
  });

  app.patch("/api/rename-drive-file", express.json(), async (req, res) => {
    const { fileId, newName, accessToken } = req.body;
    if (!fileId || !newName) {
      return res.status(400).json({ error: "Missing fileId or newName" });
    }
    try {
      const drive = getDriveClient(accessToken);
      await drive.files.update({
        fileId: fileId,
        requestBody: {
          name: newName.endsWith('.pdf') ? newName : `${newName}.pdf`
        },
        supportsAllDrives: true,
      });
      res.json({ success: true, message: "File renamed successfully" });
    } catch (error: any) {
      console.error("Drive Rename Error:", error.message || error);
      if (error.response && error.response.data) {
        console.error("Drive Rename Error Details:", JSON.stringify(error.response.data));
      }
      
      let errorMessage = error.message || "Failed to rename file";
      if (error.code === 401 || (error.response && error.response.status === 401)) {
        errorMessage = "AUTH_EXPIRED: Your Google Drive session has expired. Please reconnect your Drive in settings.";
      }
      
      res.status(error.response?.status || 500).json({ error: errorMessage });
    }
  });

  app.delete("/api/delete-drive-file", express.json(), async (req, res) => {
    const { fileId, accessToken } = req.body;
    if (!fileId) {
      return res.status(400).json({ error: "Missing fileId" });
    }
    try {
      const drive = getDriveClient(accessToken);
      await drive.files.delete({
        fileId: fileId,
        supportsAllDrives: true,
      });
      res.json({ success: true, message: "File deleted successfully" });
    } catch (error: any) {
      console.error("Drive Delete Error:", error.message || error);
      if (error.response && error.response.data) {
        console.error("Drive Delete Error Details:", JSON.stringify(error.response.data));
      }
      
      let errorMessage = error.message || "Failed to delete file";
      if (error.code === 401 || (error.response && error.response.status === 401)) {
        errorMessage = "AUTH_EXPIRED: Your Google Drive session has expired. Please reconnect your Drive in settings.";
      }
      
      res.status(error.response?.status || 500).json({ error: errorMessage });
    }
  });

  app.get("/api/test-drive", async (req, res) => {
    const accessToken = req.query.accessToken as string | undefined;
    try {
      const drive = getDriveClient(accessToken);
      const response = await drive.files.list({
        pageSize: 1,
        fields: 'files(id, name)',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });
      res.json({ 
        success: true, 
        message: accessToken 
          ? "Connection successful! Authenticated via Google OAuth." 
          : "Connection successful! Drive API is enabled and Service Account is authenticated.",
        filesFound: response.data.files?.length || 0
      });
    } catch (error: any) {
      console.error("Drive Test Error:", error);
      res.status(500).json({ 
        success: false, 
        error: error.message || "Failed to connect to Google Drive",
        details: accessToken 
          ? "Ensure your Google account has Drive API permissions and the token is valid."
          : "Ensure GOOGLE_SERVICE_ACCOUNT_KEY is correct and Drive API is enabled in Google Cloud Console."
      });
    }
  });

  // API Endpoint to encrypt API Key
  app.post("/api/encrypt-key", (req, res) => {
    const { apiKey, existingEncryptedKey } = req.body;
    if (!apiKey) {
      return res.status(400).json({ error: "API key is required" });
    }
    try {
      let keysToEncrypt = apiKey;
      
      // If we're passing a JSON string of keys and an existing encrypted key, merge them
      if (existingEncryptedKey) {
        try {
          const newKeys = JSON.parse(apiKey);
          const decryptedExisting = decrypt(existingEncryptedKey);
          let existingKeys: any = {};
          try {
            existingKeys = JSON.parse(decryptedExisting);
          } catch (e) {
            // If the existing key wasn't JSON, assume it was a Gemini key for backwards compatibility
            existingKeys = { gemini: decryptedExisting };
          }
          
          // Merge keys, keeping existing ones if the new one is empty
          const mergedKeys = {
            gemini: newKeys.gemini || existingKeys.gemini || '',
            openai: newKeys.openai || existingKeys.openai || ''
          };
          keysToEncrypt = JSON.stringify(mergedKeys);
        } catch (e) {
          // Ignore decryption errors, assume existing keys are invalid/inaccessible
        }
      }

      const encryptedKey = encrypt(keysToEncrypt);
      res.json({ encryptedKey });
    } catch (error: any) {
      console.error("Encryption Error:", error);
      res.status(500).json({ error: "Failed to encrypt API key" });
    }
  });

  // API Endpoint to decrypt API keys for frontend use
  app.post("/api/decrypt-keys", (req, res) => {
    const { encryptedKey } = req.body;
    if (!encryptedKey) {
      return res.status(400).json({ error: "Encrypted key is required" });
    }
    try {
      const decryptedString = decrypt(encryptedKey);
      let keys: any = {};
      try {
        keys = JSON.parse(decryptedString);
      } catch (e) {
        // For backwards compatibility if it was a single raw key
        keys = { gemini: decryptedString };
      }
      res.json({ keys });
    } catch (error: any) {
      console.error("Decryption Error:", error);
      res.status(500).json({ error: "Failed to decrypt API keys" });
    }
  });

  // API Endpoint to clear cache
  app.post("/api/cache/clear", (req, res) => {
    Optimization.clearCache();
    res.json({ success: true, message: "Cache cleared successfully" });
  });

  // Admin Analytics Endpoints
  app.get("/api/admin/stats", async (req, res) => {
    try {
      const firestore = requireFirestoreDb("Admin stats");
      const snapshot = await firestore.collection("analytics").get();
      const logs = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          timestamp: data.timestamp?.toDate?.()?.getTime() || data.timestamp || Date.now()
        } as UsageLog;
      });

      const totalRequests = logs.filter(l => l.endpoint === "/api/v2/optimize").length;
      const totalTokens = logs.reduce((sum, l) => sum + l.totalTokens, 0);
      const totalCost = logs.reduce((sum, l) => sum + l.cost, 0);
      const cacheHits = logs.filter(l => l.cacheHit).length;
      const cacheHitRatio = totalRequests > 0 ? (cacheHits / totalRequests) * 100 : 0;

      res.json({
        totalRequests,
        totalTokens,
        totalCost,
        cacheHitRatio
      });
    } catch (error) {
      if (isFirebaseUnavailableError(error)) {
        return sendFirebaseUnavailable(res, "Admin stats", error);
      }
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ error: "Failed to fetch admin stats" });
    }
  });

  app.get("/api/admin/usage-by-day", async (req, res) => {
    try {
      const firestore = requireFirestoreDb("Usage-by-day analytics");
      const snapshot = await firestore.collection("analytics").get();
      const logs = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          timestamp: data.timestamp?.toDate?.()?.getTime() || data.timestamp || Date.now()
        } as UsageLog;
      });

      const dailyData: Record<string, { tokens: number, cost: number }> = {};
      
      logs.forEach(log => {
        const date = new Date(log.timestamp).toISOString().split('T')[0];
        if (!dailyData[date]) {
          dailyData[date] = { tokens: 0, cost: 0 };
        }
        dailyData[date].tokens += log.totalTokens;
        dailyData[date].cost += log.cost;
      });

      const result = Object.entries(dailyData).map(([date, data]) => ({
        date,
        ...data
      })).sort((a, b) => a.date.localeCompare(b.date));

      res.json(result);
    } catch (error) {
      if (isFirebaseUnavailableError(error)) {
        return sendFirebaseUnavailable(res, "Usage-by-day analytics", error);
      }
      console.error("Error fetching usage by day:", error);
      res.status(500).json({ error: "Failed to fetch usage by day" });
    }
  });

  app.get("/api/admin/model-usage", async (req, res) => {
    try {
      const firestore = requireFirestoreDb("Model-usage analytics");
      const snapshot = await firestore.collection("analytics").get();
      const logs = snapshot.docs.map(doc => doc.data() as UsageLog);

      const modelData: Record<string, number> = {};
      
      logs.forEach(log => {
        const model = log.cacheHit ? "Cache" : log.model;
        modelData[model] = (modelData[model] || 0) + 1;
      });

      const result = Object.entries(modelData).map(([name, value]) => ({
        name,
        value
      }));

      res.json(result);
    } catch (error) {
      if (isFirebaseUnavailableError(error)) {
        return sendFirebaseUnavailable(res, "Model-usage analytics", error);
      }
      console.error("Error fetching model usage:", error);
      res.status(500).json({ error: "Failed to fetch model usage" });
    }
  });

  // Helper to seed usage logs for a user if they have none
  async function seedUserUsageHistory(firestore: any, uid: string) {
    console.log(`[Server] Seeding 3 months of usage history for user ${uid}...`);
    const oneDay = 24 * 60 * 60 * 1000;
    const now = Date.now();
    const models = ['gemini-3.1-pro-preview', 'gemini-3.5-flash', 'gemini-3-flash-preview', 'gpt-4o', 'gpt-4o-mini'];
    const endpoints = ['/api/v2/optimize', '/api/v3/optimize', '/api/analyze-job', '/api/star-builder'];

    // Seed data day by day for the last 90 days
    const batchSize = 100;
    let batch = firestore.batch();
    let operationCount = 0;

    for (let i = 90; i >= 0; i--) {
      const timestamp = now - i * oneDay;
      const numLogs = Math.floor(Math.random() * 4) + 1; // 1 to 4 logs per day

      for (let j = 0; j < numLogs; j++) {
        const model = models[Math.floor(Math.random() * models.length)];
        const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
        
        const inputTokens = Math.floor(Math.random() * 8000) + 1000;
        const outputTokens = Math.floor(Math.random() * 2000) + 500;
        const cacheHit = Math.random() < 0.2; // 20% cache hit
        const cost = cacheHit ? 0 : calculateCost(model, inputTokens, outputTokens);

        const logDoc = firestore.collection("analytics").doc();
        batch.set(logDoc, {
          userId: uid,
          model,
          inputTokens,
          outputTokens,
          totalTokens: inputTokens + outputTokens,
          cacheHit,
          endpoint,
          timestamp: admin.firestore.Timestamp.fromMillis(timestamp),
          cost
        });

        operationCount++;
        if (operationCount >= batchSize) {
          await batch.commit();
          batch = firestore.batch();
          operationCount = 0;
        }
      }
    }

    if (operationCount > 0) {
      await batch.commit();
    }
    console.log(`[Server] Finished seeding usage history for user ${uid}.`);
  }

  // Route to get a specific user's usage telemetry (with auto-seeding if empty)
  app.get("/api/user/usage", async (req, res) => {
    try {
      const authHeader = req.header('Authorization');
      let uid = "anonymous";
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const idToken = authHeader.split('Bearer ')[1];
        uid = await getUserIdFromToken(idToken);
      }

      const { range } = req.query; // '1d', '3d', '1w', '1m', '3m'
      const firestore = requireFirestoreDb("User usage stats");
      
      // Let's first check if there are any logs for this user.
      const userLogsSnapshot = await firestore.collection("analytics").where("userId", "==", uid).limit(1).get();
      if (userLogsSnapshot.empty) {
        // Seed 3 months of history for this user
        await seedUserUsageHistory(firestore, uid);
      }

      // Now query user logs
      const snapshot = await firestore.collection("analytics").where("userId", "==", uid).get();
      const logs = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          timestamp: data.timestamp?.toDate?.()?.getTime() || data.timestamp || Date.now()
        } as UsageLog;
      });

      // Filter by range on the server side
      let filteredLogs = logs;
      const now = Date.now();
      if (range) {
        let since = 0;
        if (range === '1d') since = now - 24 * 60 * 60 * 1000;
        else if (range === '3d') since = now - 3 * 24 * 60 * 60 * 1000;
        else if (range === '1w') since = now - 7 * 24 * 60 * 60 * 1000;
        else if (range === '1m') since = now - 30 * 24 * 60 * 60 * 1000;
        else if (range === '3m') since = now - 90 * 24 * 60 * 60 * 1000;
        
        if (since > 0) {
          filteredLogs = logs.filter(l => l.timestamp >= since);
        }
      }

      // Calculate stats
      const totalRequests = filteredLogs.length;
      const totalTokens = filteredLogs.reduce((sum, l) => sum + (l.totalTokens || 0), 0);
      const totalCost = filteredLogs.reduce((sum, l) => sum + (l.cost || 0), 0);
      const cacheHits = filteredLogs.filter(l => l.cacheHit).length;
      const cacheHitRatio = totalRequests > 0 ? (cacheHits / totalRequests) * 100 : 0;

      // Group usage by day
      const dailyData: Record<string, { tokens: number, cost: number }> = {};
      filteredLogs.forEach(log => {
        const date = new Date(log.timestamp).toISOString().split('T')[0];
        if (!dailyData[date]) {
          dailyData[date] = { tokens: 0, cost: 0 };
        }
        dailyData[date].tokens += (log.totalTokens || 0);
        dailyData[date].cost += (log.cost || 0);
      });
      const usageByDay = Object.entries(dailyData).map(([date, data]) => ({
        date,
        ...data
      })).sort((a, b) => a.date.localeCompare(b.date));

      // Group model usage distribution
      const modelData: Record<string, number> = {};
      filteredLogs.forEach(log => {
        const model = log.cacheHit ? "Cache" : log.model;
        modelData[model] = (modelData[model] || 0) + 1;
      });
      const modelUsage = Object.entries(modelData).map(([name, value]) => ({
        name,
        value
      }));

      // Calculate today's usage per engine for quota matching
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const startOfTodayTime = startOfToday.getTime();
      const todayLogs = logs.filter(l => l.timestamp >= startOfTodayTime);

      const todayEngineUsage: Record<string, { requests: number, tokens: number }> = {};
      todayLogs.forEach(log => {
        const model = log.model;
        if (!todayEngineUsage[model]) {
          todayEngineUsage[model] = { requests: 0, tokens: 0 };
        }
        todayEngineUsage[model].requests += 1;
        todayEngineUsage[model].tokens += (log.totalTokens || 0);
      });

      res.json({
        stats: {
          totalRequests,
          totalTokens,
          totalCost,
          cacheHitRatio
        },
        usageByDay,
        modelUsage,
        todayEngineUsage
      });
    } catch (error) {
      if (isFirebaseUnavailableError(error)) {
        return sendFirebaseUnavailable(res, "User usage stats", error);
      }
      console.error("Error fetching user usage stats:", error);
      res.status(500).json({ error: "Failed to fetch user usage stats" });
    }
  });

  // Route to get engine quota limits configuration from Firestore (or seed default if missing)
  app.get("/api/quotas/config", async (req, res) => {
    try {
      const firestore = requireFirestoreDb("Quotas configuration");
      const docRef = firestore.collection("quotas").doc("config");
      let configDoc = await docRef.get();
      
      const defaultConfig = {
        "gemini-3.1-pro-preview": { "requestsPerDay": 100, "tokensPerDay": 1000000 },
        "gemini-3.5-flash": { "requestsPerDay": 500, "tokensPerDay": 5000000 },
        "gemini-3-flash-preview": { "requestsPerDay": 1000, "tokensPerDay": 10000000 },
        "gpt-4o": { "requestsPerDay": 100, "tokensPerDay": 1000000 },
        "gpt-4o-mini": { "requestsPerDay": 500, "tokensPerDay": 5000000 }
      };

      if (!configDoc.exists) {
        console.log("[Server] Quota configuration not found. Creating default...");
        await docRef.set(defaultConfig);
        return res.json(defaultConfig);
      }

      res.json(configDoc.data());
    } catch (error) {
      if (isFirebaseUnavailableError(error)) {
        return sendFirebaseUnavailable(res, "Quotas configuration", error);
      }
      console.error("Error fetching quota configuration:", error);
      res.status(500).json({ error: "Failed to fetch quota configuration" });
    }
  });

  app.post("/api/optimize", async (req, res) => {
    try {
      const authHeader = req.header('Authorization');
      if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
      const idToken = authHeader.split('Bearer ')[1];
      
      const { prompt, model, engine, encryptedKey } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      // Get keys
      let apiKey = "";
      if (encryptedKey) {
        try {
          const decrypted = decrypt(encryptedKey);
          const parsed = JSON.parse(decrypted);
          apiKey = parsed.openai || "";
        } catch (e) {
          try {
            apiKey = decrypt(encryptedKey);
          } catch (err) {}
        }
      }

      if (!apiKey) {
        const keys = await getApiKeys(idToken);
        if (keys && keys.openai) {
          apiKey = keys.openai;
        }
      }

      if (!apiKey) {
        apiKey = process.env.OPENAI_API_KEY || "";
      }

      if (!apiKey) {
        return res.status(400).json({ error: "OpenAI API Key is missing. Please save your profile first." });
      }

      const openai = new OpenAI({ apiKey });
      const responseFormat = prompt.toLowerCase().includes('json') ? { type: "json_object" as const } : undefined;
      
      const completion = await openai.chat.completions.create({
        model: model || "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: responseFormat
      });

      res.json({
        result: completion.choices[0].message.content || "",
        usage: {
          promptTokenCount: completion.usage?.prompt_tokens || 0,
          candidatesTokenCount: completion.usage?.completion_tokens || 0,
          totalTokenCount: completion.usage?.total_tokens || 0
        }
      });
    } catch (error: any) {
      console.error("[Server API Optimize Error]:", error);
      res.status(500).json({ error: error.message || "Failed to optimize via OpenAI backend" });
    }
  });

  app.post("/api/v2/optimize", async (req, res) => {
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: "Missing or invalid Authorization header" });
    }
    const idToken = authHeader.split('Bearer ')[1];

    const { 
      resumeText, 
      jobDescription, 
      targetRole, 
      mode, 
      audience, 
      customPrompt, 
      pipelineType,
      targetCompany,
      brainDump,
      strictAtsMode,
      generateCoverLetter
    } = req.body;

    if (!resumeText || !jobDescription) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      // 1. Fetch keys securely from Firestore
      const keys = await getApiKeys(idToken);
      let geminiKey = process.env.GEMINI_API_KEY;
      let openaiKey = process.env.OPENAI_API_KEY || "";
      
      if (keys) {
        geminiKey = keys.gemini || geminiKey;
        openaiKey = keys.openai || openaiKey;
      } else {
        console.warn("User has no API key configured. Using system key.");
      }
      
      if (!geminiKey) console.warn("Gemini API key not found. Expecting platform-provided authentication to be available.");
      
      const selectedPipeline = pipelineType || 'hybrid-gemini';

      const config: any = {};
      if (geminiKey) config.apiKey = geminiKey;
      
      // Need to find where Gemini is instantiated to update it
      // Let's first verify where it's initialized and how it's used before changing too much.

      // 2. Check Cache First (Key includes all relevant fields)
      const cacheKey = pipelineCache.generateKey({ 
        resumeText: resumeText,
        jobDescription: jobDescription,
        targetRole, 
        mode, 
        audience, 
        customPrompt,
        pipelineType: selectedPipeline,
        strictAtsMode,
        generateCoverLetter
      });
      
      const cachedResult = pipelineCache.get(cacheKey);
      if (cachedResult) {
        // Log cache hit
        logUsage({
          userId: "anonymous",
          model: "cache",
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          cacheHit: true,
          endpoint: "/api/v2/optimize",
          timestamp: Date.now(),
          cost: 0
        });
        return res.json(cachedResult);
      }

      if (selectedPipeline === 'hybrid-openai' && !openaiKey) {
        throw new Error("OpenAI API Key is required for Hybrid OpenAI mode.");
      }

      // STEP 1: Gemini (Cheap) - Extraction & Analysis
      console.log(`[Pipeline] Step 1: Gemini Extraction (${geminiKey ? 'User Key' : 'System Key'})...`);
      const [resumeExtraction, jdExtraction] = await Promise.all([
        Optimization.extractRelevantResumeData(resumeText, geminiKey, openaiKey, selectedPipeline),
        Optimization.extractJDKeywords(jobDescription, geminiKey, openaiKey, selectedPipeline)
      ]);

      const resumeData = resumeExtraction?.data;
      const jdKeywords = jdExtraction?.data || [];
      const extractionModelUsed = (resumeExtraction as any)?._model || "gemini-3-flash-preview";
      
      const geminiUsage = {
        promptTokenCount: (resumeExtraction?.usage?.promptTokenCount || 0) + (jdExtraction?.usage?.promptTokenCount || 0),
        candidatesTokenCount: (resumeExtraction?.usage?.candidatesTokenCount || 0) + (jdExtraction?.usage?.candidatesTokenCount || 0),
        totalTokenCount: (resumeExtraction?.usage?.totalTokenCount || 0) + (jdExtraction?.usage?.totalTokenCount || 0)
      };

      if (!resumeData) throw new Error("Failed to extract resume data using Gemini.");

      // STEP 2: Internal Logic (Free) - Trimming
      console.log("[Pipeline] Step 2: Trimming Content...");
      const optimizedInput = Optimization.trimContentForAI(resumeData, jdKeywords);

      // Automatically check if the job description represents a Player-Coach role (Leadership + Execution hybrid)
      let isPlayerCoach = false;
      try {
        const checkPrompt = `
          Analyze the following Job Description.
          Determine if this role is a "Player-Coach" role (individual contributor + team lead/mentor/manager duties combined).
          Return ONLY a JSON object: { "isPlayerCoach": boolean }
          
          JOB DESCRIPTION:
          ${jobDescription}
        `;
        const genAI = new GoogleGenAI(geminiKey ? { apiKey: geminiKey } : {});
        const { response: checkResult, modelUsed } = await generateContentWithFallback(
          genAI,
          ["gemini-3.5-flash", "gemini-3-flash-preview"],
          checkPrompt,
          { responseMimeType: "application/json" }
        );
        const parsed = JSON.parse(checkResult.text || "{}");
        isPlayerCoach = !!parsed.isPlayerCoach;
        console.log(`[Pipeline] Auto-selected Player-Coach status: ${isPlayerCoach} (model used: ${modelUsed})`);
      } catch (err) {
        console.warn("[Pipeline] Failed to auto-select Player-Coach status:", err);
      }

      // Automatically retrieve FAANG DNA customization booster tips if applicable
      let faangDnaTips = "";
      const faangBrands = ['google', 'amazon', 'meta', 'apple', 'netflix'];
      if (targetCompany && faangBrands.includes(targetCompany.toLowerCase())) {
        try {
          console.log(`[Pipeline] Step 2.5: Generating FAANG DNA Booster for ${targetCompany}...`);
          const boosterPrompt = `
            Retrieve and analyze key cultural values, technical priorities, interview tip guidelines, and architectural standards for candidates applying to ${targetCompany} in a senior infrastructure/cloud role.
            Return a short paragraph of 3-4 actionable bullet points on how a resume should be customized for ${targetCompany}.
          `;
          const genAI = new GoogleGenAI(geminiKey ? { apiKey: geminiKey } : {});
          const { response: boosterResult, modelUsed } = await generateContentWithFallback(
            genAI,
            ["gemini-3.5-flash", "gemini-3-flash-preview"],
            boosterPrompt
          );
          faangDnaTips = boosterResult.text || "";
          console.log(`[Pipeline] FAANG DNA Booster generated successfully using ${modelUsed}.`);
        } catch (err) {
          console.warn("[Pipeline] Failed to generate FAANG DNA Booster:", err);
        }
      }
      
      console.log("=== OPTIMIZED INPUT EXPERIENCE ===");
      console.dir(optimizedInput.experience, { depth: null });

      // STEP 3: Gemini 3.1 Pro (Premium) - Final Generation
      const finalPrompt = `
        ACT AS:
        You are a Senior Prompt Engineer with 5+ years of experience specializing in FAANG-level resume engineering, executive branding, ATS optimization, enterprise cloud leadership positioning, and STAR-method resume transformation for Microsoft, Google, Amazon, Meta, Oracle, Adobe, VMware, Accenture, Deloitte, and enterprise infrastructure organizations.

        YOUR ROLE:
        You are NOT a generic resume writer. You are:
        * A Principal Resume Strategist
        * A FAANG Technical Recruiter
        * A Cloud Leadership Branding Expert
        * An Executive Infrastructure Positioning Specialist
        * A Senior ATS Optimization Consultant

        PRIMARY OBJECTIVE:
        Transform the candidate's resume into a STRICT FAANG-STYLE Senior Azure Infrastructure Leadership resume using authentic STAR methodology while maintaining COMPLETE FACTUAL ACCURACY.
        
        POSITION STRONGLY FOR:
        * Head of Cloud Operations
        * Senior Cloud Infrastructure Architect
        * Director of Cloud Infrastructure
        * Cloud Operations Manager
        * Infrastructure & Platform Operations Lead
        * Azure Infrastructure Architect
        * Enterprise Cloud Architect
        * IT Infrastructure Manager
        * Service Delivery Manager – Cloud
        * Technical Operations Manager
        * Infrastructure Governance Lead
        * CTO-track Infrastructure Leadership Roles

        DO NOT POSITION AS:
        * Senior DevOps Engineer
        * Kubernetes Architect
        * Platform Engineer
        * Cloud-Native Application Engineer
        * Principal SRE
        * Microservices Architect
        * DevOps Automation Specialist
        * Kubernetes Administrator

        VERY IMPORTANT TRUTHFULNESS RULES (CRITICAL):
        * NEVER fabricate experience.
        * NEVER create fake Kubernetes production experience.
        * NEVER claim deep Terraform engineering expertise.
        * NEVER create fake CI/CD ownership.
        * NEVER exaggerate DevOps expertise.
        * NEVER invent microservices architecture experience.
        * NEVER add technologies not actually used.
        * NEVER imply software engineering background.
        * NEVER create fake coding-heavy experience.
        * NEVER add any fake technologies or fake details to the job description or optimized resume.
        * DO NOT add or focus on ITIL (ITTL) certification; exclude it from certifications unless explicitly present in the original resume.
        * SKILLS MATCHING RULES: Extract and mention ONLY the skills that are present in or directly matching the candidate's actual resume. Do NOT list or invent skills that the candidate does not have on their original resume.
        * TECHNOLOGY FOCUS: Do NOT focus too much on DevOps, Terraform, or Microservices / container services (like Kubernetes, Docker, AKS). Keep the emphasis on Enterprise Azure Infrastructure, Governance, Security, Resiliency, Operations, and Modernization scaling.
        * METRIC INTEGRITY & ANTI-PERCENTAGE INFLATION: Do NOT inject fabricated percentage metrics (such as 'alignment with SLAs by 30%', 'decreasing stability incidents by 25%', 'improved system reliability by 20%', etc.) unless they are derived from real, measurable baselines. If no metrics exist, focus on qualitative, verifiable outcomes (e.g. 'ensuring regulatory compliance', 'reducing system complexity', 'improving uptime reliability') rather than stacking fake-looking percentages. Avoid literal 100% metrics (such as '100% compliance', '100% operational alignment') as they look fake and trigger recruiter skepticism.
        * CONCENTRIX ROLE CONTEXT: The candidate was NOT officially a Service Delivery Manager (SDM) and did not have formal managerial ownership of a 20-member team. Do NOT use phrasing like 'Orchestrated service delivery management for a 20-member team' or describe formal managerial ownership, as this will lead to verification failures. Frame experience as a Technical Lead / Senior Engineer coordinating operational workflows and collaborating with the team, rather than official managerial leadership.
        * HCLTECH TENURE CONSTRAINT: The HCLTech role lasted only ONE MONTH. Do NOT write bullets claiming massive strategic impacts, Azure operations strategies execution, or improving SLA adherence by 15% during this short period. Restrict the bullets to basic setup, onboarding, knowledge transfer, shadowing, and assisting with minor operational tasks during the short tenure.

        CANDIDATE REAL BACKGROUND:
        * 16+ years in enterprise infrastructure and cloud operations.
        * Strong Azure Infrastructure and Hybrid Cloud expertise.
        * Experienced in Azure governance, security, monitoring, HA/DR, resilience, and operational management.
        * Strong experience with enterprise infrastructure modernization.
        * Leadership and mentoring experience.
        * Strong stakeholder communication and operational coordination.
        * Experience handling enterprise infrastructure at scale.
        * Strong operational reliability mindset.
        * Good understanding of DevOps concepts and automation workflows.
        * Basic Terraform understanding (can understand and work with scripts but not advanced engineering).
        * No deep Kubernetes production administration experience.
        * No deep microservices architecture experience.
        * Strong cloud governance and operational transformation experience.

        STRICT FAANG RESUME RULES:
        1. EVERY bullet point MUST follow STAR methodology (Situation, Task, Action, Result).
        2. EVERY bullet MUST: Start with a strong action verb, show ownership, show measurable impact, show scale, show business value, be concise, be technically dense, sound executive-level, architecture-focused, and leadership-oriented.
        3. AVOID weak operational wording: Managed, Supported, Assisted, Helped, Worked on, Responsible for.
        4. VERB CONTROL: Avoid overuse of overly dramatic executive AI verbs (e.g. 'Spearheaded', 'Orchestrated', 'Pioneered', 'Architected', 'Directed') which make the resume sound AI-generated. Instead, use operational, grounded, believable, and technical action verbs (e.g. 'Implemented', 'Optimized', 'Standardized', 'Configured', 'Deployed', 'Governed', 'Automated', 'Coordinated', 'Resolved', 'Maintained'). Keep wording grounded and believable.
        5. RESUME MUST SOUND LIKE: Enterprise Cloud Leadership, Azure Infrastructure Strategy, Reliability Engineering Leadership, Infrastructure Governance, Enterprise Operations Excellence, Cloud Transformation Leadership, Executive Infrastructure Management, Cloud Operations Architecture, Enterprise IT Modernization, Strategic Infrastructure Leadership.
        6. RESUME MUST NOT SOUND LIKE: Helpdesk support, Junior sysadmin, Pure operations support, Developer-focused engineer, Kubernetes-heavy engineer, Hardcore DevOps engineer, Coding-heavy architect.
        7. EMPHASIZE: Azure Landing Zones, Hybrid Cloud Architecture, Infrastructure Governance, Reliability & Resilience, Disaster Recovery, Business Continuity, Cloud Cost Optimization, Operational Excellence, Monitoring & Observability, Identity & Access Management, Infrastructure Standardization, Infrastructure Automation, Executive Reporting, Service Delivery, Stakeholder Management, Team Leadership, Infrastructure Security, Compliance Governance, Enterprise Transformation.
        8. USE METRICS NATURALLY: Cost savings, MTTR reduction, Downtime reduction, Subscription scale, VM scale, Team size, Reliability improvement, Governance coverage, Compliance metrics, Operational efficiency, SLA improvements, Infrastructure availability.
        9. ATS OPTIMIZATION TARGET KEYWORDS: Azure Infrastructure Architect, Cloud Infrastructure Leader, Enterprise Cloud Architect, Cloud Operations Manager, Director of Infrastructure, Infrastructure Governance, Hybrid Cloud, Cloud Reliability, HA/DR, Cloud Security, Azure Operations, Infrastructure Transformation, IT Service Delivery, Cloud Governance, Enterprise Infrastructure.
        10. FORMATTING & BULLET QUANTITY RULES:
            - For the first 2 roles (most recent 2 roles): 2-line descriptions with a maximum of 5 to 6 bullet points are allowed. Each bullet point should be high impact and can span up to 2 lines of text.
            - For all other (older) roles: Keep strictly one-line (1-line) descriptions for every single bullet point. Do not exceed a single line of text for any bullet point under these older roles. Max 4 bullets per role, and exactly 1 bullet point for roles pre-2018.
            - Keep technical density high and use concise executive-style language.
            - Remove repetitive wording.
        11. BALANCED IaC: Terraform/IaC references are permitted but limited to 2 bullet points TOTAL across the entire resume.
        12. SOURCE ANCHORING (CRITICAL): Each experience entry contains ORIGINAL BULLETS. You MUST derive new bullets ONLY from that specific role’s original content. Do NOT borrow, reuse, or "hallucinate" content from other roles to fill gaps.
        13. PRESERVE TITLES: Do NOT modify job titles under any circumstances. Specifically, NEVER change "Officer IT cum Logistics" to "Office IT cum Logistics". This is a mandatory requirement.

        CORPORATE DNA TAILORING:
        ${targetCompany === 'amazon' ? 'TAILOR FOR AMAZON: Emphasize "Ownership", "Bias for Action", and "Data-driven results". Use terminology from Amazon Leadership Principles.' : ''}
        ${targetCompany === 'microsoft' ? 'TAILOR FOR MICROSOFT: Emphasize "Enterprise Scale", "Cloud Transformation", and "Collaborative Ecosystems".' : ''}
        ${targetCompany === 'google' ? 'TAILOR FOR GOOGLE: Emphasize "Systems Design", "Extreme Scale", "Algorithmic Efficiency", and "Google XYZ Formula".' : ''}
        ${targetCompany === 'meta' ? 'TAILOR FOR META: Emphasize "Moving Fast", "Shipping End-to-End Impact", and "Performance Optimization".' : ''}
        ${targetCompany === 'netflix' ? 'TAILOR FOR NETFLIX: Emphasize "Freedom and Responsibility", "High Performance", "Stunning Colleagues", and "Context, not Control".' : ''}
        ${targetCompany === 'accenture' || targetCompany === 'infosys' ? 'TAILOR FOR CONSULTING: Emphasize "Client Delivery", "Global Managed Services", and "Cross-functional Deployment".' : 'TAILOR FOR PRODUCT TECH: Focus on internal product growth and feature ownership.'}
        
        ${faangDnaTips ? `
        FAANG CUSTOMIZED BOOSTER DNA FOR ${targetCompany.toUpperCase()}:
        ${faangDnaTips}
        ` : ''}

        PLAYER-COACH MODE:
        ${(mode === 'Player-Coach' || isPlayerCoach) ? `
          - 60/40 BALANCE: 60% Execution (Azure infra, Site Recovery, Entra ID), 40% Leadership (Mentoring, Agile pods, Architecture reviews).
          - HYBRID VOCABULARY: Use "Architected & Led," "Designed & Mentored," "Engineered & Standardized," "Spearheaded."
        ` : ''}

        ${strictAtsMode ? `STRICT ATS MATCHING: You MUST use the exact keywords from the Job Description as provided in 'ats_keywords_from_jd'. Do NOT use synonyms or alternatives (e.g., if JD says 'AWS EC2', do not write 'Amazon Web Services cloud compute'). Achieve a 100% literal match rate for extracted keywords.` : ''}
        
        ${generateCoverLetter ? `COVER LETTER GENERATION: Write a 3-paragraph, highly tailored cover letter aligning the candidate's optimized experience directly with the target company's mission and the Job Description. Output this in the "cover_letter" JSON field.` : ''}

        INPUT DATA:
        ${JSON.stringify(optimizedInput, null, 2)}

        OUTPUT SCHEMA (MUST MATCH EXACTLY):
        {
          "personal_info": { "name": "string", "location": "string", "email": "string", "phone": "string", "linkedin": "string", "linkedinText": "string" },
          "summary": "string",
          "skills": { "Category 1": ["string"], "Category 2": ["string"], "Category 3": ["string"], "Category 4": ["string"] },
          "experience": [ { "id": "string", "role": "string", "company": "string", "duration": "string", "bullets": ["string"] } ],
          "projects": [ { "title": "string", "description": "string" } ],
          "education": ["string"],
          "certifications": [
            { "name": "string", "issuer": "string", "date": "string" }
          ],
          "ats_keywords_from_jd": ["string"],
          "ats_keywords_added_to_resume": ["string"],
          "keyword_gap": ["string"],
          "match_score": 85,
          "baseline_score": 60,
          "improvement_notes": ["string"],
          "audience_alignment_notes": "string",
          "why_this_job": "string",
          "rejection_reasons": ["string"],
          "star_stories": [
            { "bullet": "string", "situation": "string", "task": "string", "action": "string", "result": "string" }
          ],
          "audit_report": {
            "score": 85,
            "flags": [
              { "id": "string", "type": "string", "message": "string", "fix": "string", "severity": "high" }
            ],
            "trajectory": {
              "stage": "acceleration",
              "description": "string",
              "recommendation": "string"
            }
          }${generateCoverLetter ? ',\n          "cover_letter": "string"' : ''}
        }
      `;

      let result;
      let usedModel = pipelineType === 'hybrid-openai' ? "gpt-4o" : "gemini-3.1-pro-preview";

      if (pipelineType === 'hybrid-openai') {
        // OPENAI BRANCH
        try {
          console.log(`[Hybrid Pipeline] Step 3: Premium OpenAI Generation (${usedModel})...`);
          const openai = new OpenAI({ apiKey: openaiKey });
          const chatCompletion = await openai.chat.completions.create({
            model: usedModel,
            messages: [{ 
              role: "system", 
              content: "You are a senior executive resume strategist. Output strictly JSON." 
            }, { 
              role: "user", 
              content: finalPrompt
            }],
            response_format: { type: "json_object" }
          });

          const responseText = chatCompletion.choices[0].message.content || "";
          const genInput = chatCompletion.usage?.prompt_tokens || 0;
          const genOutput = chatCompletion.usage?.completion_tokens || 0;

          logUsage({
            userId: "anonymous",
            model: usedModel,
            inputTokens: genInput,
            outputTokens: genOutput,
            totalTokens: genInput + genOutput,
            cacheHit: false,
            endpoint: "/api/v2/optimize",
            timestamp: Date.now(),
            cost: calculateCost(usedModel, genInput, genOutput)
          });

          // Log Gemini Extraction
          logUsage({
            userId: "anonymous",
            model: extractionModelUsed,
            inputTokens: geminiUsage.promptTokenCount,
            outputTokens: geminiUsage.candidatesTokenCount,
            totalTokens: geminiUsage.totalTokenCount,
            cacheHit: false,
            endpoint: "/api/v2/optimize",
            timestamp: Date.now(),
            cost: calculateCost(extractionModelUsed, geminiUsage.promptTokenCount, geminiUsage.candidatesTokenCount)
          });

          result = {
            result: responseText,
            usage: {
              promptTokenCount: genInput,
              candidatesTokenCount: genOutput,
              totalTokenCount: genInput + genOutput
            },
            geminiUsage,
            intermediateData: { resumeData, jdKeywords },
            _engine: 'hybrid-openai',
            _model: usedModel
          };
        } catch (openaiError: any) {
          console.warn("[Pipeline] OpenAI Premium Failed, falling back to OpenAI Mini...", openaiError.message);
          try {
            const openaiFallback = new OpenAI({ apiKey: openaiKey || process.env.OPENAI_API_KEY || "" });
            const chatCompletion = await openaiFallback.chat.completions.create({
              model: "gpt-4o-mini",
              messages: [{ 
                role: "system", 
                content: "You are a senior executive resume strategist. Output strictly JSON." 
              }, { 
                role: "user", 
                content: finalPrompt
              }],
              response_format: { type: "json_object" }
            });
            const text = chatCompletion.choices[0].message.content || "";
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error("Fallback OpenAI Mini did not return valid JSON.");
            
            result = {
              result: jsonMatch[0],
              usage: {
                promptTokenCount: chatCompletion.usage?.prompt_tokens || 0,
                candidatesTokenCount: chatCompletion.usage?.completion_tokens || 0,
                totalTokenCount: chatCompletion.usage?.total_tokens || 0
              },
              geminiUsage,
              intermediateData: { resumeData, jdKeywords },
              _engine: 'hybrid-openai',
              _model: "gpt-4o-mini",
              _fallback: true
            };
          } catch (fallbackError: any) {
            console.error("[Pipeline] Fallback OpenAI Mini also failed:", fallbackError.message);
            throw fallbackError;
          }
        }
      } else {
        // GEMINI BRANCH
        try {
        console.log(`[Pipeline] Step 3: Split Generation (Gemini ${usedModel})...`);
        const genAI = new GoogleGenAI({ apiKey: geminiKey });
        
        // 1. Generate Meta Data (Summary, Skills, Why This Job, etc.)
        const metaPrompt = `
          ACT AS:
          You are a Senior Prompt Engineer with 5+ years of experience specializing in FAANG-level resume engineering, executive branding, ATS optimization, enterprise cloud leadership positioning, and STAR-method resume transformation.

          YOUR ROLE:
          You are a Principal Resume Strategist, FAANG Technical Recruiter, and Cloud Leadership Branding Expert.

          PRIMARY OBJECTIVE:
          Optimize the meta-sections of this resume (summary, skills, projects, certifications, education) for: ${targetRole}.
          Audience: ${audience}. Mode: ${mode}.
          Keywords: ${optimizedInput.jd_keywords.join(', ')}.
          ${brainDump ? `ADDITIONAL CONTEXT (BRAIN DUMP): ${brainDump}` : ''}
          
          CANDIDATE REAL BACKGROUND:
          * 16+ years in enterprise infrastructure and cloud operations.
          * Strong Azure Infrastructure and Hybrid Cloud expertise.
          * Experienced in Azure governance, security, monitoring, HA/DR, resilience, and operational management.
          * Strong experience with enterprise infrastructure modernization.
          * Leadership and mentoring experience.
          * Strong stakeholder communication and operational coordination.
          * Experience handling enterprise infrastructure at scale.
          * Strong operational reliability mindset.
          * Good understanding of DevOps concepts and automation workflows.
          * Basic Terraform understanding (can understand and work with scripts but not advanced engineering).
          * No deep Kubernetes production administration experience.
          * No deep microservices architecture experience.
          * Strong cloud governance and operational transformation experience.

          POSITION STRONGLY FOR:
          * Senior enterprise cloud infrastructure leadership roles (Head of Cloud Operations, Azure Infrastructure Architect, Director/Manager of Cloud Infrastructure).
          * DO NOT position as Senior DevOps Engineer, Kubernetes Architect, SRE, Platform Engineer, or software developer.

          RULES:
          - Summary: Approx 100 words.
          - Skills: Categorize into exactly 4 logical categories relevant to ${targetRole} (e.g., Azure Infrastructure Management, Enterprise Cloud Governance, Reliability & HA/DR, Infrastructure Operations & Optimization). Ensure no fabrication.
          - Why This Job: 100-150 words compelling response.
          - DO NOT invent certifications, skills, or projects not present in the input.
          - Project Descriptions: Keep them concise and focused on Azure Migration, FinOps, HA/DR, and Governance. Use strong allowed verbs.
          - Older Project Compression: Before 2018, provide EXACTLY one (1) bullet point maximum for projects.
          - VERB CONTROL: Use allowed strong verbs (Architected, Spearheaded, Optimized, Standardized, Orchestrated, Led, Directed, Improved, Implemented, Streamlined, Governed, Enhanced, Coordinated, Modernized, Transformed). Avoid weak verbs (Managed, Supported, Helped, Worked on).
          - TRUTHFULNESS: Never exaggerate DevOps, Terraform, or Kubernetes experience. Limit Terraform/IaC references to at most 2 bullets TOTAL across the entire resume.
          
          INPUT DATA:
          ${JSON.stringify({
            personal_info: optimizedInput.personal_info,
            summary: optimizedInput.summary,
            skills: optimizedInput.skills,
            projects: optimizedInput.projects,
            education: optimizedInput.education,
            certifications: optimizedInput.certifications,
            jd_keywords: optimizedInput.jd_keywords
          }, null, 2)}
          
          OUTPUT JSON SCHEMA:
          {
            "personal_info": {
              "name": "string",
              "location": "string",
              "email": "string",
              "phone": "string",
              "linkedin": "string",
              "linkedinText": "string"
            },
            "summary": "string",
            "skills": {
              "Category 1": ["string"],
              "Category 2": ["string"],
              "Category 3": ["string"],
              "Category 4": ["string"]
            },
            "why_this_job": "string",
            "projects": [
              {
                "title": "string",
                "description": "string"
              }
            ],
            "education": ["string"],
            "certifications": [
              {
                "name": "string",
                "issuer": "string",
                "date": "string"
              }
            ],
            "ats_keywords_from_jd": ["string"],
            "ats_keywords_added_to_resume": ["string"],
            "keyword_gap": ["string"],
            "match_score": 85,
            "improvement_notes": ["string"],
            "audience_alignment_notes": "string",
            "star_stories": [
              {
                "bullet": "string",
                "situation": "string",
                "task": "string",
                "action": "string",
                "result": "string"
              }
            ],
            "audit_report": {
              "score": 85,
              "flags": [
                {
                  "id": "string",
                  "type": "string",
                  "message": "string",
                  "fix": "string",
                  "severity": "high"
                }
              ],
              "trajectory": {
                "stage": "acceleration",
                "description": "string",
                "recommendation": "string"
              }
            }
          }
        `;

        // 2. Generate Roles Individually (Parallel) and Deduplicate
        console.log(`[Pipeline] Spawning meta generation and ${optimizedInput.experience.length} role generation tasks...`);
        const [metaResponseInfo, roleResults] = await Promise.all([
          generateContentWithFallback(
            genAI,
            ["gemini-3.1-pro-preview", "gemini-3.5-flash", "gemini-3-flash-preview"],
            metaPrompt,
            { responseMimeType: "application/json" }
          ),
          generatePerRole(
            optimizedInput.experience, 
            geminiKey, 
            targetCompany, 
            targetRole,
            audience,
            mode,
            customPrompt,
            brainDump
          )
        ]);

        const metaResponse = metaResponseInfo.response;
        const usedModelActual = metaResponseInfo.modelUsed;
        usedModel = usedModelActual; // Ensure telemetry logs correct model used after fallback

        const metaText = metaResponse.text || "{}";
        const metaData = JSON.parse(metaText);
        
        // 3. Deduplicate and Score
        console.log("[Pipeline] Deduplicating and Scoring...");
        const finalExperience = deduplicateAndScore(roleResults);

        const finalResult = {
          ...metaData,
          experience: finalExperience
        };

        // STEP 4: Agentic Review (Multi-Agent Refinement)
        console.log("[Pipeline] Step 4: Multi-Agent Review...");
        const agentFeedback = await runAgents(finalResult, geminiKey);

        result = {
          result: JSON.stringify(finalResult),
          agentFeedback,
          usage: {
            promptTokenCount: metaResponse.usageMetadata?.promptTokenCount || 0,
            candidatesTokenCount: metaResponse.usageMetadata?.candidatesTokenCount || 0,
            totalTokenCount: metaResponse.usageMetadata?.totalTokenCount || 0
          },
          geminiUsage,
          intermediateData: { resumeData, jdKeywords },
          _model: usedModel,
          _optimized: true,
          _split_gen: true,
          _agents: true
        };

        console.log("[Pipeline] Split Generation Complete.");

      } catch (genError: any) {
        console.error("[Pipeline] Split Generation Failed:", genError);
        // Fallback to simpler single call if split gen fails
        res.status(500).json({ error: "Failed to optimize resume via split pipeline", details: genError.message });
        return;
      }
    }
    
    // STEP 5: Cache Result (Merged/Unified)
    if (result) {
      Optimization.saveToCache(cacheKey, result);
      res.json(result);
    }
    } catch (error: unknown) {
      if (isFirebaseUnavailableError(error)) {
        return sendFirebaseUnavailable(res, "Resume optimization", error);
      }
      const normalizedError = toError(error);
      console.error("V2 Optimization Error:", error);
      res.status(500).json({ error: "Failed to optimize resume via V2 pipeline", details: normalizedError.message });
    }
  });
  
  app.post("/api/v3/optimize", async (req, res) => {
    try {
      const authHeader = req.header('Authorization');
      if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
  
      const idToken = authHeader.split('Bearer ')[1];
  
      const { 
        resumeText, 
        jobDescription,
        targetRole,
        targetCompany,
        mode,
        audience,
        customPrompt,
        brainDump
      } = req.body;
  
      if (!resumeText || !jobDescription) {
        return res.status(400).json({ error: "Missing input" });
      }
  
      // ===============================
      // 1. GET KEYS
      // ===============================
      const keys = await getApiKeys(idToken);
      let geminiKey = process.env.GEMINI_API_KEY;
      if (keys && keys.gemini) {
        geminiKey = keys.gemini;
      } else {
        console.warn("User has no API key configured. Using system key.");
      }
  
      // ===============================
      // 2. EXTRACTION
      // ===============================
      const resumeExtraction = await Optimization.extractRelevantResumeData(resumeText, geminiKey);
      const jdExtraction = await Optimization.extractJDKeywords(jobDescription, geminiKey);
  
      const resumeData = resumeExtraction?.data;
      const jdKeywords = jdExtraction?.data || [];
  
      if (!resumeData) throw new Error("Extraction failed");
  
      // ===============================
      // 3. MULTI AGENT
      // ===============================
      const agentOutput = await runAgents({
        resume: resumeData,
        jd: jdKeywords
      }, geminiKey);
  
      // ===============================
      // 4. ROLE GENERATION (NO DUP)
      // ===============================
      const roles = await generatePerRole(
        agentOutput.hr.experience || resumeData.experience,
        geminiKey,
        targetCompany,
        targetRole,
        audience,
        mode,
        customPrompt,
        brainDump
      );
  
      // ===============================
      // 5. DEDUP + SCORE
      // ===============================
      const cleaned = deduplicateAndScore(roles);
  
      const totalScore = cleaned.reduce((sum, r: any) => sum + (r.score || 0), 0);
  
      // ===============================
      // 6. SAVE MEMORY
      // ===============================
      const firestore = getFirestoreDb();
      if (firestore) {
        try {
          await saveResumeVersion(firestore, "anonymous", {
            input: resumeData,
            output: cleaned,
            score: totalScore
          });
        } catch (error) {
          if (isFirebaseUnavailableError(error)) {
            console.warn("[Server] Skipping resume version persistence because Firestore is unavailable at write time.", getFirebaseUnavailableDetails(error));
          } else {
            throw error;
          }
        }
      } else {
        console.warn("[Server] Skipping resume version persistence because Firestore is unavailable.");
      }
  
      // ===============================
      // 7. RESPONSE
      // ===============================
      res.json({
        experience: cleaned,
        score: totalScore,
        _engine: "multi-agent-v3"
      });
  
    } catch (error: unknown) {
      if (isFirebaseUnavailableError(error)) {
        return sendFirebaseUnavailable(res, "Resume optimization", error);
      }
      const normalizedError = toError(error);
      console.error("V3 Error:", error);
      res.status(500).json({
        error: "Optimization failed",
        details: normalizedError.message
      });
    }
  });

  // API Endpoint for PDF Generation (Direct)
  app.post("/api/generate-pdf", async (req, res) => {
    const { html, css, fonts } = req.body;
    await handlePdfGeneration(html, css, fonts, res);
  });

  // API Endpoint to create a PDF session
  app.post("/api/pdf-session", (req, res) => {
    const { html, css, fonts, title } = req.body;
    if (!html) {
      return res.status(400).json({ error: "HTML content is required" });
    }
    const sessionId = uuidv4();
    pdfSessions.set(sessionId, { html, css, fonts, title, timestamp: Date.now() });
    res.json({ sessionId });
  });

  // API Endpoint to download PDF from session
  app.get("/api/download-pdf/:sessionId", async (req, res) => {
    const { sessionId } = req.params;
    const session = pdfSessions.get(sessionId);
    if (!session) {
      return res.status(404).send("PDF session expired or not found. Please try generating again.");
    }
    // Optional: delete session after retrieval to save memory
    // pdfSessions.delete(sessionId);
    await handlePdfGeneration(session.html, session.css, session.fonts, res, session.title);
  });

  async function handlePdfGeneration(html: string, css: string, fonts: string, res: any, title: string = "Resume") {
    if (!html) {
      return res.status(400).json({ error: "HTML content is required" });
    }

    console.log(`Generating PDF. HTML length: ${html.length}`);
    console.log(`CSS length: ${css?.length || 0}`);
    console.log(`Fonts length: ${fonts?.length || 0}`);
    console.log(`CSS snippet: ${css?.substring(0, 500) || ''}`);

    let browser;
    try {
      // In this environment, we often need to force puppeteer to use the installed chrome
      // or let it find its own. Deleting the env var sometimes helps if it points to a wrong path.
      const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
      
      browser = await puppeteer.launch({
        headless: true,
        executablePath: executablePath || undefined,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--font-render-hinting=none",
        ],
      });

      const page = await browser.newPage();
      
      // Set viewport to A4 dimensions at 96 DPI
      await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 1 });

      // Construct a more robust base HTML
      const baseHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>${title}</title>
            <style>
              /* Reset and Base Styles */
              * { box-sizing: border-box; }
              @page { 
                size: A4; 
                margin: 0; /* No margins to allow fixed-height pages to fit */
              }
              html, body {
                margin: 0;
                padding: 0;
                width: 210mm;
                background: white;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              /* Ensure the resume container takes full width */
              #resume-container, .resume-page {
                width: 100% !important;
                margin: 0 !important;
                box-shadow: none !important;
                border: none !important;
              }
              /* Inject User Styles */
              ${css || ''}
              ${fonts || ''}
                h1, h2, h3, h4 { margin-top: 6px !important; margin-bottom: 2px !important; }
                ul { margin-top: 2px !important; margin-bottom: 6px !important; padding-left: 20px !important; }
                li { margin-bottom: 2px !important; }
                .experience-item { margin-bottom: 8px !important; page-break-inside: avoid; }
            </style>
          </head>
          <body>
            ${html}
          </body>
        </html>
      `;

      // Set content and wait for it to load
      await page.setContent(baseHtml, { 
        waitUntil: "networkidle2", // Wait until no more than 2 network connections
        timeout: 30000 
      });

      // Wait for fonts to load
      await page.evaluateHandle('document.fonts.ready');

      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        displayHeaderFooter: false,
        preferCSSPageSize: true,
        pageRanges: "1-2"
      });

      console.log(`PDF generated. Size: ${pdfBuffer.length} bytes`);

      if (pdfBuffer.length < 100) {
        throw new Error("Generated PDF is suspiciously small. It might be empty or corrupted.");
      }

      // Set headers and send
      res.setHeader("Content-Type", "application/pdf");
      const safeTitle = title.replace(/[^a-zA-Z0-9_-]/g, '_');
      res.setHeader("Content-Disposition", `attachment; filename="${safeTitle}.pdf"`);
      res.setHeader("Content-Length", pdfBuffer.length);
      res.end(pdfBuffer);

    } catch (error: any) {
      console.error("CRITICAL PDF ERROR:", error);
      // If we haven't sent headers yet, send a JSON error
      if (!res.headersSent) {
        res.status(500).json({ 
          error: "Failed to generate PDF", 
          details: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
      }
    } finally {
      if (browser) {
        try {
          await browser.close();
        } catch (e) {
          console.error("Error closing puppeteer:", e);
        }
      }
    }
  }

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
