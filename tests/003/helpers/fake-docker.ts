import type { Sandbox } from '../../001/helpers/sandbox.ts'
import { type FakeCli, installFakeCli } from './fake-cli.ts'
import { fixturePath } from './paths.ts'

// A fake docker first on PATH, for the setup check's Docker line (FR-022).

export interface DockerScenario {
  /** false when Docker's engine isn't running: the client answers, the daemon doesn't. */
  daemon?: boolean
}

export type FakeDocker = Pick<FakeCli, 'env' | 'calls'>

export function installFakeDocker(sandbox: Pick<Sandbox, 'env' | 'path'>, scenario: DockerScenario): FakeDocker {
  return installFakeCli(sandbox, 'docker', fixturePath('fake-docker', 'fake-docker.mjs'), scenario)
}
