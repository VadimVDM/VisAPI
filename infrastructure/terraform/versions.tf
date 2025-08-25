terraform {
  required_version = ">= 1.5.0"
  
  required_providers {
    render = {
      source  = "render-oss/render"
      version = "~> 1.3.0"
    }
    vercel = {
      source  = "vercel/vercel"
      version = "~> 3.13.0"
    }
    upstash = {
      source  = "upstash/upstash"
      version = "~> 1.5.0"
    }
    supabase = {
      source  = "supabase/supabase"
      version = "~> 1.0.0"
    }
    github = {
      source  = "integrations/github"
      version = "~> 5.0"
    }
  }
  
  backend "remote" {
    organization = "visapi"
    
    workspaces {
      prefix = "visapi-"
    }
  }
}