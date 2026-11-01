// Stands in for `tsc` in the Stop hook's integration test: one type error,
// in tsc's plain format, and tsc's exit code for errors.
process.stdout.write(
  "scripts/private-terms.ts(41,7): error TS2322: Type 'string | undefined' is not assignable to type 'string'.\n",
)
process.exitCode = 2
