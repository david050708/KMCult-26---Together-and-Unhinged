import type { Student } from '../types/index.ts';

/**
 * AUTHORITATIVE 150-STUDENT ROSTER FOR KMCult'26
 *
 * Source: Sole authoritative roster supplied for KMCult'26 MBBS batch.
 * Invariants:
 * - Exactly 150 students.
 * - Exact original order, numbering, spelling, initials, spaces, and punctuation preserved.
 * - Permanent, stable internal identifiers (kmc-001 through kmc-150).
 */
export const AUTHORITATIVE_ROSTER: Student[] = [
  { id: 'kmc-001', index: 1, name: 'AADHARSH S P', assigned: true },
  { id: 'kmc-002', index: 2, name: 'AASHAN V', assigned: true },
  { id: 'kmc-003', index: 3, name: 'ADARSHA R', assigned: true },
  { id: 'kmc-004', index: 4, name: 'ADHARSHRAMAN R J', assigned: true },
  { id: 'kmc-005', index: 5, name: 'ADITHYA V', assigned: true },
  { id: 'kmc-006', index: 6, name: 'AFSAL H', assigned: true },
  { id: 'kmc-007', index: 7, name: 'AKASH B', assigned: true },
  { id: 'kmc-008', index: 8, name: 'AKSHAYA M', assigned: true },
  { id: 'kmc-009', index: 9, name: 'AMIRTHAVARSHINI K', assigned: true },
  { id: 'kmc-010', index: 10, name: 'AMRUTHA S K', assigned: true },
  { id: 'kmc-011', index: 11, name: 'ANIRUDH SIVA S C', assigned: true },
  { id: 'kmc-012', index: 12, name: 'ANUJ SELVAKUMAR', assigned: true },
  { id: 'kmc-013', index: 13, name: 'ARASU A', assigned: true },
  { id: 'kmc-014', index: 14, name: 'ASHWADEV J P', assigned: true },
  { id: 'kmc-015', index: 15, name: 'ATULITH KRISHNA K', assigned: true },
  { id: 'kmc-016', index: 16, name: 'AVANTIKA SARAVANAN', assigned: true },
  { id: 'kmc-017', index: 17, name: 'BANOTHU SREEYAN SUJAN KUMAR', assigned: true },
  { id: 'kmc-018', index: 18, name: 'BATHMAPRIYA N', assigned: true },
  { id: 'kmc-019', index: 19, name: 'BHAVADHARANI SITTHARTHAN', assigned: true },
  { id: 'kmc-020', index: 20, name: 'BHUVANESWARAN S', assigned: true },
  { id: 'kmc-021', index: 21, name: 'CHARITHRA H', assigned: true },
  { id: 'kmc-022', index: 22, name: 'DANUSH V S', assigned: true },
  { id: 'kmc-023', index: 23, name: 'DARSHAN KUMAR SANKHLA', assigned: true },
  { id: 'kmc-024', index: 24, name: 'DAVESHWAR V.K', assigned: true },
  { id: 'kmc-025', index: 25, name: 'DAVID JEREMIAH S', assigned: true },
  { id: 'kmc-026', index: 26, name: 'DHANALAKSHMI.S', assigned: true },
  { id: 'kmc-027', index: 27, name: 'DHARANIVASAN K', assigned: true },
  { id: 'kmc-028', index: 28, name: 'DHARANYA G', assigned: true },
  { id: 'kmc-029', index: 29, name: 'DHARSHAN S', assigned: true },
  { id: 'kmc-030', index: 30, name: 'DHARSSINI N S', assigned: true },
  { id: 'kmc-031', index: 31, name: 'DINESH KUMAR V', assigned: true },
  { id: 'kmc-032', index: 32, name: 'DINESH RAJ JADA', assigned: true },
  { id: 'kmc-033', index: 33, name: 'DURGA P', assigned: true },
  { id: 'kmc-034', index: 34, name: 'ENIYAN SIDHARTH B', assigned: true },
  { id: 'kmc-035', index: 35, name: 'GAUTAM P', assigned: true },
  { id: 'kmc-036', index: 36, name: 'GAYATHRI S S', assigned: true },
  { id: 'kmc-037', index: 37, name: 'GOKILAN S', assigned: true },
  { id: 'kmc-038', index: 38, name: 'GOKUL D', assigned: true },
  { id: 'kmc-039', index: 39, name: 'GOPIKANNAN K', assigned: true },
  { id: 'kmc-040', index: 40, name: 'GOWTHAM K', assigned: true },
  { id: 'kmc-041', index: 41, name: 'GUHAN S', assigned: true },
  { id: 'kmc-042', index: 42, name: 'HAPPY', assigned: true },
  { id: 'kmc-043', index: 43, name: 'HARIKUMAR V', assigned: true },
  { id: 'kmc-044', index: 44, name: 'HARINANDHINI K', assigned: true },
  { id: 'kmc-045', index: 45, name: 'HARIPRASAD K', assigned: true },
  { id: 'kmc-046', index: 46, name: 'HARIPRASADRAM K', assigned: true },
  { id: 'kmc-047', index: 47, name: 'IRFHANA S M', assigned: true },
  { id: 'kmc-048', index: 48, name: 'IYYAPPAN R', assigned: true },
  { id: 'kmc-049', index: 49, name: 'JAIAKASH M', assigned: true },
  { id: 'kmc-050', index: 50, name: 'JANANI K S', assigned: true },
  { id: 'kmc-051', index: 51, name: 'JEEVA BHARATHI D', assigned: true },
  { id: 'kmc-052', index: 52, name: 'JEEVA T', assigned: true },
  { id: 'kmc-053', index: 53, name: 'JEREMIAH SAMUEL PAUL S', assigned: true },
  { id: 'kmc-054', index: 54, name: 'KABILAN M', assigned: true },
  { id: 'kmc-055', index: 55, name: 'KAMAL SHANMUGAM PREMKUMAR', assigned: true },
  { id: 'kmc-056', index: 56, name: 'KANISHKA S', assigned: true },
  { id: 'kmc-057', index: 57, name: 'KANNAGI C', assigned: true },
  { id: 'kmc-058', index: 58, name: 'KAYALVIZHI S', assigned: true },
  { id: 'kmc-059', index: 59, name: 'KHANISH B', assigned: true },
  { id: 'kmc-060', index: 60, name: 'KISHORE J', assigned: true },
  { id: 'kmc-061', index: 61, name: 'KISHORE P R', assigned: true },
  { id: 'kmc-062', index: 62, name: 'KRISHITH C', assigned: true },
  { id: 'kmc-063', index: 63, name: 'KRISHNA V', assigned: true },
  { id: 'kmc-064', index: 64, name: 'KRITHIKA S K', assigned: true },
  { id: 'kmc-065', index: 65, name: 'LAYAH V K', assigned: true },
  { id: 'kmc-066', index: 66, name: 'LEKHA KAMALINI C', assigned: true },
  { id: 'kmc-067', index: 67, name: 'LIBAN REYHAN M M', assigned: true },
  { id: 'kmc-068', index: 68, name: 'LOKJITH M', assigned: true },
  { id: 'kmc-069', index: 69, name: 'MAHARAJA P', assigned: true },
  { id: 'kmc-070', index: 70, name: 'MANASA MYLANGAM', assigned: true },
  { id: 'kmc-071', index: 71, name: 'METHA J S', assigned: true },
  { id: 'kmc-072', index: 72, name: 'MITHUN BABU', assigned: true },
  { id: 'kmc-073', index: 73, name: 'MOHAMED ASIF M', assigned: true },
  { id: 'kmc-074', index: 74, name: 'MOHAMMED FAIZAL N', assigned: true },
  { id: 'kmc-075', index: 75, name: 'MOHANDAS G', assigned: true },
  { id: 'kmc-076', index: 76, name: 'MUKKESH KUMAR S', assigned: true },
  { id: 'kmc-077', index: 77, name: 'MYTHILI K', assigned: true },
  { id: 'kmc-078', index: 78, name: 'MYURIKA S', assigned: true },
  { id: 'kmc-079', index: 79, name: 'NAFEESUR RAHMAN P A K', assigned: true },
  { id: 'kmc-080', index: 80, name: 'NAVEEN KUMAR R', assigned: true },
  { id: 'kmc-081', index: 81, name: 'NEHA R V', assigned: true },
  { id: 'kmc-082', index: 82, name: 'NEWLIN AKSHAYA SHURUTHI A', assigned: true },
  { id: 'kmc-083', index: 83, name: 'NIKITHA S K', assigned: true },
  { id: 'kmc-084', index: 84, name: 'OYING YIRANG', assigned: true },
  { id: 'kmc-085', index: 85, name: 'PARAMAGURU S', assigned: true },
  { id: 'kmc-086', index: 86, name: 'PRABA M VANISHA', assigned: true },
  { id: 'kmc-087', index: 87, name: 'PRAJITH S P', assigned: true },
  { id: 'kmc-088', index: 88, name: 'PRANAV SATISH', assigned: true },
  { id: 'kmc-089', index: 89, name: 'PRAVEEN KUMAR M', assigned: true },
  { id: 'kmc-090', index: 90, name: 'PREM SHANKAR GOMATHINAYAGAM', assigned: true },
  { id: 'kmc-091', index: 91, name: 'PRIYANKA K', assigned: true },
  { id: 'kmc-092', index: 92, name: 'RAMAGIRI TEJASWINI', assigned: true },
  { id: 'kmc-093', index: 93, name: 'RATHISHVARMA M', assigned: true },
  { id: 'kmc-094', index: 94, name: 'RAVADA DARSAN', assigned: true },
  { id: 'kmc-095', index: 95, name: 'RIKESH BABU J', assigned: true },
  { id: 'kmc-096', index: 96, name: 'RITHIKAA D', assigned: true },
  { id: 'kmc-097', index: 97, name: 'RIZAL KAREEM GANI S', assigned: true },
  { id: 'kmc-098', index: 98, name: 'ROSHAN A', assigned: true },
  { id: 'kmc-099', index: 99, name: 'RUTESH S', assigned: true },
  { id: 'kmc-100', index: 100, name: 'SABARINESAN S', assigned: true },
  { id: 'kmc-101', index: 101, name: 'SAFIYA MUHSINA A', assigned: true },
  { id: 'kmc-102', index: 102, name: 'SAHANA B SUBRAMANIAN', assigned: true },
  { id: 'kmc-103', index: 103, name: 'SAMEKSHA GOPINATHAN', assigned: true },
  { id: 'kmc-104', index: 104, name: 'SAMRITHA A J', assigned: true },
  { id: 'kmc-105', index: 105, name: 'SAMYUKTHA M C', assigned: true },
  { id: 'kmc-106', index: 106, name: 'SANGAMITHRA S', assigned: true },
  { id: 'kmc-107', index: 107, name: 'SANJAY M', assigned: true },
  { id: 'kmc-108', index: 108, name: 'SANJEEV NATH D', assigned: true },
  { id: 'kmc-109', index: 109, name: 'SARANYA S', assigned: true },
  { id: 'kmc-110', index: 110, name: 'SASMITA E I', assigned: true },
  { id: 'kmc-111', index: 111, name: 'SATHISHKUMAR V', assigned: true },
  { id: 'kmc-112', index: 112, name: 'SHAIK TASNEEM', assigned: true },
  { id: 'kmc-113', index: 113, name: 'SHANDHANA LAKSHMI SRIERUL E', assigned: true },
  { id: 'kmc-114', index: 114, name: 'SHARINI I', assigned: true },
  { id: 'kmc-115', index: 115, name: 'SHARON DEEPTHI S', assigned: true },
  { id: 'kmc-116', index: 116, name: 'SHAUN VARGHESE THOMAS', assigned: true },
  { id: 'kmc-117', index: 117, name: 'SHESHVANTH SANGEETHA HARI VENKATESH', assigned: true },
  { id: 'kmc-118', index: 118, name: 'SHRIRAM S', assigned: true },
  { id: 'kmc-119', index: 119, name: 'SHWETHA G', assigned: true },
  { id: 'kmc-120', index: 120, name: 'SHYAMAL ANANDAKUMARAN', assigned: true },
  { id: 'kmc-121', index: 121, name: 'SIVARANJINI M', assigned: true },
  { id: 'kmc-122', index: 122, name: 'SIVASUKHIRTHRAJ B', assigned: true },
  { id: 'kmc-123', index: 123, name: 'SRIVARSHINIVASAN E S', assigned: true },
  { id: 'kmc-124', index: 124, name: 'SRIVATSAN V', assigned: true },
  { id: 'kmc-125', index: 125, name: 'SUBHICKSHAN K M', assigned: true },
  { id: 'kmc-126', index: 126, name: 'SUJI VARSHINI S', assigned: true },
  { id: 'kmc-127', index: 127, name: 'SUNILKUMAR S', assigned: true },
  { id: 'kmc-128', index: 128, name: 'SUNITHA S', assigned: true },
  { id: 'kmc-129', index: 129, name: 'SWATHI K', assigned: true },
  { id: 'kmc-130', index: 130, name: 'TAMIZHKUMARAN R V', assigned: true },
  { id: 'kmc-131', index: 131, name: 'TAMIZHVIZHI B', assigned: true },
  { id: 'kmc-132', index: 132, name: 'TANAY R', assigned: true },
  { id: 'kmc-133', index: 133, name: 'TANISHA S', assigned: true },
  { id: 'kmc-134', index: 134, name: 'TEJASHWINI D R', assigned: true },
  { id: 'kmc-135', index: 135, name: 'THAANIA SREE S', assigned: true },
  { id: 'kmc-136', index: 136, name: 'THARUN G', assigned: true },
  { id: 'kmc-137', index: 137, name: 'UKESH RAJ M', assigned: true },
  { id: 'kmc-138', index: 138, name: 'VARSHA S S', assigned: true },
  { id: 'kmc-139', index: 139, name: 'VARUN M', assigned: true },
  { id: 'kmc-140', index: 140, name: 'VASUKI M', assigned: true },
  { id: 'kmc-141', index: 141, name: 'VIJAYA SARATHY', assigned: true },
  { id: 'kmc-142', index: 142, name: 'VIJAYASHREE S', assigned: true },
  { id: 'kmc-143', index: 143, name: 'VINITH G V', assigned: true },
  { id: 'kmc-144', index: 144, name: 'VINUSRI S', assigned: true },
  { id: 'kmc-145', index: 145, name: 'VISHNU PRIYA A A', assigned: true },
  { id: 'kmc-146', index: 146, name: 'VISHVA A', assigned: true },
  { id: 'kmc-147', index: 147, name: 'YALE VEDANTH', assigned: true },
  { id: 'kmc-148', index: 148, name: 'YALLASIRI CHARAN KUMAR REDDY', assigned: true },
  { id: 'kmc-149', index: 149, name: 'YOGAMAGHI C S', assigned: true },
  { id: 'kmc-150', index: 150, name: 'YOHITH PRAJAN E', assigned: true },
];

export interface RosterValidationReport {
  totalCount: number;
  isExact150: boolean;
  uniqueIdsCount: number;
  allIdsUnique: boolean;
  duplicateNames: string[];
  orderPreserved: boolean;
  indicesValid: boolean;
  status: 'valid' | 'invalid';
  messages: string[];
}

/**
 * Validates the roster in-memory against all constraints
 */
export function validateRoster(roster: Student[] = AUTHORITATIVE_ROSTER): RosterValidationReport {
  const messages: string[] = [];
  const totalCount = roster.length;
  const isExact150 = totalCount === 150;

  if (!isExact150) {
    messages.push(`Expected exactly 150 students, found ${totalCount}.`);
  }

  // Check unique IDs
  const idSet = new Set<string>();
  roster.forEach((s) => idSet.add(s.id));
  const uniqueIdsCount = idSet.size;
  const allIdsUnique = uniqueIdsCount === totalCount;
  if (!allIdsUnique) {
    messages.push(`Duplicate internal IDs detected! Only ${uniqueIdsCount} unique IDs found.`);
  }

  // Check duplicates in names (do not remove, report for review)
  const duplicateNames: string[] = [];
  const nameSet = new Set<string>();
  roster.forEach((s) => {
    const key = s.name.trim().toLowerCase();
    if (nameSet.has(key)) {
      if (!duplicateNames.includes(s.name)) duplicateNames.push(s.name);
    } else {
      nameSet.add(key);
    }
  });

  if (duplicateNames.length > 0) {
    messages.push(`Duplicate student names found in roster: ${duplicateNames.join(', ')}`);
  }

  // Check sequential indices
  let indicesValid = true;
  for (let i = 0; i < roster.length; i++) {
    if (roster[i].index !== i + 1) {
      indicesValid = false;
      messages.push(`Index mismatch at position ${i + 1}: found ${roster[i].index}.`);
      break;
    }
  }

  const status = isExact150 && allIdsUnique && indicesValid ? 'valid' : 'invalid';

  return {
    totalCount,
    isExact150,
    uniqueIdsCount,
    allIdsUnique,
    duplicateNames,
    orderPreserved: indicesValid,
    indicesValid,
    status,
    messages,
  };
}
