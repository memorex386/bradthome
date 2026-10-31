// Stands in for `vitest run --project unit` in the Stop hook's integration
// test: two failing tests in one file, reported in the shape of Vitest's json
// reporter. The report goes to stdout, and also to --outputFile when it's given.
import { writeFileSync } from 'node:fs'
import path from 'node:path'

const file = path.resolve('tests/private-terms.test.ts').replaceAll('\\', '/')
const assertion = (title, status) => ({
  ancestorTitles: [],
  fullName: title,
  status,
  title,
  duration: 2,
  failureMessages: status === 'failed' ? ['AssertionError: expected true to be false'] : [],
  meta: {},
})
const report = {
  numTotalTestSuites: 1,
  numPassedTestSuites: 0,
  numFailedTestSuites: 1,
  numPendingTestSuites: 0,
  numTotalTests: 5,
  numPassedTests: 3,
  numFailedTests: 2,
  numPendingTests: 0,
  numTodoTests: 0,
  startTime: 1793000000000,
  success: false,
  testResults: [
    {
      assertionResults: [
        assertion('passes 1', 'passed'),
        assertion('passes 2', 'passed'),
        assertion('passes 3', 'passed'),
        assertion('fails 1', 'failed'),
        assertion('fails 2', 'failed'),
      ],
      startTime: 1793000000000,
      endTime: 1793000000100,
      status: 'failed',
      message: '',
      name: file,
    },
  ],
}
const text = `${JSON.stringify(report, null, 2)}\n`
const args = process.argv.slice(2)
for (const [index, arg] of args.entries()) {
  const inline = /^--outputFile(?:\.json)?=(.+)$/.exec(arg)
  const target = inline?.[1] ?? (/^--outputFile(?:\.json)?$/.test(arg) ? args[index + 1] : undefined)
  if (target !== undefined) writeFileSync(target, text)
}
process.stdout.write(text)
process.exitCode = 1
