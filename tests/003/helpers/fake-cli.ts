import { chmodSync, copyFileSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { slash } from '../../001/helpers/paths.ts'
import type { Sandbox } from '../../001/helpers/sandbox.ts'
import { installFakeGh } from '../../002/helpers/fake-gh.ts'

// A fake command first on PATH, such as docker or firebase. On Windows it
// reuses spec 002's compiled launcher, which runs the script that the gh.json
// beside it names, so a copy named <name>.exe runs the fake. The fake gets its
// folder first, reads scenario.json there, and logs each call to calls.jsonl.

export interface FakeCli {
  env: NodeJS.ProcessEnv
  /** The folder the fake runs from, with scenario.json and calls.jsonl. */
  bin: string
  calls(): string[][]
}

export function installFakeCli(sandbox: Pick<Sandbox, 'env' | 'path'>, name: string, script: string, scenario: unknown): FakeCli {
  const fake = installFakeGh(sandbox, {}, `fake-${name}`)
  const bin = sandbox.path(`fake-${name}`)
  writeFileSync(path.join(bin, 'scenario.json'), `${JSON.stringify(scenario, null, 2)}\n`)
  const node = slash(process.execPath)
  if (process.platform === 'win32') {
    writeFileSync(path.join(bin, 'gh.json'), `${JSON.stringify({ node, script: slash(script) })}\n`)
    copyFileSync(path.join(bin, 'gh.exe'), path.join(bin, `${name}.exe`))
    writeFileSync(path.join(bin, `${name}.cmd`), `@"${node}" "${slash(script)}" "${slash(bin)}" %*\r\n`)
    rmSync(path.join(bin, 'gh.exe'))
    rmSync(path.join(bin, 'gh.cmd'))
  } else {
    rmSync(path.join(bin, 'gh'))
    const launcher = path.join(bin, name)
    writeFileSync(launcher, `#!/bin/sh\nexec "${node}" "${script}" "${bin}" "$@"\n`)
    chmodSync(launcher, 0o755)
  }
  return {
    env: fake.env,
    bin,
    calls: () =>
      readFileSync(path.join(bin, 'calls.jsonl'), 'utf8')
        .split('\n')
        .filter((line) => line !== '')
        .map((line) => (JSON.parse(line) as { args: string[] }).args),
  }
}
