export type UserRole =
  | "OFFICER"
  | "DIRECTOR"
  | "ENDORSING_COMMITTEE"
  | "MANAGEMENT"
  | "MANAGEMENT_TEAM"
  | "ADMIN";

export type UserStatus = "INVITED" | "ACTIVE" | "INACTIVE";

export interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  nameAmharic: string;
  role: UserRole;
  department: string;
  departmentAmharic: string;
  status: UserStatus;
  isFirstLogin: boolean;
  avatarUrl?: string;
}

export type RequisitionStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "IN_TENDER"
  | "AWARDED"
  | "FULFILLED";

export type PriorityLevel = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export interface RequisitionItem {
  id: string;
  description: string;
  quantity: number;
  unitOfMeasure: string;
  estimatedUnitPriceETB: number;
}

export interface Requisition {
  id: string;
  requisitionNumber: string;
  title: string;
  titleAmharic?: string;
  department: string;
  departmentAmharic?: string;
  requestedBy: string;
  requestedById: string;
  dateCreated: string;
  requiredDate: string;
  priority: PriorityLevel;
  status: RequisitionStatus;
  totalBudgetETB: number;
  fundingSource: string;
  justification: string;
  items: RequisitionItem[];
  approvalHistory: {
    step: string;
    actionBy: string;
    role: string;
    date: string;
    status: "APPROVED" | "REJECTED" | "PENDING";
    comments?: string;
  }[];
  tenderNumber?: string;
  awardedVendor?: string;
}

export interface Tender {
  id: string;
  tenderNumber: string;
  title: string;
  requisitionId: string;
  openingDate: string;
  closingDate: string;
  status: "OPEN" | "EVALUATION" | "AWARDED" | "CANCELLED";
  estimatedValueETB: number;
  bidsCount: number;
  category: string;
}

export interface Vendor {
  id: string;
  companyName: string;
  tinNumber: string;
  contactPerson: string;
  email: string;
  phone: string;
  category: string;
  status: "VERIFIED" | "PENDING" | "BLACKLISTED";
  rating: number; // 1-5
  totalContractsETB: number;
}

export interface DepartmentBudget {
  id: string;
  departmentName: string;
  departmentNameAmharic: string;
  allocatedETB: number;
  committedETB: number;
  spentETB: number;
  remainingETB: number;
  fiscalYear: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  ipAddress: string;
  status: "SUCCESS" | "FAILURE";
  details: string;
}

export type Language = "en" | "am";
