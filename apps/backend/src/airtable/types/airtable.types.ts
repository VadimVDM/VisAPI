// Shared types for Airtable integration

export interface ApplicationFields {
  'ID'?: string; // Application ID like E250923ISR4185144524
  'Visa ID'?: string;
  'Visa URL'?: string;
  'Application ID'?: string; // Legacy field name
  'Applicant Name'?: string;
  'First Name'?: string;
  'First name'?: string[] | string; // Can be array from Airtable
  'Last Name'?: string;
  'Surname'?: string[] | string; // Can be array from Airtable
  'Order Name'?: string[]; // Array field
  Status?: string;
  Country?: string;
  [key: string]: unknown; // Allow additional fields
}

export interface ExpandedApplication {
  id: string;
  fields: ApplicationFields;
}

export interface CompletedRecord {
  id: string;
  fields: {
    ID?: string;
    'Applications ↗'?: string[];
    Email?: string;
    Phone?: string;
    Status?: string;
    'פרט נוסף לשליחה'?: string;
    'Completed Timestamp'?: string;
    [key: string]: unknown; // Allow additional fields
  };
  createdTime?: string;
  expanded?: {
    Applications_expanded?: ExpandedApplication[];
  };
}

export interface VisaApplication {
  applicationId: string;
  visaId: string;
  visaUrl: string;
  applicantName?: string;
  status: string;
  country?: string;
}

// Make VisaDetails compatible with Supabase JSONB type
export type VisaDetails = {
  applications: VisaApplication[];
  processedAt: string;
  sourceView: string;
  [key: string]: unknown; // Allow indexing for JSONB compatibility
};