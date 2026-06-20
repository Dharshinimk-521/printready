
// Azure Blob Storage integration.
// Two things this file does:
//   uploadToAzure(buffer, filename, mimeType) → stores file, returns blob name
//   getDownloadUrl(blobName)                  → returns 1-hour SAS download link
//deleteFromAzure()->removes the blob if job fails mid pipeline

const {
  BlobServiceClient,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
  StorageSharedKeyCredential,
} = require("@azure/storage-blob");

const { v4: uuidv4 } = require("uuid");
const logger = require("../utils/logger");


const CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const CONTAINER_NAME    = process.env.AZURE_CONTAINER_NAME || "printready-uploads";

// create the client once and reuse it

let containerClient = null;

function getContainerClient() {
  // If we already created it, return the existing one
  if (containerClient) return containerClient;

  if (!CONNECTION_STRING) {
    throw new Error(
      "AZURE_STORAGE_CONNECTION_STRING is missing from .env — " 
    );
  }

  const blobServiceClient = BlobServiceClient.fromConnectionString(
    CONNECTION_STRING
  );

  containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
  return containerClient;
}

//uploadToAzure()
// Takes a Buffer (raw file bytes) and uploads it to Azure.
// Returns the blob name (NOT the full URL — we store names in DB,
// generate URLs on demand so they're always fresh)
async function uploadToAzure(buffer, originalFilename, mimeType = "application/octet-stream") {
  const container = getContainerClient();

  // Prefix with UUID so two users uploading "logo.png" never collide
  // e.g. "a3f8c2d1-logo.png"
  const blobName   = `${uuidv4()}-${sanitise(originalFilename)}`;
  const blobClient = container.getBlockBlobClient(blobName);

  await blobClient.uploadData(buffer, {
    blobHTTPHeaders: { blobContentType: mimeType },
  });

  logger.info(`Uploaded to Azure: ${blobName}`);
  return blobName; // save this to PostgreSQL
}

// ─ getDownloadUrl ─
// Generates a time-limited-1hr SAS URL for a stored blob.

async function getDownloadUrl(blobName, expiryMinutes = 60) {
  if (!blobName) return null;

  const container  = getContainerClient();
  const blobClient = container.getBlobClient(blobName);

  // Parse account name and key from connection string
  // Azure SDK needs these to sign the SAS token
  const account    = parseAccountName(CONNECTION_STRING);
  const accountKey = parseAccountKey(CONNECTION_STRING);

  if (!account || !accountKey) {
    // Fallback: return the plain URL (works if container is set to public)
    return blobClient.url;
  }

  const credential = new StorageSharedKeyCredential(account, accountKey);

  const sasOptions = {
    containerName: CONTAINER_NAME,
    blobName,
    permissions:  BlobSASPermissions.parse("r"), // r = read only
    startsOn:     new Date(),
    expiresOn:    new Date(Date.now() + expiryMinutes * 60 * 1000),
  };

  const sasToken = generateBlobSASQueryParameters(
    sasOptions,
    credential
  ).toString();

  return `${blobClient.url}?${sasToken}`;
}

// ── deleteFromAzure ──
// Removes a blob — called if a job fails mid-pipeline
// so we don't leave disowned files in storage
async function deleteFromAzure(blobName) {
  if (!blobName) return;
  try {
    const container = getContainerClient();
    await container.getBlockBlobClient(blobName).deleteIfExists();
    logger.info(`Deleted from Azure: ${blobName}`);
  } catch (err) {
    logger.warn(`Could not delete blob ${blobName}: ${err.message}`);
  }
}

// Remove special characters from filenames so Azure accepts them
function sanitise(filename) {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, "_") // replace anything odd with _
    .substring(0, 80);                 // max 80 chars
}

// Connection strings look like:
// DefaultEndpointsProtocol=https;AccountName=xxx;AccountKey=yyy;...
function parseAccountName(connStr) {
  const match = connStr?.match(/AccountName=([^;]+)/);
  return match ? match[1] : null;
}

function parseAccountKey(connStr) {
  const match = connStr?.match(/AccountKey=([^;]+)/);
  return match ? match[1] : null;
}

module.exports = { uploadToAzure, getDownloadUrl, deleteFromAzure };