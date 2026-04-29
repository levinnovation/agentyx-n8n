# Terraform Scaffold — Euromobilia Infra

variable "supabase_project_ref" {
  description = "Supabase project reference ID"
  type        = string
}

variable "supabase_url" {
  description = "Supabase project URL"
  type        = string
}

variable "storage_buckets" {
  description = "List of storage bucket names"
  type        = list(string)
  default     = ["quotation-pdfs", "image-renders", "artifacts"]
}
