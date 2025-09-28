// Shared types for Airtable integration

export interface ApplicationFields {
  'Visa ID'?: string;
  'Visa URL'?: string;
  'Application ID'?: string;
  'Applicant Name'?: string;
  'First Name'?: string;
  'Last Name'?: string;
  Status?: string;
  Country?: string;
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