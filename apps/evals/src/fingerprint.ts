// The fingerprint lives with the hooks' libraries, which may use only Node's
// built-ins (spec 001's FR-029), so the pre-push hook can take it too.
export { changedParts, FINGERPRINT_FILES, type Fingerprint, fingerprintOf, MODEL_SETTINGS, modelSettings, PART_NAMES } from '../../../scripts/lib/fingerprint.ts'
