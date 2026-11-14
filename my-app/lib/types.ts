export type UserRole = "mahasiswa" | "ult" | "superadmin";

export type SubmissionStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "revision_required"
  | "approved"
  | "processing"
  | "completed"
  | "rejected"
  | "cancelled";

export type DocumentCategory =
  | "draft_letter"
  | "supporting_doc"
  | "result_letter";

export interface Organization {
  id: string;
  code: string;
  name: string;
  faculty: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  nim_nip: string;
  phone: string;
  role: UserRole;
  organization_id: string | null;
  is_active: boolean;
  must_change_password: boolean;
  created_at: string;
  updated_at: string;
}

export interface RequiredDocumentSpec {
  key: string;
  label: string;
  required: boolean;
  accepted_types: string[];
  category: DocumentCategory;
}

export interface CustomFieldSpec {
  key: string;
  label: string;
  type: "text" | "date" | "number" | "textarea";
  required: boolean;
  placeholder?: string;
}

export interface LetterType {
  id: string;
  code: string;
  name: string;
  description: string;
  estimated_days: number;
  required_documents: RequiredDocumentSpec[];
  custom_fields_schema: CustomFieldSpec[];
  template_file_path: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Submission {
  id: string;
  submission_number: string | null;
  official_letter_number: string | null;
  user_id: string;
  organization_id: string;
  letter_type_id: string;
  assigned_to: string | null;
  title: string;
  purpose: string;
  recipient_target: string;
  event_date: string | null;
  custom_data: Record<string, string>;
  status: SubmissionStatus;
  submitted_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubmissionDocument {
  id: string;
  submission_id: string;
  document_key: string;
  category: DocumentCategory;
  file_name: string;
  file_path: string;
  file_size_bytes: number;
  mime_type: string;
  version: number;
  is_current: boolean;
  uploaded_by: string;
  created_at: string;
}

export interface SubmissionHistory {
  id: string;
  submission_id: string;
  from_status: SubmissionStatus | null;
  to_status: SubmissionStatus;
  notes: string | null;
  updated_by: string;
  created_at: string;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  submission_id: string | null;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  ip_address: string;
  created_at: string;
}

export interface SystemSettings {
  submission_prefix: string;
  max_file_size_mb: number;
  max_files_per_submission: number;
  ult_sla_days: number;
  maintenance_banner: string;
}
