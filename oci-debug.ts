
import crypto from 'crypto';
import https from 'https';
import http from 'http';

// OCI Configuration from environment
const OCI_REGION = (process.env.OCI_REGION || 'ap-hyderabad-1').trim();
const OCI_NAMESPACE = (process.env.OCI_NAMESPACE || 'axlcprs8kzil').trim();
const OCI_BUCKET = (process.env.OCI_BUCKET || 'kmcult26-photos').trim();
const OCI_TENANCY_OCID = (process.env.OCI_TENANCY_OCID || '').trim();
const OCI_USER_OCID = (process.env.OCI_USER_OCID || '').trim();
const OCI_FINGERPRINT = (process.env.OCI_FINGERPRINT || '').trim();

function mask(str: string) {
  if (!str) return 'MISSING';
  if (str.length < 15) return 'TOO_SHORT';
  return str.substring(0, 10) + '...' + str.substring(str.length - 10);
}

const getPrivateKey = () => {
  const rawKey = process.env.OCI_PRIVATE_KEY || process.env.OCI_PRIVATE_KEY_PEM;
  if (!rawKey) return null;
  let normalized = rawKey.trim();
  if ((normalized.startsWith('"') && normalized.endsWith('"')) || (normalized.startsWith("'") && normalized.endsWith("'"))) {
    normalized = normalized.substring(1, normalized.length - 1).trim();
  }
  const headerMatch = normalized.match(/-----BEGIN ([^-]+)-----/);
  const footerMatch = normalized.match(/-----END ([^-]+)-----/);
  const header = headerMatch ? headerMatch[0] : null;
  const footer = footerMatch ? footerMatch[0] : null;
  const keyType = headerMatch ? headerMatch[1] : 'PRIVATE KEY';
  let content = normalized;
  if (header) content = content.replace(header, '');
  if (footer) content = content.replace(footer, '');
  content = content.replace(/\\n/g, '\n').replace(/\s+/g, '');
  const finalKey = `-----BEGIN ${keyType}-----\n${content}\n-----END ${keyType}-----`;
  try {
    return crypto.createPrivateKey({ key: finalKey, format: 'pem' });
  } catch (err) { return null; }
};

function signOciRequest(method: string, path: string, host: string, dateHeader: string) {
  const keyObject = getPrivateKey();
  if (!keyObject) throw new Error("Private key missing or invalid");

  const headersToSign = ['date', '(request-target)', 'host'];
  const headerValues: Record<string, string> = { 
    date: dateHeader, 
    '(request-target)': `${method.toLowerCase()} ${path}`, 
    host: host 
  };
  const signingString = headersToSign.map(hdr => `${hdr}: ${headerValues[hdr]}`).join('\n');
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signingString);
  const signature = signer.sign(keyObject, 'base64');
  const keyId = `${OCI_TENANCY_OCID}/${OCI_USER_OCID}/${OCI_FINGERPRINT}`;
  return `Signature algorithm="rsa-sha256",headers="${headersToSign.join(' ')}",keyId="${keyId}",signature="${signature}"`;
}

async function ociTest(method: string, path: string): Promise<{ statusCode: number; body: string; requestId: string }> {
  const host = `objectstorage.${OCI_REGION}.oraclecloud.com`;
  const dateHeader = new Date().toUTCString();
  const auth = signOciRequest(method, path, host, dateHeader);

  return new Promise((resolve) => {
    const options = {
      hostname: host,
      port: 443,
      path: path,
      method: method,
      headers: {
        'Date': dateHeader,
        'Authorization': auth,
        'Host': host,
      },
      timeout: 5000
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => resolve({ 
        statusCode: res.statusCode || 0, 
        body, 
        requestId: (res.headers['opc-request-id'] as string) || 'UNKNOWN' 
      }));
    });
    req.on('error', e => resolve({ statusCode: 500, body: e.message, requestId: 'ERROR' }));
    req.end();
  });
}

async function run() {
  console.log("--- OCI DEBUG START ---");
  console.log(`Region: ${OCI_REGION}`);
  console.log(`Namespace: ${OCI_NAMESPACE}`);
  console.log(`Bucket: ${OCI_BUCKET}`);
  console.log(`Tenancy OCID: ${mask(OCI_TENANCY_OCID)}`);
  console.log(`User OCID: ${mask(OCI_USER_OCID)}`);
  console.log(`Fingerprint: ${OCI_FINGERPRINT}`);

  // 1. HeadBucket
  console.log("\nTesting HeadBucket...");
  const headRes = await ociTest('HEAD', `/n/${OCI_NAMESPACE}/b/${OCI_BUCKET}`);
  console.log(`Status: ${headRes.statusCode}, RequestID: ${headRes.requestId}`);

  // 2. GetBucket
  console.log("\nTesting GetBucket...");
  const getRes = await ociTest('GET', `/n/${OCI_NAMESPACE}/b/${OCI_BUCKET}`);
  console.log(`Status: ${getRes.statusCode}, RequestID: ${getRes.requestId}`);
  if (getRes.statusCode !== 200) console.log(`Body: ${getRes.body}`);

  // 3. ListObjects
  console.log("\nTesting ListObjects...");
  const listRes = await ociTest('GET', `/n/${OCI_NAMESPACE}/b/${OCI_BUCKET}/o`);
  console.log(`Status: ${listRes.statusCode}, RequestID: ${listRes.requestId}`);
  if (listRes.statusCode !== 200) console.log(`Body: ${listRes.body}`);

  // 4. GetNamespace (Discovery test)
  console.log("\nTesting GetNamespace...");
  const nsRes = await ociTest('GET', '/n');
  console.log(`Status: ${nsRes.statusCode}, Discovered: ${nsRes.body.trim().replace(/"/g, '')}`);

  console.log("\n--- OCI DEBUG END ---");
}

run();
