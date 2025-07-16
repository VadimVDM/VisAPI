# VisAPI Terraform Infrastructure

This directory contains the Infrastructure as Code (IaC) for the VisAPI project using Terraform.

## Architecture

The infrastructure is organized into reusable modules:

- **Upstash**: Redis database for queue management
- **Vercel**: Frontend hosting for Next.js application
- **Render**: Backend services (API Gateway and Worker)
- **Supabase**: Existing database (managed externally)

## Prerequisites

1. Install Terraform (>= 1.5.0)
2. Set up Terraform Cloud account for state management
3. Obtain API keys for all services:
   - Render API key
   - Vercel API token
   - Upstash API key and email
   - Supabase organization ID
   - Slack webhook URL for alerts

## Directory Structure

```
terraform/
├── main.tf                    # Root module configuration
├── variables.tf               # Variable definitions
├── versions.tf                # Provider versions and backend
├── modules/                   # Reusable modules
│   ├── render/               # Render services module
│   ├── vercel/               # Vercel frontend module
│   └── upstash/              # Upstash Redis module
└── environments/             # Environment-specific configs
    ├── staging/              # Staging environment
    └── production/           # Production environment
```

## Usage

### Initial Setup

1. Configure Terraform Cloud:

   ```bash
   terraform login
   ```

2. Set environment variables for sensitive data:
   ```bash
   export TF_VAR_render_api_key="your-render-api-key"
   export TF_VAR_vercel_api_token="your-vercel-token"
   export TF_VAR_upstash_api_key="your-upstash-key"
   export TF_VAR_upstash_email="your-upstash-email"
   export TF_VAR_supabase_org_id="your-supabase-org-id"
   export TF_VAR_slack_webhook_url="your-slack-webhook"
   ```

### Staging Deployment

```bash
cd infrastructure/terraform
terraform init
terraform workspace select staging
terraform plan -var-file=environments/staging/terraform.tfvars
terraform apply -var-file=environments/staging/terraform.tfvars
```

### Production Deployment

```bash
cd infrastructure/terraform
terraform init
terraform workspace select production
terraform plan -var-file=environments/production/terraform.tfvars
terraform apply -var-file=environments/production/terraform.tfvars
```

## Resource Configuration

### Upstash Redis

- TLS enabled
- AOF persistence
- Multi-zone replication (production only)
- Auto-eviction enabled

### Vercel Frontend

- Automatic deployments from GitHub
- Custom domains configured
- Environment variables injected
- Serverless functions in multiple regions (production)

### Render Services

- **Gateway**: Web service with auto-scaling
- **Worker**: Background worker with Docker runtime
- Health checks enabled
- Custom domains configured

## Outputs

After successful deployment, Terraform will output:

- Frontend URL
- Backend URL
- Redis connection details (sensitive)
- Service IDs for all deployed resources

## Security Considerations

1. All sensitive variables are marked as `sensitive`
2. Use environment variables or Terraform Cloud for secrets
3. Never commit `.tfvars` files with sensitive data
4. Enable state encryption in Terraform Cloud
5. Use separate workspaces for staging/production

## Troubleshooting

### Common Issues

1. **Provider Authentication Failed**

   - Verify all API keys are correctly set
   - Check API key permissions

2. **Resource Already Exists**

   - Import existing resources: `terraform import <resource> <id>`
   - Or destroy and recreate if safe

3. **Domain Configuration**
   - Ensure DNS is properly configured
   - Allow time for DNS propagation

### Useful Commands

```bash
# Format Terraform files
terraform fmt -recursive

# Validate configuration
terraform validate

# Show current state
terraform show

# Destroy specific resource
terraform destroy -target=module.upstash

# Import existing resource
terraform import module.vercel.vercel_project.frontend <project-id>
```

## Maintenance

- Review and update provider versions quarterly
- Monitor Terraform Cloud runs for drift detection
- Keep modules generic and reusable
- Document any manual changes before implementing in Terraform
