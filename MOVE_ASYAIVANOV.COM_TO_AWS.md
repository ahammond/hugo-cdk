# Transferring asyaivanov.com from Squarespace to AWS Route 53

## Executive Summary

This document provides a complete guide for transferring the domain **asyaivanov.com** from Squarespace Domains to AWS Route 53 for management under AWS account 263869919117 (personal profile).

**Critical Date: The domain cannot be transferred until April 8, 2025** (60 days after registration on February 7, 2025). This is an ICANN regulation that cannot be bypassed.

## Current Domain Status

- **Domain**: asyaivanov.com
- **Registrar**: Squarespace Domains LLC
- **Created**: February 7, 2025
- **Expires**: February 7, 2028
- **Current DNS**: Google Cloud DNS (ns-cloud-a1/a2/a3/a4.googledomains.com)
- **Current A Record**: 198.185.159.145
- **Organization**: Asya Ivanov
- **Status Codes**:
  - `clientDeleteProhibited` - prevents accidental deletion (normal)
  - `clientTransferProhibited` - currently locked from transfers (normal for first 60 days)

## Transfer Timeline

### Phase 1: Preparation (Now - April 7, 2025)

**Goal**: Migrate DNS management to Route 53 before transferring domain registration to ensure zero downtime.

#### Step 1.1: Create Route 53 Hosted Zone

```bash
# This will be done via CDK - see Configuration section below
pnpm projen build
pnpm run deploy
```

Cost: $0.50/month for hosted zone

#### Step 1.2: Document Current DNS Records

Before creating the hosted zone, document all current DNS records from Squarespace:

1. Log into Squarespace account
2. Go to Settings → Domains → asyaivanov.com
3. Navigate to DNS Settings
4. Document all records (A, AAAA, CNAME, MX, TXT, etc.)

Current known records:
- A record: 198.185.159.145

#### Step 1.3: Update Nameservers at Squarespace

After CDK deployment creates the Route 53 hosted zone:

1. Get the Route 53 nameservers from AWS Console or CDK outputs
2. Log into Squarespace
3. Go to Settings → Domains → asyaivanov.com
4. Click "Use Custom Nameservers"
5. Enter the four Route 53 nameservers (format: ns-####.awsdns-##.tld)
6. Save changes
7. Wait 24-48 hours for DNS propagation

#### Step 1.4: Verify DNS Migration

```bash
# Check nameservers
dig asyaivanov.com NS +short

# Check A record
dig asyaivanov.com A +short

# Check from multiple locations
dig @8.8.8.8 asyaivanov.com A +short
dig @1.1.1.1 asyaivanov.com A +short
```

#### Step 1.5: Pre-Transfer Checklist

- [ ] Verify registrant email address is current and accessible
- [ ] Ensure contact information is accurate
- [ ] **DO NOT** change registrant contact information (triggers additional 60-day lock)
- [ ] Document any DNSSEC settings
- [ ] Mark calendar for April 8, 2025

### Phase 2: Unlock and Request Transfer Code (April 8, 2025+)

**Day 0: April 8, 2025** - Domain becomes eligible for transfer

#### Step 2.1: Unlock Domain at Squarespace

1. Log into Squarespace account
2. Go to **Settings** → **Domains**
3. Click on **asyaivanov.com**
4. Scroll down to find the **Domain Lock** toggle
5. Switch the Domain Lock to **OFF**
6. Confirm the action

#### Step 2.2: Disable DNSSEC (if enabled)

1. In the same domain settings page
2. Look for DNSSEC settings
3. Disable DNSSEC if currently enabled
4. **Important**: Must be done BEFORE requesting transfer code

#### Step 2.3: Request Authorization/EPP Code

1. Still in domain settings for asyaivanov.com
2. Scroll to bottom and click **"Request transfer code"**
3. Enter Squarespace account password (or complete 2FA)
4. Click **OK** to confirm

#### Step 2.4: Retrieve Authorization Code

1. Check email (registrant contact email)
2. Look for email from **customercare@squarespace.com**
3. Subject: **"Auth code for asyaivanov.com"**
4. Should arrive within 24 hours (check spam folder)
5. **Save this code securely** - you'll need it for AWS

### Phase 3: Initiate Transfer in AWS (April 9, 2025+)

**Day 1: April 9, 2025** - After receiving auth code

#### Step 3.1: Start Transfer via AWS CLI

```bash
# Note: Route 53 domain operations must use us-east-1
aws route53domains transfer-domain \
  --domain-name asyaivanov.com \
  --duration-in-years 1 \
  --auth-code "AUTH-CODE-FROM-EMAIL" \
  --admin-contact \
    FirstName=Andrew,LastName=Hammond,ContactType=PERSON,\
    AddressLine1="ADDRESS",City="CITY",State="STATE",\
    CountryCode=US,ZipCode="ZIP",PhoneNumber="+1.PHONE",\
    Email="EMAIL" \
  --registrant-contact \
    FirstName=Asya,LastName=Ivanov,ContactType=PERSON,\
    AddressLine1="ADDRESS",City="CITY",State="STATE",\
    CountryCode=US,ZipCode="ZIP",PhoneNumber="+1.PHONE",\
    Email="EMAIL" \
  --tech-contact \
    FirstName=Andrew,LastName=Hammond,ContactType=PERSON,\
    AddressLine1="ADDRESS",City="CITY",State="STATE",\
    CountryCode=US,ZipCode="ZIP",PhoneNumber="+1.PHONE",\
    Email="EMAIL" \
  --profile personal \
  --region us-east-1
```

**Alternative: Use AWS Console**

1. Log into AWS Console with personal profile
2. Navigate to **Route 53**
3. Click **Registered Domains** (left sidebar)
4. Click **Transfer Domain** button
5. Enter **asyaivanov.com**
6. Enter authorization code from Squarespace
7. Click **Check** to verify eligibility
8. Fill in contact information
9. Enable **Auto-renew** (recommended)
10. Choose **Transfer Lock** after transfer (recommended)
11. Review privacy protection settings
12. Add to cart and proceed to checkout

#### Step 3.2: Pay Transfer Fee

- Cost: ~$12 for .com domain (includes 1-year renewal)
- **Note**: AWS credits CANNOT be used for domain transfers
- Credit card payment required
- AWS charges immediately but refunds if transfer fails

#### Step 3.3: Monitor Transfer Request

```bash
# Check transfer status
aws route53domains get-operation-detail \
  --operation-id "OPERATION-ID-FROM-TRANSFER-RESPONSE" \
  --profile personal \
  --region us-east-1

# List all domain operations
aws route53domains list-operations \
  --profile personal \
  --region us-east-1
```

### Phase 4: Authorize Transfer (April 9-14, 2025)

**Days 1-5: Authorization period**

#### Step 4.1: Check Email for Authorization

You will receive multiple emails:

1. **From Squarespace**: Transfer request notification
   - May include option to cancel transfer
   - **Do NOT cancel** unless you want to stop the transfer

2. **From Route 53/ICANN**: Authorization link
   - This is the critical email
   - Must click to authorize transfer
   - Check spam folder if not received

#### Step 4.2: Authorize the Transfer

1. Open email from Route 53 or ICANN-approved registrar
2. Click the **authorization link**
3. Confirm you want to proceed with transfer
4. Authorization speeds up transfer process

**Timeline**:
- If you click authorization link: Transfer begins immediately
- If you don't respond: Transfer auto-starts after 5 days
- Squarespace has 5 business days to approve/reject

#### Step 4.3: Wait for Completion

Typical timeline:
- **Email authorization**: 0-5 days
- **Registrar approval**: 0-7 days for generic TLDs (.com)
- **Total transfer time**: Up to 15 days maximum (usually 5-10 days)

### Phase 5: Post-Transfer Configuration (April 14-24, 2025)

**Day 5-15: Transfer completes**

#### Step 5.1: Verify Transfer Completion

```bash
# Check domain registration
aws route53domains get-domain-detail \
  --domain-name asyaivanov.com \
  --profile personal \
  --region us-east-1

# Verify nameservers
dig asyaivanov.com NS +short
```

#### Step 5.2: Post-Transfer Checklist

- [ ] Verify domain appears in Route 53 Registered Domains
- [ ] Confirm hosted zone was auto-created (should already exist from Phase 1)
- [ ] Check DNS records are intact and resolving correctly
- [ ] Verify transfer lock is enabled
- [ ] Enable auto-renewal if not already enabled
- [ ] Consider re-enabling DNSSEC (optional)
- [ ] Update documentation with new registrar info

#### Step 5.3: Configure Auto-Renewal

```bash
# Enable auto-renewal
aws route53domains enable-domain-auto-renew \
  --domain-name asyaivanov.com \
  --profile personal \
  --region us-east-1

# Verify auto-renewal status
aws route53domains get-domain-detail \
  --domain-name asyaivanov.com \
  --profile personal \
  --region us-east-1 \
  | jq .AutoRenew
```

#### Step 5.4: Enable Transfer Lock

```bash
# Enable transfer lock
aws route53domains enable-domain-transfer-lock \
  --domain-name asyaivanov.com \
  --profile personal \
  --region us-east-1

# Verify lock status
aws route53domains get-domain-detail \
  --domain-name asyaivanov.com \
  --profile personal \
  --region us-east-1 \
  | jq .StatusList
```

## CDK Configuration

### Adding asyaivanov.com to the CDK Stack

Edit `src/main.ts` to add a new stack for asyaivanov.com:

```typescript
// Add after existing stacks
new HugoSiteStack(app, 'AsyaIvanov', {
  env,
  siteName: 'asyaivanov',
  siteDomain: 'asyaivanov.com',
  github: {
    org: githubOrg,
    repo: 'asyaivanov.com',
    allowedBranches: ['main'],
  },
});
```

### Deploy the Stack

```bash
# Build the project
pnpm projen build

# Preview changes
pnpm run diff

# Deploy the stack
pnpm cdk deploy AsyaIvanov --profile personal

# Or deploy all stacks
pnpm run deploy
```

### CDK Outputs

After deployment, the stack will output:

- **HostedZoneId**: Route 53 hosted zone ID
- **NameServers**: Four nameservers to configure at Squarespace
- **S3BucketName**: Bucket for Hugo site content
- **CloudFrontDistributionId**: For cache invalidation
- **GitHubActionsRoleArn**: IAM role for GitHub Actions OIDC

### Configure GitHub Repository

Once the domain transfer is complete and the CDK stack is deployed:

1. Create Hugo repository at `github.com/<org>/asyaivanov.com`
2. Copy `.github/workflows/deploy.yml.example` from this repo
3. Set GitHub repository secrets:
   - `AWS_ROLE_ARN`: From CDK stack output
   - `AWS_S3_BUCKET`: From CDK stack output
   - `AWS_CLOUDFRONT_ID`: From CDK stack output

See `docs/github-actions-setup.md` for detailed instructions.

## Cost Summary

### One-Time Costs

- **Domain transfer fee**: ~$12 (includes 1-year renewal)
- **Total one-time**: ~$12

### Ongoing Monthly Costs

- **Route 53 Hosted Zone**: $0.50/month
- **DNS queries**: $0.40 per million queries (negligible for personal site)
- **S3 storage**: ~$0.01-0.10/month (Intelligent-Tiering)
- **CloudFront**: Free tier covers most personal sites
- **Total monthly**: ~$0.50-1.00

### Annual Renewal

- **Domain renewal**: ~$12/year (.com domains)
- **AWS services**: ~$6-12/year

## Important Considerations

### 60-Day Lock Period

- **Cannot be bypassed**: ICANN regulation applies to ALL registrars
- **Applies to**: All ICANN-regulated TLDs (.com, .org, .net, etc.)
- **Your lock expires**: April 8, 2025 (60 days after February 7, 2025)
- **Additional triggers**: Changing registrant contact adds another 60 days

### Contact Information

- **DO NOT** change registrant email or name before transfer
- **DO** verify current email is accessible
- **DO** update contact info AFTER transfer completes
- Changes trigger an additional 60-day lock (120 days total)

### DNSSEC

- **Must disable** at Squarespace BEFORE requesting auth code
- **Can re-enable** after transfer completes in Route 53
- Check current status in Squarespace domain settings

### DNS Service Continuity

- **Recommended approach**: Migrate DNS FIRST (Phase 1)
- Creates Route 53 hosted zone before transfer
- Updates nameservers before transfer
- Ensures zero downtime during 5-15 day transfer window
- **Alternative**: Transfer DNS and registration together (risks downtime)

### Authorization Email

- **Must** be sent to registrant email on file
- **Check** spam/junk folders if not received within 24 hours
- **Timeline**: 5 days to respond (auto-proceeds if no response)
- **Important**: Authorization speeds up the process

### Transfer Cancellation

- **Squarespace emails**: Option to cancel transfer
- **Window**: Typically 5 business days
- **Action**: Do NOT click cancel unless you want to stop transfer
- **No action**: Transfer proceeds automatically

### AWS Account Considerations

- **Account**: Domain will be associated with AWS account 263869919117
- **Profile**: Using `personal` AWS CLI profile
- **Payment**: Valid payment method required (no AWS credits)
- **Long-term**: Consider which account should own domain permanently

### Nameserver Changes

- **Before transfer**: Changes propagate normally (recommended)
- **During transfer**: Changes may not propagate properly
- **Best practice**: Update nameservers in Phase 1, before initiating transfer

## Troubleshooting

### Transfer Fails

**Possible causes**:
- Domain still within 60-day lock period
- Incorrect authorization code
- Domain lock not disabled
- DNSSEC still enabled
- Registrant email bounced

**Resolution**:
1. Verify domain age (must be 60+ days)
2. Request new auth code from Squarespace
3. Verify domain lock is OFF
4. Confirm DNSSEC is disabled
5. Check registrant email is accessible

### Authorization Email Not Received

**Check**:
- Spam/junk folder
- Registrant email address is correct
- Wait up to 24 hours

**Action**:
- Contact AWS Support if not received after 24 hours
- Verify email with AWS Route 53 domain operations

### DNS Not Resolving After Nameserver Change

**Timeline**:
- Nameserver changes take 24-48 hours to fully propagate
- Some ISPs cache DNS longer

**Verification**:
```bash
# Check authoritative nameservers
dig asyaivanov.com NS +trace

# Query specific nameservers
dig @ns-xxxx.awsdns-xx.com asyaivanov.com A

# Check from different DNS resolvers
dig @8.8.8.8 asyaivanov.com A  # Google
dig @1.1.1.1 asyaivanov.com A  # Cloudflare
```

### Transfer Takes Longer Than Expected

**Normal timeline**:
- 5-15 days is standard for .com domains
- Up to 15 days is within normal range

**Action**:
- Monitor transfer status daily
- Contact AWS Support if exceeds 15 days
- Check for any rejection emails from Squarespace

## Reference Documentation

### Official Documentation

- **Squarespace - Transferring away**: https://support.squarespace.com/hc/en-us/articles/205812338-Transferring-a-domain-away-from-Squarespace
- **Squarespace - Domain locks**: https://support.squarespace.com/hc/en-us/articles/360034059332-Domain-locks
- **AWS Route 53 - Transfer to Route 53**: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/domain-transfer-to-route-53.html
- **AWS Route 53 - Pricing**: https://aws.amazon.com/route53/pricing/
- **ICANN - Transfer Policy**: https://www.icann.org/resources/pages/transfer-policy-2016-06-01-en

### AWS CLI Commands Reference

```bash
# Check domain availability/eligibility
aws route53domains check-domain-transferability \
  --domain-name asyaivanov.com \
  --profile personal \
  --region us-east-1

# Transfer domain
aws route53domains transfer-domain \
  --domain-name asyaivanov.com \
  --duration-in-years 1 \
  --auth-code "CODE" \
  --admin-contact ContactInfo \
  --registrant-contact ContactInfo \
  --tech-contact ContactInfo \
  --profile personal \
  --region us-east-1

# Get operation status
aws route53domains get-operation-detail \
  --operation-id "OPERATION-ID" \
  --profile personal \
  --region us-east-1

# List operations
aws route53domains list-operations \
  --profile personal \
  --region us-east-1

# Get domain details
aws route53domains get-domain-detail \
  --domain-name asyaivanov.com \
  --profile personal \
  --region us-east-1

# Enable auto-renew
aws route53domains enable-domain-auto-renew \
  --domain-name asyaivanov.com \
  --profile personal \
  --region us-east-1

# Enable transfer lock
aws route53domains enable-domain-transfer-lock \
  --domain-name asyaivanov.com \
  --profile personal \
  --region us-east-1

# List hosted zones
aws route53 list-hosted-zones \
  --profile personal

# Get hosted zone details
aws route53 get-hosted-zone \
  --id /hostedzone/ZONE-ID \
  --profile personal
```

## Checklist Summary

### Pre-Transfer (Now - April 7, 2025)
- [ ] Deploy CDK stack to create Route 53 hosted zone
- [ ] Document current DNS records from Squarespace
- [ ] Update nameservers at Squarespace to Route 53
- [ ] Wait 24-48 hours for DNS propagation
- [ ] Verify DNS resolution working correctly
- [ ] Confirm registrant email is accessible
- [ ] Verify contact information is accurate
- [ ] **DO NOT** change registrant contact info
- [ ] Mark calendar for April 8, 2025

### Transfer Day (April 8, 2025+)
- [ ] Unlock domain at Squarespace (disable Domain Lock)
- [ ] Disable DNSSEC at Squarespace
- [ ] Request authorization/EPP code
- [ ] Receive auth code email (check spam, wait 24h)
- [ ] Initiate transfer in Route 53 (CLI or Console)
- [ ] Enter authorization code
- [ ] Fill in contact information
- [ ] Pay transfer fee (~$12)
- [ ] Authorize via email link from Route 53/ICANN

### During Transfer (April 9-24, 2025)
- [ ] Monitor transfer status daily
- [ ] Check for emails from Squarespace and Route 53
- [ ] Do NOT cancel transfer at Squarespace
- [ ] Wait for transfer completion (5-15 days)

### Post-Transfer (April 24+, 2025)
- [ ] Verify domain in Route 53 Registered Domains
- [ ] Confirm hosted zone exists and has correct records
- [ ] Test DNS resolution from multiple locations
- [ ] Enable transfer lock
- [ ] Enable auto-renewal
- [ ] Consider re-enabling DNSSEC
- [ ] Update documentation with new registrar
- [ ] Configure GitHub repository and Actions
- [ ] Deploy Hugo site to verify full stack

## Contact Information

### Support Channels

**Squarespace Support**:
- Email: customercare@squarespace.com
- Help Center: https://support.squarespace.com/hc/en-us

**AWS Support**:
- Console: https://console.aws.amazon.com/support/home
- Phone: 1-866-766-5050 (US)
- Domain-specific issues: Route 53 domain registration team

**ICANN**:
- Transfer issues: https://www.icann.org/resources/pages/transfer-policy-2016-06-01-en
- Registrar problems: Submit ICANN complaint

## Project Context

This domain transfer is part of deploying Hugo static sites to AWS infrastructure using the `hugo-cdk` CDK application.

**Repository**: `/Users/andrewhammond/Documents/ahammond/hugo-cdk`

**Related Files**:
- `src/main.ts` - CDK app entry point
- `src/hugo-site.ts` - HugoSiteStack construct
- `src/static-site.ts` - StaticSite construct
- `src/github-oidc-role.ts` - GitHub Actions IAM role
- `docs/github-actions-setup.md` - GitHub Actions configuration

**AWS Account**: 263869919117 (personal profile)

**Existing Domains in Account**:
- asyahammond.com (Z248ICD6D6PSA)
- agh1973.com (Z2EIFYZCOMYC7P)

---

*Document created: February 27, 2026*
*Last updated: February 27, 2026*
*Domain transfer eligible: April 8, 2025*
