
import crypto from 'crypto';
import https from 'https';

const OCI_REGION = process.env.OCI_REGION || 'ap-hyderabad-1';
const OCI_NAMESPACE = process.env.OCI_NAMESPACE || 'axlcprs8kzil';
const OCI_TENANCY_OCID = process.env.OCI_TENANCY_OCID || 'ocid1.tenancy.oc1..aaaaaaaazt3ayifh4oeebxzwugqixhl4szosgf5massplzbesikpduybjlga';
const OCI_USER_OCID = process.env.OCI_USER_OCID || 'ocid1.user.oc1..aaaaaaaaqznnkb5k5nvenohuft73744ooteeurl2c2fi245eeukecz3xfida';
const OCI_FINGERPRINT = process.env.OCI_FINGERPRINT || '0a:ca:c6:db:90:2d:3d:27:a3:0a:88:e6:d0:b6:f7:a1';

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
    const keyObject = crypto.createPrivateKey({ key: finalKey, format: 'pem' });
    return { keyObject };
  } catch (err) { return null; }
};

function signOciRequest(method, path, host, dateHeader) {
  const keyData = getPrivateKey();
  const headersToSign = ['date', '(request-target)', 'host'];
  const headerValues = { date: dateHeader, '(request-target)': `${method.toLowerCase()} ${path}`, host: host };
  const signingString = headersToSign.map(hdr => `${hdr}: ${headerValues[hdr]}`).join('\n');
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signingString);
  const signature = signer.sign(keyData.keyObject, 'base64');
  const keyId = `${OCI_TENANCY_OCID}/${OCI_USER_OCID}/${OCI_FINGERPRINT}`;
  return `Signature algorithm="rsa-sha256",headers="${headersToSign.join(' ')}",keyId="${keyId}",signature="${signature}"`;
}

async function request(region, path) {
  const host = `objectstorage.${region}.oraclecloud.com`;
  const dateHeader = new Date().toUTCString();
  const auth = signOciRequest('GET', path, host, dateHeader);
  return new Promise((resolve) => {
    const req = https.request({ hostname: host, port: 443, path, method: 'GET', headers: { 'Date': dateHeader, 'Authorization': auth, 'Host': host } }, (res) => {
      let body = ''; res.on('data', d => body += d); res.on('end', () => resolve({ statusCode: res.statusCode, body }));
    });
    req.on('error', e => resolve({ statusCode: 500, body: e.message }));
    req.end();
  });
}

async function run() {
  const nsRes = await request(OCI_REGION, '/n');
  const ns = nsRes.statusCode === 200 ? nsRes.body.trim().replace(/"/g, '') : OCI_NAMESPACE;
  console.log(`Discovered Namespace: ${ns}`);

  const variations = ['kmcult26-photos', 'kmcult26_photos', 'photos', 'kmcult26'];
  console.log(`\nTesting bucket variations in ${OCI_REGION}:`);
  for (const v of variations) {
    const res = await request(OCI_REGION, `/n/${ns}/b/${v}`);
    console.log(`Bucket '${v}': ${res.statusCode} ${res.statusCode !== 200 ? res.body : '(Found!)'}`);
  }

  console.log(`\nTesting list buckets (compartmentId: ${OCI_TENANCY_OCID}):`);
  const listRes = await request(OCI_REGION, `/n/${ns}/b?compartmentId=${OCI_TENANCY_OCID}`);
  console.log(`List status: ${listRes.statusCode}`);
  console.log(`List body: ${listRes.body}`);
}

run();
