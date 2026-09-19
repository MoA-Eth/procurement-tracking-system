export interface OfficerProjectSummary {
  id: string;
  code: string;
  name: string;
}

export interface OfficerWorkload {
  officerId: string;
  totalProjects: number;
  projects: OfficerProjectSummary[];
  isAssignedToCurrentProject: boolean;
  loadLevel: "light" | "moderate" | "heavy";
}

export interface ProjectOfficer {
  id: string;
  name: string;
  email: string;
  roleTag: string;
  isActive?: boolean;
  status?: string;
  workload?: OfficerWorkload;
}

export interface ProjectItem {
  id: string;
  code: string;
  name: string;
  sapNumber?: string;
  countryOrg: string;
  executingAgency: string;
  region: string;
  budgetYear: string;
  fundingSource: string;
  customFundingSource?: string;
  fundingType: string;
  loanGrantNumbers: string[];
  components: string[];
  subcomponents: string[];
  currency: string;
  startDate?: string;
  endDate?: string;
  sector: string;
  assignedOfficers: ProjectOfficer[];
  description: string;
  status: "Active" | "Inactive" | "Draft";
  createdAt: string;
}

export const INITIAL_OFFICERS: ProjectOfficer[] = [];

export const COUNTRY_ORG_OPTIONS = [
  "Ethiopia",
  "IGAD (Intergovernmental Authority on Development)",
  "Regional / Multi-Country",
  "Other (Specify Custom Organisation)",
];

export const EXECUTING_AGENCY_OPTIONS = [
  "Ministry of Agriculture (MoA)",
  "Oromia Irrigation and Pastoralist Development Bureau",
  "Amhara Bureau of Agriculture",
  "Somali Pastoral & Agro-Pastoral Development Bureau",
  "Afar Bureau of Agriculture",
  "Other (Specify Custom Agency)",
];

export const REGION_OPTIONS = [
  "FPCU / Federal",
  "Oromia",
  "Somali",
  "Afar",
  "Southwest Ethiopia",
  "South Ethiopia",
  "Amhara",
  "Tigray",
  "Sidama",
  "Gambella",
  "Benishangul-Gumuz",
  "Dire Dawa",
  "Harari",
];

export const FUNDING_SOURCE_OPTIONS = [
  { label: "African Development Bank (AfDB)", category: "Standard" },
  { label: "World Bank (IDA)", category: "Standard" },
  { label: "Government Treasury (መንግሥት)", category: "Standard" },
  { label: "UNOPS", category: "Standard" },
  {
    label: "IFAD (International Fund for Agricultural Development)",
    category: "Standard",
  },
  { label: "EU Grant / European Union", category: "Standard" },
  { label: "Other (Specify Custom Donor)", category: "Custom" },
];

export const FUNDING_TYPE_OPTIONS = [
  "Treasury",
  "Loan",
  "Grant",
  "Mixed (Loan & Grant)",
];

export const CURRENCY_OPTIONS = [
  "ETB (Ethiopian Birr)",
  "USD (US Dollar)",
  "UA (AfDB Unit of Account)",
  "EUR (Euro)",
];

export const BUDGET_YEAR_OPTIONS = [
  "2018 EFY (2025/2026)",
  "2017 EFY (2024/2025)",
  "2019 EFY (2026/2027)",
];

export const SECTOR_OPTIONS = [
  "Livestock & Pastoral Development",
  "Crops & Horticulture Directorate",
  "Natural Resources & Climate Change",
  "Agribusiness & Rural Finance",
  "Agricultural Mechanization & Infrastructure",
];

export const STATUS_OPTIONS: ("Active" | "Inactive")[] = ["Active", "Inactive"];

export const INITIAL_PROJECTS: ProjectItem[] = [];
