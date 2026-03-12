
// api/r2.js — Vercel serverless function
// All R2 operations proxied server-side. Browser never talks to R2 directly.
// Handles: list, delete, presign-get, presign-put, ensure-cors

import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  PutBucketCorsCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

function makeClient() {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.VITE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId:     process.env.VITE_R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.VITE_R2_SECRET_ACCESS_KEY,
    },
    forcePathStyle: true,
  });
}

const BUCKET = () => process.env.VITE_R2_BUCKET;

const VIDEO_RE = /\.(mp4|mov|mkv|webm|avi|m4v|flv|wmv)$/i;

export default async function handler(req, res) {
  // ── CORS headers so browser can always call /api/r2 ──
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action, key, type } = req.query;

  if (!process.env.VITE_R2_ACCOUNT_ID || !BUCKET()) {
    return res.status(500).json({ error: 'R2 env vars not set on Vercel' });
  }

  const client = makeClient();

  try {
    // ── List videos ──────────────────────────────────────────────────
    if (action === 'list') {
      const result = await client.send(
        new ListObjectsV2Command({ Bucket: BUCKET() })
      );
      const items = (result.Contents || [])
        .filter(o => VIDEO_RE.test(o.Key))
        .map(o => ({ key: o.Key, size: o.Size, lastModified: o.LastModified }));
      return res.status(200).json({ items });
    }

    // ── Delete ───────────────────────────────────────────────────────
    if (action === 'delete') {
      if (!key) return res.status(400).json({ error: 'key required' });
      await client.send(new DeleteObjectCommand({ Bucket: BUCKET(), Key: key }));
      return res.status(200).json({ ok: true });
    }

    // ── Presigned GET URL (download) ─────────────────────────────────
    if (action === 'presign-get') {
      if (!key) return res.status(400).json({ error: 'key required' });
      const url = await getSignedUrl(
        client,
        new GetObjectCommand({ Bucket: BUCKET(), Key: key }),
        { expiresIn: 3600 }
      );
      return res.status(200).json({ url });
    }

    // ── Presigned PUT URL (upload) ───────────────────────────────────
    if (action === 'presign-put') {
      if (!key) return res.status(400).json({ error: 'key required' });
      const url = await getSignedUrl(
        client,
        new PutObjectCommand({
          Bucket:      BUCKET(),
          Key:         key,
          ContentType: type || 'application/octet-stream',
        }),
        { expiresIn: 3600 }
      );
      return res.status(200).json({ url });
    }

    // ── Set CORS on R2 bucket (server-to-server, safe) ───────────────
    if (action === 'ensure-cors') {
      await client.send(new PutBucketCorsCommand({
        Bucket: BUCKET(),
        CORSConfiguration: {
          CORSRules: [{
            AllowedOrigins: ['*'],
            AllowedMethods: ['GET', 'PUT', 'DELETE', 'HEAD'],
            AllowedHeaders: ['*'],
            ExposeHeaders:  ['ETag'],
            MaxAgeSeconds:  86400,
          }],
        },
      }));
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: `Unknown action: ${action}` });

  } catch (err) {
    console.error(`[r2 api] action=${action} error:`, err.message);
    return res.status(500).json({ error: err.message });
  }
}
