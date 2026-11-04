import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, test } from 'vitest'

// CI never deploys the guard and gets no sign-in that could (FR-015, D105).

const WORKFLOWS = path.resolve('.github/workflows')

test('FR-015 no workflow deploys the cost guard or Cloud Functions', () => {
  for (const file of readdirSync(WORKFLOWS)) {
    const text = readFileSync(path.join(WORKFLOWS, file), 'utf8')
    expect(text, file).not.toMatch(/cost-guard/)
    expect(text, file).not.toMatch(/--only\s+functions|functions:deploy|gcloud\s+functions/)
  }
})

// Spec 008's release account holds only Firebase Hosting rights, so it can't
// deploy the guard either (D113).
test("FR-015 no workflow names the guard's service account or a Google identity but the preview's and the release's", () => {
  for (const file of readdirSync(WORKFLOWS)) {
    const text = readFileSync(path.join(WORKFLOWS, file), 'utf8')
    expect(text, file).not.toMatch(/iam\.gserviceaccount\.com/)
    for (const match of text.matchAll(/vars\.(GCP_\w+)/g)) {
      expect(['GCP_WORKLOAD_IDENTITY_PROVIDER', 'GCP_PREVIEW_SERVICE_ACCOUNT', 'GCP_RELEASE_SERVICE_ACCOUNT'], file).toContain(match[1])
    }
  }
})
