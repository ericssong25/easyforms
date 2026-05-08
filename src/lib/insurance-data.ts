export type PlanType =
  | "ACA"
  | "Medicare Advantage"
  | "Medicaid"
  | "Medigap"
  | "Short Term"
  | "CHIP"
  | "Dual Eligible"
  | "SNP"
  | "Employer";

export type MetalLevel =
  | "Bronze"
  | "Silver"
  | "Gold"
  | "Platinum"
  | "Catastrophic"
  | "Expanded Bronze";

export interface InsuranceCarrier {
  name: string;
  aliases: string[];
  types: PlanType[];
  states?: string[];
}

export interface InsurancePlan {
  carrier: string;
  name: string;
  type: PlanType;
  metalLevel?: MetalLevel;
  state?: string;
  aliases: string[];
  networkType?: string;
}

// ============================================================
// CARRIERS (~150)
// ============================================================
export const carriers: InsuranceCarrier[] = [
  // --- Nacionales Grandes ---
  {
    name: "Aetna",
    aliases: ["Aetna CVS", "Aetna Health"],
    types: ["ACA", "Medicare Advantage", "Employer"],
  },
  {
    name: "UnitedHealthcare",
    aliases: ["UHC", "United Health", "United", "UnitedHealth"],
    types: ["ACA", "Medicare Advantage", "Medicaid", "Employer", "Dual Eligible"],
  },
  {
    name: "Blue Cross Blue Shield",
    aliases: ["BCBS", "Blue Cross", "Blue Shield", "BCBSM"],
    types: ["ACA", "Medicare Advantage", "Employer"],
  },
  {
    name: "Cigna",
    aliases: ["Cigna Health", "Cigna Healthcare"],
    types: ["ACA", "Medicare Advantage", "Employer"],
  },
  {
    name: "Humana",
    aliases: ["Humana Health", "HumanaOne"],
    types: ["ACA", "Medicare Advantage", "Medicaid", "Employer", "Dual Eligible"],
  },
  {
    name: "Kaiser Permanente",
    aliases: ["Kaiser", "KP"],
    types: ["ACA", "Medicare Advantage", "Employer"],
  },
  {
    name: "Anthem",
    aliases: ["Anthem BCBS", "Anthem Blue Cross"],
    types: ["ACA", "Medicare Advantage", "Employer", "Medicaid"],
  },
  {
    name: "Centene",
    aliases: [],
    types: ["ACA", "Medicaid", "Medicare Advantage"],
  },
  {
    name: "Molina Healthcare",
    aliases: ["Molina", "Molina Health"],
    types: ["ACA", "Medicare Advantage", "Medicaid", "Dual Eligible"],
  },
  {
    name: "Oscar Health",
    aliases: ["Oscar", "Oscar Insurance"],
    types: ["ACA", "Medicare Advantage"],
  },
  {
    name: "Ambetter",
    aliases: ["Ambetter Health", "Ambetter from Centene"],
    types: ["ACA"],
  },
  {
    name: "Wellcare",
    aliases: ["WellCare", "Wellcare Health"],
    types: ["Medicare Advantage", "Medicaid", "Dual Eligible"],
  },
  {
    name: "Clover Health",
    aliases: ["Clover", "Clover Insurance"],
    types: ["Medicare Advantage"],
  },
  {
    name: "Devoted Health",
    aliases: ["Devoted", "DevotedHealth"],
    types: ["Medicare Advantage"],
  },
  {
    name: "Bright Health",
    aliases: ["Bright", "Bright HealthCare"],
    types: ["ACA", "Medicare Advantage"],
  },
  {
    name: "Alignment Health",
    aliases: ["Alignment", "Alignment Health Plan"],
    types: ["Medicare Advantage"],
  },
  {
    name: "SCAN Health Plan",
    aliases: ["SCAN", "SCAN Health"],
    types: ["Medicare Advantage"],
  },
  {
    name: "Zing Health",
    aliases: ["Zing", "ZingHealth"],
    types: ["Medicare Advantage"],
  },
  {
    name: "Elevance Health",
    aliases: ["Elevance"],
    types: ["ACA", "Medicare Advantage", "Employer", "Medicaid"],
  },

  // --- Florida (prioridad) ---
  {
    name: "Florida Blue",
    aliases: ["FL Blue", "FloridaBlue", "Blue Cross Florida"],
    types: ["ACA", "Medicare Advantage", "Employer"],
    states: ["Florida"],
  },
  {
    name: "Simply Healthcare",
    aliases: ["Simply", "Simply Health", "SimplyHealth"],
    types: ["Medicare Advantage", "Medicaid"],
    states: ["Florida"],
  },
  {
    name: "Sunshine Health",
    aliases: ["Sunshine", "SunshineHealth"],
    types: ["ACA", "Medicaid", "Medicare Advantage"],
    states: ["Florida"],
  },
  {
    name: "Freedom Health",
    aliases: ["Freedom", "Freedom Health Plans"],
    types: ["Medicare Advantage"],
    states: ["Florida"],
  },
  {
    name: "Optimum HealthCare",
    aliases: ["Optimum", "Optimum Health"],
    types: ["Medicare Advantage", "Medicaid"],
    states: ["Florida"],
  },
  {
    name: "CarePlus Health Plans",
    aliases: ["CarePlus", "Care Plus"],
    types: ["Medicare Advantage"],
    states: ["Florida"],
  },
  {
    name: "AvMed",
    aliases: ["AvMed Health", "AvMed Health Plans"],
    types: ["ACA", "Employer", "Medicare Advantage"],
    states: ["Florida"],
  },
  {
    name: "GuideWell",
    aliases: ["GuideWell Health"],
    types: ["ACA", "Employer"],
    states: ["Florida"],
  },
  {
    name: "Health First",
    aliases: ["HealthFirst", "Health First Health Plans"],
    types: ["ACA", "Medicare Advantage"],
    states: ["Florida"],
  },
  {
    name: "Prominence Health",
    aliases: ["Prominence", "Prominence Health Plan"],
    types: ["Medicare Advantage"],
    states: ["Florida"],
  },
  {
    name: "Community Health Choice",
    aliases: ["Community Health", "CHC"],
    types: ["ACA", "Medicaid"],
    states: ["Florida", "Texas"],
  },

  // --- Regionales / Estatales ---
  {
    name: "Highmark",
    aliases: ["Highmark BCBS", "Highmark Blue Cross"],
    types: ["ACA", "Medicare Advantage", "Employer"],
    states: ["Pennsylvania", "Delaware", "West Virginia", "New York"],
  },
  {
    name: "CareSource",
    aliases: ["Care Source"],
    types: ["ACA", "Medicaid", "Medicare Advantage"],
    states: ["Ohio", "Indiana", "Kentucky", "West Virginia", "Georgia"],
  },
  {
    name: "Priority Health",
    aliases: ["PriorityHealth"],
    types: ["ACA", "Medicare Advantage", "Employer", "Medicaid"],
    states: ["Michigan"],
  },
  {
    name: "UPMC Health Plan",
    aliases: ["UPMC", "UPMC Health"],
    types: ["ACA", "Medicare Advantage", "Employer", "Medicaid"],
    states: ["Pennsylvania"],
  },
  {
    name: "EmblemHealth",
    aliases: ["Emblem", "Emblem Health"],
    types: ["ACA", "Medicare Advantage", "Employer", "Medicaid"],
    states: ["New York"],
  },
  {
    name: "Healthfirst",
    aliases: ["Health First NY", "Healthfirst NY"],
    types: ["ACA", "Medicare Advantage", "Medicaid"],
    states: ["New York"],
  },
  {
    name: "MetroPlusHealth",
    aliases: ["MetroPlus", "Metro Plus", "MetroPlus Health"],
    types: ["ACA", "Medicaid", "Medicare Advantage"],
    states: ["New York"],
  },
  {
    name: "Affinity Health Plan",
    aliases: ["Affinity", "Affinity Health"],
    types: ["Medicaid", "ACA"],
    states: ["New York"],
  },
  {
    name: "AmeriHealth",
    aliases: ["AmeriHealth Caritas", "Ameri Health"],
    types: ["ACA", "Medicaid", "Medicare Advantage"],
    states: ["Pennsylvania", "New Jersey", "Delaware", "Michigan", "Florida"],
  },
  {
    name: "Horizon Blue Cross",
    aliases: ["Horizon BCBS", "Horizon", "Horizon Blue"],
    types: ["ACA", "Medicare Advantage", "Employer", "Medicaid"],
    states: ["New Jersey"],
  },
  {
    name: "Independence Blue Cross",
    aliases: ["IBX", "Independence", "Independence BCBS"],
    types: ["ACA", "Medicare Advantage", "Employer"],
    states: ["Pennsylvania"],
  },
  {
    name: "Blue Shield of California",
    aliases: ["Blue Shield CA", "BSC", "Blue Shield"],
    types: ["ACA", "Medicare Advantage", "Employer"],
    states: ["California"],
  },
  {
    name: "Health Net",
    aliases: ["HealthNet", "HealthNet CA"],
    types: ["ACA", "Medicare Advantage", "Medicaid", "Employer"],
    states: ["California"],
  },
  {
    name: "CalOptima",
    aliases: ["Cal Optima"],
    types: ["Medicaid", "Medicare Advantage"],
    states: ["California"],
  },
  {
    name: "Regence",
    aliases: ["Regence BCBS"],
    types: ["ACA", "Medicare Advantage", "Employer"],
    states: ["Washington", "Oregon", "Idaho", "Utah"],
  },
  {
    name: "Premera Blue Cross",
    aliases: ["Premera", "Premera BCBS"],
    types: ["ACA", "Medicare Advantage", "Employer"],
    states: ["Washington", "Alaska"],
  },
  {
    name: "Cambia Health Solutions",
    aliases: ["Cambia", "Cambia Health"],
    types: ["ACA", "Medicare Advantage", "Employer"],
    states: ["Washington", "Oregon", "Idaho", "Utah"],
  },
  {
    name: "SelectHealth",
    aliases: ["Select Health"],
    types: ["ACA", "Medicare Advantage", "Employer", "Medicaid"],
    states: ["Utah", "Idaho", "Nevada"],
  },
  {
    name: "Tufts Health Plan",
    aliases: ["Tufts", "Tufts Health"],
    types: ["ACA", "Medicare Advantage", "Employer", "Medicaid"],
    states: ["Massachusetts", "Rhode Island", "New Hampshire", "Connecticut"],
  },
  {
    name: "Harvard Pilgrim",
    aliases: ["Harvard Pilgrim Health", "HPHC"],
    types: ["ACA", "Medicare Advantage", "Employer"],
    states: ["Massachusetts", "Maine", "New Hampshire", "Connecticut"],
  },
  {
    name: "Geisinger Health Plan",
    aliases: ["Geisinger", "Geisinger Health"],
    types: ["ACA", "Medicare Advantage", "Employer", "Medicaid"],
    states: ["Pennsylvania"],
  },
  {
    name: "Banner Health",
    aliases: ["Banner", "Banner Aetna"],
    types: ["ACA", "Medicare Advantage", "Employer"],
    states: ["Arizona", "Colorado", "Wyoming", "Nebraska", "Nevada", "California"],
  },
  {
    name: "Baylor Scott & White",
    aliases: ["BSW", "Baylor Scott White", "BSW Health Plan"],
    types: ["ACA", "Medicare Advantage", "Employer"],
    states: ["Texas"],
  },
  {
    name: "Medica",
    aliases: ["Medica Health"],
    types: ["ACA", "Medicare Advantage", "Employer", "Medicaid"],
    states: ["Minnesota", "Wisconsin", "Iowa", "Nebraska", "Kansas", "North Dakota", "South Dakota"],
  },
  {
    name: "CDPHP",
    aliases: ["CDPHP Health"],
    types: ["ACA", "Medicare Advantage", "Employer", "Medicaid"],
    states: ["New York"],
  },
  {
    name: "MVP Health Care",
    aliases: ["MVP Health", "MVP"],
    types: ["ACA", "Medicare Advantage", "Employer", "Medicaid"],
    states: ["New York", "Vermont"],
  },
  {
    name: "Excellus BlueCross BlueShield",
    aliases: ["Excellus", "Excellus BCBS"],
    types: ["ACA", "Medicare Advantage", "Employer", "Medicaid"],
    states: ["New York"],
  },
  {
    name: "Capital Blue Cross",
    aliases: ["Capital BCBS", "Capital Blue"],
    types: ["ACA", "Medicare Advantage", "Employer"],
    states: ["Pennsylvania"],
  },
  {
    name: "PacificSource",
    aliases: ["Pacific Source"],
    types: ["ACA", "Medicare Advantage", "Employer"],
    states: ["Oregon", "Idaho", "Montana", "Washington"],
  },
  {
    name: "Moda Health",
    aliases: ["Moda"],
    types: ["ACA", "Medicare Advantage", "Employer"],
    states: ["Oregon", "Alaska"],
  },
  {
    name: "Quartz",
    aliases: ["Quartz Health"],
    types: ["ACA", "Medicare Advantage", "Employer", "Medicaid"],
    states: ["Wisconsin", "Illinois", "Minnesota", "Iowa"],
  },
  {
    name: "Network Health",
    aliases: ["NetworkHealth"],
    types: ["ACA", "Medicare Advantage", "Employer"],
    states: ["Wisconsin"],
  },
  {
    name: "Neighborhood Health Plan",
    aliases: ["NHP", "Neighborhood Health"],
    types: ["Medicaid", "ACA"],
    states: ["Rhode Island", "Massachusetts"],
  },
  {
    name: "Amerigroup",
    aliases: ["AmeriGroup", "Amerigroup Community"],
    types: ["Medicaid", "Medicare Advantage"],
  },
  {
    name: "Allways Health Partners",
    aliases: ["Allways", "Allways Health"],
    types: ["ACA", "Medicare Advantage", "Employer"],
    states: ["Massachusetts"],
  },
  {
    name: "Friday Health Plans",
    aliases: ["Friday Health", "Friday"],
    types: ["ACA"],
  },
  {
    name: "BridgeSpan",
    aliases: ["BridgeSpan Health"],
    types: ["ACA"],
  },
  {
    name: "Blue Cross of Idaho",
    aliases: ["BCI", "Blue Cross Idaho"],
    types: ["ACA", "Medicare Advantage", "Employer"],
    states: ["Idaho"],
  },
  {
    name: "CareFirst BlueCross BlueShield",
    aliases: ["CareFirst", "CareFirst BCBS"],
    types: ["ACA", "Medicare Advantage", "Employer"],
    states: ["Maryland", "Washington DC", "Virginia"],
  },
  {
    name: "VillageCareMAX",
    aliases: ["VillageCare", "VillageCare MAX"],
    types: ["Medicare Advantage", "Medicaid"],
    states: ["New York"],
  },
  {
    name: "Leon Health",
    aliases: ["Leon"],
    types: ["Medicare Advantage"],
    states: ["Florida"],
  },
  {
    name: "Scott & White",
    aliases: ["Scott and White", "Scott White Health Plan"],
    types: ["ACA", "Medicare Advantage", "Employer"],
    states: ["Texas"],
  },
];

// ============================================================
// PLANS (~300) — los más comunes por tipo
// ============================================================
export const plans: InsurancePlan[] = [
  // --- ACA Marketplace ---
  {
    carrier: "Ambetter",
    name: "Ambetter Essential Care",
    type: "ACA",
    metalLevel: "Bronze",
    aliases: ["Ambetter Bronze", "Essential Care"],
  },
  {
    carrier: "Ambetter",
    name: "Ambetter Balanced Care",
    type: "ACA",
    metalLevel: "Silver",
    aliases: ["Ambetter Silver", "Balanced Care"],
  },
  {
    carrier: "Ambetter",
    name: "Ambetter Secure Care",
    type: "ACA",
    metalLevel: "Gold",
    aliases: ["Ambetter Gold", "Secure Care"],
  },
  {
    carrier: "Oscar Health",
    name: "Oscar Classic",
    type: "ACA",
    metalLevel: "Silver",
    aliases: ["Oscar Silver", "Oscar Classic Silver"],
  },
  {
    carrier: "Oscar Health",
    name: "Oscar Simple",
    type: "ACA",
    metalLevel: "Bronze",
    aliases: ["Oscar Bronze", "Oscar Simple Bronze"],
  },
  {
    carrier: "Oscar Health",
    name: "Oscar Elite",
    type: "ACA",
    metalLevel: "Gold",
    aliases: ["Oscar Gold", "Oscar Elite Gold"],
  },
  {
    carrier: "Florida Blue",
    name: "Florida Blue BlueOptions",
    type: "ACA",
    metalLevel: "Silver",
    state: "Florida",
    aliases: ["BlueOptions", "FL Blue Options"],
    networkType: "PPO",
  },
  {
    carrier: "Florida Blue",
    name: "Florida Blue myBlue",
    type: "ACA",
    metalLevel: "Bronze",
    state: "Florida",
    aliases: ["myBlue", "FL Blue myBlue"],
    networkType: "HMO",
  },
  {
    carrier: "Aetna",
    name: "Aetna CVS Health",
    type: "ACA",
    metalLevel: "Silver",
    aliases: ["Aetna CVS", "CVS Health Plan"],
    networkType: "PPO",
  },
  {
    carrier: "Aetna",
    name: "Aetna Open Choice PPO",
    type: "ACA",
    metalLevel: "Gold",
    aliases: ["Aetna Open Choice", "Aetna PPO"],
    networkType: "PPO",
  },
  {
    carrier: "Cigna",
    name: "Cigna Connect",
    type: "ACA",
    metalLevel: "Silver",
    aliases: ["Cigna Silver", "Connect Plan"],
  },
  {
    carrier: "Cigna",
    name: "Cigna LocalPlus",
    type: "ACA",
    metalLevel: "Gold",
    aliases: ["Cigna Local Plus", "LocalPlus"],
    networkType: "PPO",
  },
  {
    carrier: "UnitedHealthcare",
    name: "UnitedHealthcare Choice Plus",
    type: "ACA",
    metalLevel: "Silver",
    aliases: ["UHC Choice Plus", "Choice Plus"],
    networkType: "PPO",
  },
  {
    carrier: "UnitedHealthcare",
    name: "UnitedHealthcare Navigate",
    type: "ACA",
    metalLevel: "Gold",
    aliases: ["UHC Navigate", "Navigate"],
    networkType: "HMO",
  },
  {
    carrier: "UnitedHealthcare",
    name: "UnitedHealthcare NexusACO",
    type: "ACA",
    metalLevel: "Silver",
    aliases: ["UHC Nexus", "Nexus ACO"],
    networkType: "ACO",
  },
  {
    carrier: "Molina Healthcare",
    name: "Molina Marketplace",
    type: "ACA",
    metalLevel: "Silver",
    aliases: ["Molina Silver"],
  },
  {
    carrier: "Molina Healthcare",
    name: "Molina Gold",
    type: "ACA",
    metalLevel: "Gold",
    aliases: ["Molina Marketplace Gold"],
  },
  {
    carrier: "Blue Cross Blue Shield",
    name: "Blue Cross Blue Shield PPO",
    type: "ACA",
    metalLevel: "Silver",
    aliases: ["BCBS PPO", "Blue PPO"],
    networkType: "PPO",
  },
  {
    carrier: "Blue Cross Blue Shield",
    name: "Blue Cross Blue Shield HMO",
    type: "ACA",
    metalLevel: "Silver",
    aliases: ["BCBS HMO", "Blue HMO"],
    networkType: "HMO",
  },
  {
    carrier: "Blue Cross Blue Shield",
    name: "Blue Cross Blue Shield EPO",
    type: "ACA",
    metalLevel: "Silver",
    aliases: ["BCBS EPO", "Blue EPO"],
    networkType: "EPO",
  },
  {
    carrier: "Humana",
    name: "Humana Bronze",
    type: "ACA",
    metalLevel: "Bronze",
    aliases: ["Humana Marketplace Bronze"],
  },
  {
    carrier: "Humana",
    name: "Humana Silver",
    type: "ACA",
    metalLevel: "Silver",
    aliases: ["Humana Marketplace Silver"],
  },
  {
    carrier: "Humana",
    name: "Humana Gold",
    type: "ACA",
    metalLevel: "Gold",
    aliases: ["Humana Marketplace Gold"],
  },
  {
    carrier: "Kaiser Permanente",
    name: "Kaiser HMO",
    type: "ACA",
    metalLevel: "Silver",
    aliases: ["KP HMO", "Kaiser Silver"],
    networkType: "HMO",
  },
  {
    carrier: "Kaiser Permanente",
    name: "Kaiser HDHP",
    type: "ACA",
    metalLevel: "Bronze",
    aliases: ["KP HDHP", "Kaiser High Deductible"],
  },
  {
    carrier: "Bright Health",
    name: "Bright Advantage",
    type: "ACA",
    metalLevel: "Silver",
    aliases: ["Bright Silver"],
  },
  {
    carrier: "Healthfirst",
    name: "Healthfirst Essential Plan",
    type: "ACA",
    aliases: ["Healthfirst Silver", "Essential Plan"],
  },
  {
    carrier: "Anthem",
    name: "Anthem Pathway",
    type: "ACA",
    metalLevel: "Silver",
    aliases: ["Anthem Silver Pathway"],
    networkType: "PPO",
  },
  {
    carrier: "AvMed",
    name: "AvMed Focus",
    type: "ACA",
    metalLevel: "Silver",
    state: "Florida",
    aliases: ["AvMed Silver Focus"],
  },
  {
    carrier: "AvMed",
    name: "AvMed Empower",
    type: "ACA",
    metalLevel: "Gold",
    state: "Florida",
    aliases: ["AvMed Gold Empower"],
  },

  // --- Medicare Advantage ---
  {
    carrier: "Aetna",
    name: "Aetna Medicare Eagle",
    type: "Medicare Advantage",
    aliases: ["Medicare Eagle", "Aetna Eagle"],
  },
  {
    carrier: "Aetna",
    name: "Aetna Medicare Value",
    type: "Medicare Advantage",
    aliases: ["Aetna Value", "Medicare Value"],
  },
  {
    carrier: "Humana",
    name: "Humana Gold Plus",
    type: "Medicare Advantage",
    aliases: ["Gold Plus HMO", "Humana Gold Plus HMO"],
    networkType: "HMO",
  },
  {
    carrier: "Humana",
    name: "Humana Choice PPO",
    type: "Medicare Advantage",
    aliases: ["Humana Choice", "Choice PPO"],
    networkType: "PPO",
  },
  {
    carrier: "Humana",
    name: "Humana Honor",
    type: "Medicare Advantage",
    aliases: ["Humana Honor Plan", "Honor Plan"],
  },
  {
    carrier: "UnitedHealthcare",
    name: "UnitedHealthcare Dual Complete",
    type: "Dual Eligible",
    state: "Florida",
    aliases: ["UHC Dual Complete", "Dual Complete", "UHC Dual"],
  },
  {
    carrier: "UnitedHealthcare",
    name: "UnitedHealthcare Medicare Advantage",
    type: "Medicare Advantage",
    aliases: ["UHC Medicare", "UHC MA", "United Medicare"],
  },
  {
    carrier: "Devoted Health",
    name: "Devoted Health CORE",
    type: "Medicare Advantage",
    aliases: ["Devoted CORE", "Devoted Health Core Plan"],
    networkType: "HMO",
  },
  {
    carrier: "Devoted Health",
    name: "Devoted Health GIVEBACK",
    type: "Medicare Advantage",
    aliases: ["Devoted Giveback", "Devoted GiveBack"],
  },
  {
    carrier: "Wellcare",
    name: "Wellcare No Premium",
    type: "Medicare Advantage",
    aliases: ["Wellcare Zero Premium", "No Premium Plan"],
  },
  {
    carrier: "Wellcare",
    name: "Wellcare Value Script",
    type: "Medicare Advantage",
    aliases: ["Wellcare PDP", "Value Script PDP"],
  },
  {
    carrier: "Simply Healthcare",
    name: "Simply Medicare",
    type: "Medicare Advantage",
    state: "Florida",
    aliases: ["Simply Health Medicare", "Simply Medicare Plan"],
  },
  {
    carrier: "Freedom Health",
    name: "Freedom Medicare",
    type: "Medicare Advantage",
    state: "Florida",
    aliases: ["Freedom Health Medicare", "Freedom MA"],
  },
  {
    carrier: "Optimum HealthCare",
    name: "Optimum Medicare",
    type: "Medicare Advantage",
    state: "Florida",
    aliases: ["Optimum MA", "Optimum Health Medicare"],
  },
  {
    carrier: "Clover Health",
    name: "Clover Health Choice",
    type: "Medicare Advantage",
    aliases: ["Clover Choice", "Clover MA"],
  },
  {
    carrier: "SCAN Health Plan",
    name: "SCAN Classic",
    type: "Medicare Advantage",
    aliases: ["SCAN Classic Plan", "SCAN Health Classic"],
  },
  {
    carrier: "SCAN Health Plan",
    name: "SCAN Connections",
    type: "Medicare Advantage",
    aliases: ["SCAN Connections Plan"],
  },
  {
    carrier: "CarePlus Health Plans",
    name: "CarePlus Medicare Advantage",
    type: "Medicare Advantage",
    state: "Florida",
    aliases: ["CarePlus MA", "CarePlus Plan"],
  },
  {
    carrier: "Alignment Health",
    name: "Alignment Health Plan",
    type: "Medicare Advantage",
    aliases: ["Alignment Plan", "Alignment MA"],
  },
  {
    carrier: "Zing Health",
    name: "Zing Health Medicare",
    type: "Medicare Advantage",
    aliases: ["Zing Medicare", "Zing MA"],
  },
  {
    carrier: "Prominence Health",
    name: "Prominence Medicare",
    type: "Medicare Advantage",
    state: "Florida",
    aliases: ["Prominence MA", "Prominence Plan"],
  },

  // --- Medicaid (nombres estatales) ---
  {
    carrier: "Sunshine Health",
    name: "Sunshine Health Medicaid",
    type: "Medicaid",
    state: "Florida",
    aliases: ["Sunshine Medicaid", "SunshineHealth Medicaid"],
  },
  {
    carrier: "Simply Healthcare",
    name: "Simply Healthcare Medicaid",
    type: "Medicaid",
    state: "Florida",
    aliases: ["Simply Medicaid", "Simply Health Medicaid"],
  },
  {
    carrier: "Molina Healthcare",
    name: "Molina Medicaid",
    type: "Medicaid",
    aliases: ["Molina Medicaid Plan"],
  },
  {
    carrier: "AmeriHealth",
    name: "AmeriHealth Caritas",
    type: "Medicaid",
    aliases: ["AmeriHealth Medicaid", "Caritas"],
  },
  {
    carrier: "CareSource",
    name: "CareSource Medicaid",
    type: "Medicaid",
    aliases: ["CareSource Medicaid Plan"],
  },
  {
    carrier: "Anthem",
    name: "Healthy Blue",
    type: "Medicaid",
    aliases: ["Healthy Blue Medicaid", "Anthem Healthy Blue"],
  },
  {
    carrier: "UnitedHealthcare",
    name: "UnitedHealthcare Community Plan",
    type: "Medicaid",
    aliases: ["UHC Community Plan", "UHC Medicaid"],
  },
  {
    carrier: "Aetna",
    name: "Aetna Better Health",
    type: "Medicaid",
    aliases: ["Aetna Medicaid", "Better Health Medicaid"],
  },

  // --- Medigap ---
  {
    carrier: "Aetna",
    name: "Medigap Plan G",
    type: "Medigap",
    aliases: ["Plan G", "Aetna Plan G", "Medicare Supplement G"],
  },
  {
    carrier: "Aetna",
    name: "Medigap Plan N",
    type: "Medigap",
    aliases: ["Plan N", "Aetna Plan N"],
  },
  {
    carrier: "Humana",
    name: "Medigap Plan F",
    type: "Medigap",
    aliases: ["Plan F", "Humana Plan F"],
  },
  {
    carrier: "Humana",
    name: "Medigap Plan G",
    type: "Medigap",
    aliases: ["Humana Plan G", "Plan G Humana"],
  },
  {
    carrier: "UnitedHealthcare",
    name: "AARP Medicare Supplement Plan G",
    type: "Medigap",
    aliases: ["AARP Plan G", "UHC Medigap G", "AARP Supplement G"],
  },
  {
    carrier: "UnitedHealthcare",
    name: "AARP Medicare Supplement Plan N",
    type: "Medigap",
    aliases: ["AARP Plan N", "UHC Medigap N"],
  },
  {
    carrier: "Blue Cross Blue Shield",
    name: "BCBS Medigap Plan G",
    type: "Medigap",
    aliases: ["BCBS Plan G", "Blue Supplement G"],
  },
  {
    carrier: "Cigna",
    name: "Cigna Medigap Plan G",
    type: "Medigap",
    aliases: ["Cigna Plan G", "Cigna Supplement G"],
  },
];

// ============================================================
// ALL CARRIER NAMES (flat, sorted)
// ============================================================
export function getAllCarrierNames(): string[] {
  return carriers.map((c) => c.name).sort();
}

// ============================================================
// GET PLANS FOR A CARRIER
// ============================================================
export function getPlansForCarrier(carrierName: string): string[] {
  const names = plans
    .filter((p) => p.carrier.toLowerCase() === carrierName.toLowerCase())
    .map((p) => p.name);
  return Array.from(new Set(names)).sort();
}
