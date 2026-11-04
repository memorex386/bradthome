# The guard's identity

Read with Brad's gcloud login on 2026-11-04, after the second dry-run deploy: `gcloud projects get-iam-policy bradthome`, `gcloud billing accounts get-iam-policy` on the account that pays for `bradthome`, `gcloud iam roles describe costGuardUnlinker --project bradthome`, `gcloud iam service-accounts keys list --managed-by user` and `gcloud run services get-iam-policy costguard`, each filtered to `cost-guard@bradthome.iam.gserviceaccount.com`.

- service account: cost-guard@bradthome.iam.gserviceaccount.com
- custom role costGuardUnlinker permissions: resourcemanager.projects.deleteBillingAssignment
- cost-guard roles on bradthome: projects/bradthome/roles/costGuardUnlinker
- cost-guard roles on its own service costguard: roles/run.invoker
- cost-guard roles on the billing account: none
- cost-guard user-managed keys: none
- function settings: 0.1666 vCPU, 256Mi, max 1 instance, min 0, 60 s, RETRY_POLICY_DO_NOT_RETRY, DRY_RUN true
