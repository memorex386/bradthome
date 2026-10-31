// pre-push: blocks a push to main or one that rewrites history, checks branch
// and tag names for private terms, and re-runs the secret, term and address
// checks on every commit the remote doesn't have yet (FR-002, FR-006, FR-009).

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { checkCommit, type Failure } from '../lib/commits.ts'
import { blockForFailures, blockForRefs, passLine } from '../lib/messages.ts'

const ZERO = /^0+$/

export interface Update {
  readonly localRef: string
  readonly localSha: string
  readonly remoteRef: string
  readonly remoteSha: string
}

function git(...args: string[]): string {
  return execFileSync('git', args, { encoding: 'utf8' }).trim()
}

function readUpdates(): Update[] {
  return readFileSync(0, 'utf8')
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => {
      const [localRef = '', localSha = '', remoteRef = '', remoteSha = ''] = line.split(' ')
      return { localRef, localSha, remoteRef, remoteSha }
    })
}

/** The commits an update sends that the remote doesn't have yet. */
function outgoing(update: Update, remote: string): string[] {
  // A zero SHA on either side leaves nothing to compare, so skip the update.
  if (ZERO.test(update.localSha) || ZERO.test(update.remoteSha)) return []
  const list = git('rev-list', update.localSha, `^${update.remoteSha}`, '--not', `--remotes=${remote}`)
  return list === '' ? [] : list.split('\n')
}

function main(): number {
  const started = Date.now()
  const remote = process.argv[2] ?? 'origin'
  const updates = readUpdates()

  // Pushes to main, rewrites and names that hold a term stop the push first.
  const refBlock = blockForRefs(updates, remote)
  if (refBlock !== undefined) {
    process.stderr.write(refBlock)
    return 1
  }

  const commits = [...new Set(updates.flatMap((update) => outgoing(update, remote)))]
  const failures: Failure[] = commits.flatMap((sha) => checkCommit(sha))
  if (failures.length > 0) {
    process.stderr.write(blockForFailures(failures, commits.length))
    return 1
  }
  process.stderr.write(passLine('pre-push', `${commits.length} new commits checked`, Date.now() - started))
  return 0
}

process.exitCode = main()
