
import crypto from 'crypto';

const OCI_TENANCY_OCID = (process.env.OCI_TENANCY_OCID || 'ocid1.tenancy.oc1..aaaaaaaazt3ayifh4oeebxzwugqixhl4szosgf5massplzbesikpduybjlga').trim();
const OCI_USER_OCID = (process.env.OCI_USER_OCID || 'ocid1.user.oc1..aaaaaaaaqznnkb5k5nvenohuft73744ooteeurl2c2fi245eeukecz3xfida').trim();
const OCI_FINGERPRINT = (process.env.OCI_FINGERPRINT || '0a:ca:c6:db:90:2d:3d:27:a3:0a:88:e6:d0:b6:f7:a1').trim();

function mask(str: string) {
  if (!str) return 'MISSING';
  return str.substring(0, 10) + '...' + str.substring(str.length - 10);
}

console.log("--- CONFIG VERIFICATION ---");
console.log(`Tenancy OCID: ${mask(OCI_TENANCY_OCID)}`);
console.log(`User OCID: ${mask(OCI_USER_OCID)}`);
console.log(`Fingerprint: ${OCI_FINGERPRINT}`);
console.log("--- END CONFIG ---");
