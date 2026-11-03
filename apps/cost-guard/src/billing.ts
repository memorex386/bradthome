import { PROJECT } from './decide.ts'
import type { BillingClient } from './guard.ts'

// The one Cloud Billing call the guard makes (spec 004, FR-004): set the
// project's billing account to none. Cloud Billing checks only
// resourcemanager.projects.deleteBillingAssignment on the project for it,
// which is the one permission the guard's identity holds (FR-007). Setting it
// to none when it's already none succeeds, so a repeat call is safe (S1.4).

/** The part of @google-cloud/billing's CloudBillingClient the guard uses. */
export interface CloudBillingApi {
  updateProjectBillingInfo(request: { name: string; projectBillingInfo: { billingAccountName: string } }): Promise<unknown>
}

export function cloudBilling(client: CloudBillingApi): BillingClient {
  return {
    async unlink(project: string): Promise<void> {
      if (project !== PROJECT) throw new Error(`the cost guard only unlinks ${PROJECT}, not ${project}`)
      await client.updateProjectBillingInfo({ name: PROJECT, projectBillingInfo: { billingAccountName: '' } })
    },
  }
}
