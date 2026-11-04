# What the guard's identity may do

Asked of Policy Troubleshooter (`iam:troubleshoot`, v1) on 2026-11-04 for the principal `cost-guard@bradthome.iam.gserviceaccount.com`. It reports access without signing in as the identity and without making any change. "Another project" is another project on the same billing account, not named here.

- bradthome deleteBillingAssignment: granted
- bradthome createBillingAssignment: denied
- another project deleteBillingAssignment: denied
- another project createBillingAssignment: denied
- billing account billing.resourceAssociations.create: denied
- billing account billing.accounts.get: denied
- billing account billing.budgets.update: denied

Google's answers were `GRANTED` for the first line and `NOT_GRANTED` for every other.
