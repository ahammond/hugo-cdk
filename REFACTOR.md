# Hugo CDK Refactor: Domain-Scoped Infrastructure

## Proposed Architecture

```
app
├── agh1973-prod
│   ├── Cert          # *.agh1973.com wildcard ACM certificate
│   ├── Blog          # blog.agh1973.com
│   ├── Food          # food.agh1973.com
│   └── Politics      # politics.agh1973.com
└── asyahammond-prod
    ├── Cert          # *.asyahammond.com wildcard ACM certificate
    ├── Portfolio     # portfolio.asyahammond.com
    └── Westview      # westview.asyahammond.com
```

## What Changes

### Wildcard Certificates

Each domain gets a single `*.domain` ACM certificate in a dedicated `Cert` nested stack,
replacing the current per-site dedicated certificates.

`StaticSite` gains an optional `certificate?: ICertificate` prop. When provided, it skips
creating its own certificate. The `Cert` stack creates the certificate and passes it as a
direct object reference to each sibling site stack — no CloudFormation exports, no SSM
parameters, no cross-stack reference indirection.

### Domain-Scoped Parent Stacks

The single `HugoCDK-prod` parent is replaced by two domain-scoped parents: `agh1973-prod`
and `asyahammond-prod`. Each parent owns the cert and all sites for its domain.

The pipeline deploy glob becomes `"*-prod/*"` to cover both parent stacks.

## Philosophy

### Infrastructure Lifecycle Should Match Ownership Boundaries

The old `HugoCDK-prod` monolith grouped sites by deployment mechanism (all Hugo sites), not
by ownership. `agh1973.com` and `asyahammond.com` are distinct domains with distinct owners.
They share implementation but not identity. The stack structure should reflect that.

### Cert Lifecycle Decoupled from Site Lifecycle

A certificate is domain infrastructure, not site infrastructure. It should not be created or
destroyed as a side effect of spinning up or tearing down a specific site. Nesting the cert
within the domain parent (but as a sibling to the site stacks, not inside one of them) gives
it an appropriate lifecycle: it survives individual site stack teardowns but is still managed
as part of the domain group.

### Direct Object References Over CloudFormation Exports

Sibling nested stacks under the same parent can share CDK construct references directly.
This is preferable to CloudFormation `Fn::ImportValue` exports, which create brittle
deployment-order dependencies and prevent stacks from being deleted while exports are in use.
By keeping cert and site stacks as siblings under the same parent, the cert is passed as an
`ICertificate` object — CDK resolves the dependency graph correctly at synth time.

### One Parent Stack Per Domain

Each `*-prod` parent stack is the unit of deployment for a domain. `cdk deploy agh1973-prod`
deploys the cert and all sites for that domain. This is operationally intuitive: if you are
working on `agh1973.com`, you deploy `agh1973-prod`. The pipeline deploys both with `*-prod/*`.

## Migration

This refactor requires a teardown and re-spin of the existing `HugoCDK-prod` stacks.
The site content in S3 is unaffected (buckets are named by FQDN and can be re-imported
or simply re-synced from GitHub Actions after the new stacks are up).

Order of operations:
1. Destroy existing `HugoCDK-prod` stacks
2. Deploy new `agh1973-prod` and `asyahammond-prod` stacks
3. Update GitHub Actions secrets in each Hugo repo with new stack outputs (role ARNs,
   bucket names, distribution IDs are stable — named by FQDN — so these should be unchanged)
4. Trigger a deploy in each Hugo repo to re-sync content
