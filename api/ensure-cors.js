// api/ensure-cors.js
// Vercel serverless function — runs in Node.js, not the browser.
// Calls PutBucketCors on your R2 bucket so the browser can access it.
// Called once on app startup. Idempotent — safe to call many times.

import {
  S3Client,
  PutBucketCorsCommand,
} from '@aws-sdk/client-s3';

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

export default async function handler(req, res) {
  // Allow the browser to call this endpoint from any origin
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const bucket = process.env.VITE_R2_BUCKET;

  if (!process.env.VITE_R2_ACCOUNT_ID || !bucket) {
    return res.status(500).json({ error: 'R2 env vars not configured on Vercel' });
  }

  try {
    const client = makeClient();

    await client.send(new PutBucketCorsCommand({
      Bucket: bucket,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedOrigins: ['*'],
            AllowedMethods: ['GET', 'PUT', 'DELETE', 'HEAD'],
            AllowedHeaders: ['*'],
            ExposeHeaders:  ['ETag'],
            MaxAgeSeconds:  86400,
          },
        ],
      },
    }));

    return res.status(200).json({ ok: true, message: 'CORS policy applied to R2 bucket.' });
  } catch (err) {
    console.error('ensure-cors error:', err);
    return res.status(500).json({ error: err.message });
  }
}
