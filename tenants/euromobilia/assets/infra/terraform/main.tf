# Main

terraform {
  required_providers {
    supabase = {
      source  = "supabase/supabase"
      version = "~> 1.0"
    }
  }
}

# This is a scaffold. Apply only after setting up the Supabase provider
# with a valid access token.

resource "supabase_project" "euromobilia" {
  organization_id   = "ara-group"
  name              = "euromobilia"
  region            = "us-east-1"
  database_password = var.supabase_db_password  # sensitive
}
