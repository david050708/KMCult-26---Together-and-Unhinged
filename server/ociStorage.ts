import crypto from 'crypto';
import https from 'https';
import http from 'http';

// OCI Configuration from prompt specification
const OCI_REGION = (process.env.OCI_REGION || 'ap-hyderabad-1').trim();
const OCI_NAMESPACE = (process.env.OCI_NAMESPACE || 'axlcprs8kzil').trim();
const OCI_BUCKET = (process.env.OCI_BUCKET || 'kmcult26-photos').trim();
const OCI_TENANCY_OCID = (process.env.OCI_TENANCY_OCID || 'ocid1.tenancy.oc1..aaaaaaaazt3ayifh4oeebxzwugqixhl4szosgf5massplzbesikpduybjlga').trim();
const OCI_USER_OCID = (process.env.OCI_USER_OCID || 'ocid1.user.oc1..aaaaaaaaqznnkb5k5nvenohuft73744ooteeurl2c2fi245eeukecz3xfida').trim();
const OCI_FINGERPRINT = (process.env.OCI_FINGERPRINT || '0a:ca:c6:db:90:2d:3d:27:a3:0a:88:e6:d0:b6:f7:a1').trim();

// Health monitoring state
let lastSuccessfulOperationTime: string | null = null;
let consecutiveFailures = 0;
let lastLatencyMs = 0;
let discoveredNamespace: string | null = null;
let isBucketAvailable: boolean | null = null;

export interface OciHealthReport {
  status: 'operational' | 'unconfigured' | 'unavailable' | 'degraded';
  bucket: string;
  namespace: string;
  region: string;
  isConfigured: boolean;
  lastCheckTime: string;
  lastSuccessfulOperationTime: string | null;
  consecutiveFailures: number;
  latencyMs: number;
  details: string;
  diagnostics?: {
    secretFound: boolean;
    pemParsed: boolean;
    signingTested: boolean;
    authVerified: boolean;
    bucketVerified: boolean;
    bucketCreated?: boolean;
    error?: string;
    discoveredNamespace?: string;
    tenancyOcid?: string;
    userOcid?: string;
    fingerprint?: string;
  };
}

/**
 * Robustly load and normalize the OCI Private Key from environment variables.
 * Handles literal \n sequences, surrounding quotes, and missing headers.
 */
const getPrivateKey = (): { key: string; keyObject: crypto.KeyObject; error?: string; diag?: any } | null => {
  const rawKey = process.env.OCI_PRIVATE_KEY || process.env.OCI_PRIVATE_KEY_PEM;
  if (!rawKey) return null;
  
  const diag: any = {
    hasLiteralNewlines: rawKey.includes('\\n'),
    hasActualNewlines: rawKey.includes('\n'),
  };

  // 1. Initial clean up: remove surrounding quotes and trim
  let normalized = rawKey.trim();
  if ((normalized.startsWith('"') && normalized.endsWith('"')) || 
      (normalized.startsWith("'") && normalized.endsWith("'"))) {
    normalized = normalized.substring(1, normalized.length - 1).trim();
  }

  // 2. Extract Header/Footer if present to determine format
  const headerMatch = normalized.match(/-----BEGIN ([^-]+)-----/);
  const footerMatch = normalized.match(/-----END ([^-]+)-----/);
  
  const header = headerMatch ? headerMatch[0] : null;
  const footer = footerMatch ? footerMatch[0] : null;
  const keyType = headerMatch ? headerMatch[1] : 'PRIVATE KEY';

  // 3. Extract the Base64 content
  let content = normalized;
  if (header) content = content.replace(header, '');
  if (footer) content = content.replace(footer, '');

  // 4. Clean the content blob
  content = content.replace(/\\n/g, '\n');
  content = content.replace(/\s+/g, '');

  // 5. Reconstruct standard PEM format
  const finalKey = `-----BEGIN ${keyType}-----\n${content}\n-----END ${keyType}-----`;

  // 6. Validate with crypto.createPrivateKey
  try {
    const keyObject = crypto.createPrivateKey({
      key: finalKey,
      format: 'pem',
    });
    return { key: finalKey, keyObject, diag };
  } catch (err: any) {
    return { key: finalKey, keyObject: null as any, error: err.message, diag };
  }
};

export function isOciConfigured(): boolean {
  const res = getPrivateKey();
  return Boolean(res && res.keyObject && OCI_TENANCY_OCID && OCI_USER_OCID && OCI_FINGERPRINT);
}

export function isOciOperational(): boolean {
  return isOciConfigured() && isBucketAvailable !== false;
}

export function markOciBucketUnavailable(reason?: string) {
  isBucketAvailable = false;
  if (reason) {
    console.warn(`[OCI Storage] Bucket marked unavailable: ${reason}`);
  }
}

function recordSuccess(latency: number) {
  lastSuccessfulOperationTime = new Date().toISOString();
  consecutiveFailures = 0;
  lastLatencyMs = latency;
}

function recordFailure() {
  consecutiveFailures += 1;
}

/**
 * Sign an OCI REST API request using RSA-SHA256
 */
function signOciRequest(
  method: string,
  requestTarget: string,
  host: string,
  dateHeader: string,
  bodyBuffer?: Buffer,
  contentType?: string
): string {
  const keyData = getPrivateKey();
  if (!keyData || !keyData.keyObject) {
    throw new Error(`OCI Private Key is invalid: ${keyData?.error || 'Missing'}`);
  }

  const headersToSign = ['date', '(request-target)', 'host'];
  const headerValues: Record<string, string> = {
    date: dateHeader,
    '(request-target)': `${method.toLowerCase()} ${requestTarget}`,
    host: host,
  };

  if (bodyBuffer && (method === 'PUT' || method === 'POST')) {
    const hash = crypto.createHash('sha256').update(bodyBuffer).digest('base64');
    headersToSign.push('content-length', 'content-type', 'x-content-sha256');
    headerValues['content-length'] = String(bodyBuffer.length);
    headerValues['content-type'] = contentType || 'application/octet-stream';
    headerValues['x-content-sha256'] = hash;
  }

  const signingString = headersToSign
    .map((hdr) => `${hdr}: ${headerValues[hdr]}`)
    .join('\n');

  let signature: string;
  try {
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(signingString);
    signer.end();
    signature = signer.sign(keyData.keyObject, 'base64');
  } catch (err: any) {
    throw new Error(`OCI Signing failed: ${err.message}`);
  }

  const keyId = `${OCI_TENANCY_OCID}/${OCI_USER_OCID}/${OCI_FINGERPRINT}`;
  const headersString = headersToSign.join(' ');

  return `Signature algorithm="rsa-sha256",headers="${headersString}",keyId="${keyId}",signature="${signature}"`;
}

/**
 * Make an authenticated HTTPS request to OCI Object Storage REST API (Internal)
 */
async function ociRequestExtended(
  method: string,
  path: string,
  options: {
    bodyBuffer?: Buffer;
    contentType?: string;
    ifMatch?: string;
    timeout?: number;
  } = {}
): Promise<{ statusCode: number; headers: http.IncomingHttpHeaders; body: Buffer }> {
  const startTime = Date.now();
  const host = `objectstorage.${OCI_REGION}.oraclecloud.com`;
  const dateHeader = new Date().toUTCString();

  const authorization = signOciRequest(
    method,
    path,
    host,
    dateHeader,
    options.bodyBuffer,
    options.contentType
  );

  const headersObj: Record<string, any> = {
    'Date': dateHeader,
    'Authorization': authorization,
    'Host': host,
  };

  if (options.ifMatch) {
    headersObj['If-Match'] = options.ifMatch;
  }

  if (options.bodyBuffer && (method === 'PUT' || method === 'POST')) {
    headersObj['Content-Length'] = options.bodyBuffer.length;
    headersObj['Content-Type'] = options.contentType || 'application/octet-stream';
    headersObj['x-content-sha256'] = crypto.createHash('sha256').update(options.bodyBuffer).digest('base64');
  }

  const requestOptions: https.RequestOptions = {
    hostname: host,
    port: 443,
    path: path,
    method: method,
    headers: headersObj,
    timeout: options.timeout || 10000,
  };

  return new Promise((resolve, reject) => {
    const req = https.request(requestOptions, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const body = Buffer.concat(chunks);
        const duration = Date.now() - startTime;
        if (res.statusCode && res.statusCode < 500) {
          recordSuccess(duration);
        } else {
          recordFailure();
        }
        resolve({
          statusCode: res.statusCode || 500,
          headers: res.headers,
          body,
        });
      });
    });

    req.on('error', (err) => {
      recordFailure();
      reject(err);
    });

    req.on('timeout', () => {
      req.destroy(new Error(`OCI request timed out after ${requestOptions.timeout}ms.`));
    });

    if (options.bodyBuffer && (method === 'PUT' || method === 'POST')) {
      req.write(options.bodyBuffer);
    }
    req.end();
  });
}

/**
 * Attempt to auto-create the OCI bucket if it does not already exist
 */
export async function tryCreateBucket(): Promise<boolean> {
  if (!isOciConfigured()) return false;
  const ns = discoveredNamespace || OCI_NAMESPACE;
  const path = `/n/${ns}/b/`;
  const body = Buffer.from(JSON.stringify({
    name: OCI_BUCKET,
    compartmentId: OCI_TENANCY_OCID,
    publicAccessType: 'NoPublicAccess',
  }), 'utf-8');

  try {
    const res = await ociRequestExtended('POST', path, {
      bodyBuffer: body,
      contentType: 'application/json',
      timeout: 6000
    });
    if (res.statusCode === 200 || res.statusCode === 201 || res.statusCode === 409) {
      isBucketAvailable = true;
      return true;
    }
  } catch {}
  return false;
}

/**
 * Upload an object
 */
export async function uploadToOci(
  objectName: string,
  buffer: Buffer,
  contentType: string
): Promise<{ objectKey: string; bucket: string; region: string }> {
  if (!isOciConfigured()) {
    throw new Error('Oracle Cloud Object Storage is unconfigured: OCI Private Key is missing.');
  }
  if (isBucketAvailable === false) {
    throw new Error(`Oracle Cloud Object Storage bucket ${OCI_BUCKET} is not accessible.`);
  }

  const cleanKey = objectName.replace(/^\/+/, '');
  const ns = discoveredNamespace || OCI_NAMESPACE;
  const path = `/n/${ns}/b/${OCI_BUCKET}/o/${cleanKey}`;
  const res = await ociRequestExtended('PUT', path, {
    bodyBuffer: buffer,
    contentType
  });

  if (res.statusCode !== 200 && res.statusCode !== 201) {
    const errText = res.body.toString('utf-8');
    if (res.statusCode === 404 && errText.includes('BucketNotFound')) {
      markOciBucketUnavailable('BucketNotFound');
      console.warn(`[OCI Storage] Bucket '${OCI_BUCKET}' not found in namespace '${ns}'. Falling back to local storage.`);
    } else {
      console.error(`[OCI Storage] Upload failed (${res.statusCode}). Path: ${path}. Response:`, errText);
    }
    throw new Error(`OCI Upload failed (${res.statusCode}): ${errText}`);
  }

  isBucketAvailable = true;
  return { objectKey: cleanKey, bucket: OCI_BUCKET, region: OCI_REGION };
}

/**
 * Download an object
 */
export async function getFromOci(objectKey: string): Promise<{ buffer: Buffer; contentType: string }> {
  if (!isOciConfigured()) {
    throw new Error('Oracle Cloud Object Storage is unconfigured: OCI Private Key is missing.');
  }
  if (isBucketAvailable === false) {
    throw new Error(`Oracle Cloud Object Storage bucket ${OCI_BUCKET} is not accessible.`);
  }

  const cleanKey = objectKey.replace(/^\/+/, '');
  const ns = discoveredNamespace || OCI_NAMESPACE;
  const path = `/n/${ns}/b/${OCI_BUCKET}/o/${cleanKey}`;
  const res = await ociRequestExtended('GET', path);

  if (res.statusCode !== 200) {
    throw new Error(`OCI Download failed (${res.statusCode}) for ${cleanKey}`);
  }

  return {
    buffer: res.body,
    contentType: (res.headers['content-type'] as string) || 'image/jpeg',
  };
}

/**
 * Delete an object
 */
export async function deleteFromOci(objectKey: string): Promise<boolean> {
  if (!isOciConfigured()) {
    return false;
  }
  if (isBucketAvailable === false) {
    return false;
  }
  const cleanKey = objectKey.replace(/^\/+/, '');
  const ns = discoveredNamespace || OCI_NAMESPACE;
  const path = `/n/${ns}/b/${OCI_BUCKET}/o/${cleanKey}`;
  try {
    const res = await ociRequestExtended('DELETE', path);
    // 204 No Content, 200 OK, or 404 (already gone / idempotent) are considered successful deletion
    if (res.statusCode === 204 || res.statusCode === 200 || res.statusCode === 404) {
      return true;
    }
    const errText = res.body.toString('utf-8');
    throw new Error(`OCI DELETE failed (${res.statusCode}): ${errText}`);
  } catch (err: any) {
    // If it's a network timeout or connection refused, log and throw
    console.error(`[OCI Storage] Failed to delete object '${cleanKey}' from bucket '${OCI_BUCKET}':`, err.message || err);
    throw err;
  }
}

/**
 * List all objects
 */
export async function listOciObjects(): Promise<{ objects: Array<{ name: string; size: number }>; totalSize: number }> {
  if (!isOciConfigured()) {
    throw new Error('Oracle Cloud Object Storage is unconfigured: OCI Private Key is missing.');
  }
  if (isBucketAvailable === false) {
    return { objects: [], totalSize: 0 };
  }

  const ns = discoveredNamespace || OCI_NAMESPACE;
  const allObjects: Array<{ name: string; size: number }> = [];
  let nextStart: string | null = null;
  let pageCount = 0;

  do {
    let path = `/n/${ns}/b/${OCI_BUCKET}/o?limit=1000`;
    if (nextStart) {
      path += `&start=${encodeURIComponent(nextStart)}`;
    }

    const res = await ociRequestExtended('GET', path);

    if (res.statusCode !== 200) {
      const errText = res.body.toString('utf-8');
      if (res.statusCode === 404 && errText.includes('BucketNotFound')) {
        markOciBucketUnavailable('BucketNotFound');
        console.warn(`[OCI Storage] Bucket '${OCI_BUCKET}' not found in namespace '${ns}'. Falling back to local calculation.`);
        return { objects: [], totalSize: 0 };
      }
      console.error(`[OCI Storage] List Objects failed (${res.statusCode}). Path: ${path}. Response:`, errText);
      throw new Error(`OCI List Objects failed (${res.statusCode}): ${errText}`);
    }

    isBucketAvailable = true;
    const json = JSON.parse(res.body.toString('utf-8'));
    const pageObjs = (json.objects || []).map((o: any) => ({
      name: o.name,
      size: Number(o.size || 0),
    }));

    allObjects.push(...pageObjs);
    nextStart = json.nextStartWith || null;
    pageCount++;
  } while (nextStart && pageCount < 50);

  const totalSize = allObjects.reduce((sum, o) => sum + o.size, 0);
  return { objects: allObjects, totalSize };
}

/**
 * Robustly get a JSON object with its ETag
 */
export async function getJsonFromOci<T>(objectKey: string): Promise<{ data: T; etag: string } | null> {
  if (!isOciConfigured() || isBucketAvailable === false) {
    return null;
  }

  const cleanKey = objectKey.replace(/^\/+/, '');
  const ns = discoveredNamespace || OCI_NAMESPACE;
  const path = `/n/${ns}/b/${OCI_BUCKET}/o/${cleanKey}`;
  
  try {
    const res = await ociRequestExtended('GET', path);
    if (res.statusCode === 404) {
      const body = res.body.toString('utf-8');
      if (body.includes('BucketNotFound')) {
        markOciBucketUnavailable('BucketNotFound');
      }
      return null;
    }
    if (res.statusCode !== 200) {
      throw new Error(`Failed to load JSON ${objectKey} (${res.statusCode})`);
    }
    
    return {
      data: JSON.parse(res.body.toString('utf-8')) as T,
      etag: (res.headers.etag as string) || ''
    };
  } catch (err: any) {
    console.warn(`[OCI Storage] JSON fetch warning (${objectKey}):`, err.message);
    return null;
  }
}

/**
 * Optimistically update a JSON object using If-Match ETag
 */
export async function putJsonToOci(objectKey: string, data: any, ifMatch?: string): Promise<{ etag: string }> {
  if (!isOciConfigured()) {
    throw new Error('Oracle Cloud Object Storage is unconfigured: OCI Private Key is missing.');
  }
  if (isBucketAvailable === false) {
    throw new Error(`Oracle Cloud Object Storage bucket ${OCI_BUCKET} is not accessible.`);
  }

  const cleanKey = objectKey.replace(/^\/+/, '');
  const ns = discoveredNamespace || OCI_NAMESPACE;
  const path = `/n/${ns}/b/${OCI_BUCKET}/o/${cleanKey}`;
  const buffer = Buffer.from(JSON.stringify(data, null, 2), 'utf-8');
  
  const res = await ociRequestExtended('PUT', path, {
    bodyBuffer: buffer,
    contentType: 'application/json',
    ifMatch
  });

  if (res.statusCode === 412) {
    throw new Error('Concurrency conflict: The object was modified by another process.');
  }

  if (res.statusCode !== 200 && res.statusCode !== 201) {
    const errText = res.body.toString('utf-8');
    if (res.statusCode === 404 && errText.includes('BucketNotFound')) {
      markOciBucketUnavailable('BucketNotFound');
      console.warn(`[OCI Storage] JSON Upload target bucket ${OCI_BUCKET} not found (404). Falling back to local storage.`);
    }
    throw new Error(`OCI JSON Upload failed (${res.statusCode}): ${errText}`);
  }

  isBucketAvailable = true;
  return { etag: (res.headers.etag as string) || '' };
}

/**
 * 24/7 Lightweight Health Check Service for Oracle Cloud Object Storage
 */
export async function checkOciStorageHealth(): Promise<OciHealthReport> {
  const now = new Date().toISOString();
  const diag: any = {
    secretFound: false,
    pemParsed: false,
    signingTested: false,
    authVerified: false,
    bucketVerified: false,
  };
  
  const mask = (s: string) => s ? `${s.substring(0, 10)}...${s.substring(s.length - 10)}` : 'MISSING';
  
  diag.tenancyOcid = mask(OCI_TENANCY_OCID);
  diag.userOcid = mask(OCI_USER_OCID);
  diag.fingerprint = OCI_FINGERPRINT;

  const rawKey = process.env.OCI_PRIVATE_KEY || process.env.OCI_PRIVATE_KEY_PEM;
  diag.secretFound = !!rawKey;

  const keyData = getPrivateKey();
  if (keyData) {
    diag.pemParsed = !!(keyData && keyData.keyObject);
    if (keyData.error) diag.error = keyData.error;
  }

  if (!diag.secretFound) {
    return {
      status: 'unconfigured',
      bucket: OCI_BUCKET,
      namespace: OCI_NAMESPACE,
      region: OCI_REGION,
      isConfigured: false,
      lastCheckTime: now,
      lastSuccessfulOperationTime,
      consecutiveFailures,
      latencyMs: 0,
      details: 'OCI_PRIVATE_KEY is missing from environment variables.',
      diagnostics: diag,
    };
  }

  if (!diag.pemParsed) {
    return {
      status: 'unavailable',
      bucket: OCI_BUCKET,
      namespace: OCI_NAMESPACE,
      region: OCI_REGION,
      isConfigured: true,
      lastCheckTime: now,
      lastSuccessfulOperationTime,
      consecutiveFailures,
      latencyMs: 0,
      details: `OCI Private Key PEM normalization failed: ${diag.error}`,
      diagnostics: diag,
    };
  }

  // Test Authentication via Namespace Discovery
  try {
    const nsRes = await ociRequestExtended('GET', '/n');
    if (nsRes.statusCode === 200) {
      diag.authVerified = true;
      discoveredNamespace = nsRes.body.toString().trim().replace(/"/g, '');
      diag.discoveredNamespace = discoveredNamespace;
      
      // 1. HeadBucket Test
      const headRes = await ociRequestExtended('HEAD', `/n/${discoveredNamespace}/b/${OCI_BUCKET}`);
      diag.headBucketStatus = headRes.statusCode;
      diag.headBucketRequestId = headRes.headers['opc-request-id'];

      // 2. GetBucket Test
      const getRes = await ociRequestExtended('GET', `/n/${discoveredNamespace}/b/${OCI_BUCKET}`);
      diag.getBucketStatus = getRes.statusCode;
      diag.getBucketRequestId = getRes.headers['opc-request-id'];

      // 3. ListObjects Test
      const listRes = await ociRequestExtended('GET', `/n/${discoveredNamespace}/b/${OCI_BUCKET}/o`);
      diag.listObjectsStatus = listRes.statusCode;
      diag.listObjectsRequestId = listRes.headers['opc-request-id'];

      // 4. ListBuckets Test (Discovery of what the user CAN see)
      const listBucketsRes = await ociRequestExtended('GET', `/n/${discoveredNamespace}/b?compartmentId=${OCI_TENANCY_OCID}`);
      diag.listBucketsStatus = listBucketsRes.statusCode;
      diag.listBucketsBody = listBucketsRes.statusCode === 200 ? listBucketsRes.body.toString() : 'Failed';
      
      if (headRes.statusCode === 200 || getRes.statusCode === 200) {
        diag.bucketVerified = true;
        diag.actualBucket = OCI_BUCKET;
        isBucketAvailable = true;
        
        const status = listRes.statusCode === 200 ? 'operational' : 'degraded';
        const details = listRes.statusCode === 200 
          ? 'OCI Storage is fully operational.' 
          : `Bucket accessible (HEAD:${headRes.statusCode}), but ListObjects failed (${listRes.statusCode}). Check OBJECT_LIST permissions.`;

        return {
          status: consecutiveFailures > 0 ? 'degraded' : (status as any),
          bucket: OCI_BUCKET,
          namespace: discoveredNamespace,
          region: OCI_REGION,
          isConfigured: true,
          lastCheckTime: now,
          lastSuccessfulOperationTime,
          consecutiveFailures,
          latencyMs: lastLatencyMs,
          details,
          diagnostics: diag,
        };
      } else {
        // Attempt to create bucket automatically if missing
        if (headRes.statusCode === 404 || getRes.statusCode === 404) {
          const created = await tryCreateBucket();
          if (created) {
            diag.bucketVerified = true;
            diag.bucketCreated = true;
            isBucketAvailable = true;
            return {
              status: 'operational',
              bucket: OCI_BUCKET,
              namespace: discoveredNamespace,
              region: OCI_REGION,
              isConfigured: true,
              lastCheckTime: now,
              lastSuccessfulOperationTime,
              consecutiveFailures,
              latencyMs: lastLatencyMs,
              details: `OCI Storage bucket '${OCI_BUCKET}' initialized and verified.`,
              diagnostics: diag,
            };
          }
        }

        diag.bucketVerified = false;
        isBucketAvailable = false;
        return {
          status: 'unavailable',
          bucket: OCI_BUCKET,
          namespace: discoveredNamespace,
          region: OCI_REGION,
          isConfigured: true,
          lastCheckTime: now,
          lastSuccessfulOperationTime,
          consecutiveFailures,
          latencyMs: lastLatencyMs,
          details: `Bucket '${OCI_BUCKET}' not found in namespace '${discoveredNamespace}'. Local storage fallback active.`,
          diagnostics: diag,
        };
      }
    } else {
      diag.authVerified = false;
      return {
        status: 'unavailable',
        bucket: OCI_BUCKET,
        namespace: OCI_NAMESPACE,
        region: OCI_REGION,
        isConfigured: true,
        lastCheckTime: now,
        lastSuccessfulOperationTime,
        consecutiveFailures,
        latencyMs: lastLatencyMs,
        details: `OCI Authentication failed (${nsRes.statusCode}): ${nsRes.body.toString()}`,
        diagnostics: diag,
      };
    }
  } catch (err: any) {
    return {
      status: 'unavailable',
      bucket: OCI_BUCKET,
      namespace: OCI_NAMESPACE,
      region: OCI_REGION,
      isConfigured: true,
      lastCheckTime: now,
      lastSuccessfulOperationTime,
      consecutiveFailures,
      latencyMs: lastLatencyMs,
      details: `OCI API connection error: ${err.message}`,
      diagnostics: diag,
    };
  }
}
