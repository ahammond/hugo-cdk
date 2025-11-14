#!/usr/bin/env bash
# Update GitHub repository variables from CloudFormation exports
#
# This script syncs AWS infrastructure values (IAM roles, S3 buckets,
# CloudFront distributions) to GitHub Actions variables in Hugo content repos.
#
# Usage:
#   ./scripts/update-github-vars.sh
#   AWS_PROFILE=production ./scripts/update-github-vars.sh

set -euo pipefail

PROFILE="${AWS_PROFILE:-personal}"
REGION="${AWS_REGION:-us-east-1}"
ORG="${GITHUB_ORG:-ahammond}"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_debug() { echo -e "${BLUE}[DEBUG]${NC} $1"; }

# Check prerequisites
check_prereqs() {
  local missing=0

  if ! command -v gh >/dev/null 2>&1; then
    log_error "gh CLI not found. Install: https://cli.github.com/"
    missing=1
  fi

  if ! command -v aws >/dev/null 2>&1; then
    log_error "aws CLI not found"
    missing=1
  fi

  if ! command -v jq >/dev/null 2>&1; then
    log_warn "jq not found. Install for better JSON parsing: brew install jq"
  fi

  if [[ $missing -eq 1 ]]; then
    exit 1
  fi

  # Check gh auth
  if ! gh auth status >/dev/null 2>&1; then
    log_error "Not authenticated to GitHub. Run: gh auth login"
    exit 1
  fi
}

# Get a CloudFormation export value
get_export() {
  local export_name="$1"
  local value

  if [[ -n "${AWS_PROFILE:-}" ]]; then
    value=$(aws cloudformation list-exports \
      --region "$REGION" \
      --profile "$PROFILE" \
      --query "Exports[?Name==\`${export_name}\`].Value" \
      --output text 2>/dev/null || echo "")
  else
    value=$(aws cloudformation list-exports \
      --region "$REGION" \
      --query "Exports[?Name==\`${export_name}\`].Value" \
      --output text 2>/dev/null || echo "")
  fi

  echo "$value"
}

# Update GitHub variables for a single site
update_vars() {
  local repo="$1"
  local prefix="$2"

  log_info "Processing ${prefix} → ${ORG}/${repo}..."

  local role_arn=$(get_export "${prefix}-GitHubActionsRoleArn")
  local bucket=$(get_export "${prefix}-S3BucketName")
  local cf_id=$(get_export "${prefix}-CloudFrontDistributionId")

  if [[ -z "$role_arn" || -z "$bucket" || -z "$cf_id" ]]; then
    log_error "Failed to fetch exports for ${prefix}. Stack may not be deployed."
    log_debug "  Role ARN: ${role_arn:-<missing>}"
    log_debug "  Bucket: ${bucket:-<missing>}"
    log_debug "  CloudFront ID: ${cf_id:-<missing>}"
    return 1
  fi

  log_debug "  Role: $role_arn"
  log_debug "  Bucket: $bucket"
  log_debug "  CF ID: $cf_id"

  # Update variables
  gh variable set AWS_ROLE_ARN --repo "${ORG}/${repo}" --body "$role_arn" || {
    log_error "Failed to set AWS_ROLE_ARN for ${ORG}/${repo}"
    return 1
  }

  gh variable set AWS_S3_BUCKET --repo "${ORG}/${repo}" --body "$bucket" || {
    log_error "Failed to set AWS_S3_BUCKET for ${ORG}/${repo}"
    return 1
  }

  gh variable set AWS_CLOUDFRONT_ID --repo "${ORG}/${repo}" --body "$cf_id" || {
    log_error "Failed to set AWS_CLOUDFRONT_ID for ${ORG}/${repo}"
    return 1
  }

  gh variable set AWS_REGION --repo "${ORG}/${repo}" --body "$REGION" || {
    log_error "Failed to set AWS_REGION for ${ORG}/${repo}"
    return 1
  }

  log_info "✓ Updated ${repo}"
}

main() {
  log_info "GitHub Variable Updater"
  log_info "AWS Profile: ${PROFILE:-<default>}, Region: $REGION"
  log_info "GitHub Org: $ORG"
  echo

  check_prereqs

  # Check for config file
  local config_file="config/sites.json"
  if [[ -f "$config_file" ]]; then
    log_info "Using config file: $config_file"

    if ! command -v jq >/dev/null 2>&1; then
      log_error "jq is required to parse config file. Install: brew install jq"
      exit 1
    fi

    # Read sites from config
    local sites=$(jq -r '.sites[] | "\(.githubRepo):\(.name)"' "$config_file")

    while IFS=: read -r repo name; do
      update_vars "$repo" "$name" || log_warn "Skipping ${repo}"
    done <<< "$sites"
  else
    log_info "No config file found. Using hardcoded sites."
    log_warn "Consider creating $config_file for single source of truth."
    echo

    # Hardcoded fallback
    update_vars "blog" "Blog" || log_warn "Skipping blog"
    update_vars "food" "Food" || log_warn "Skipping food"
  fi

  echo
  log_info "✓ All variables updated successfully"
}

main "$@"
