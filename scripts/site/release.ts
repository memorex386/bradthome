// The release flag, back for interview prep (spec 024, D190). The release
// workflow builds with BRADTHOME_RELEASE=1, and that build leaves out prep:
// the window's mode switch, prep's code and the gallery's prep section. The
// chat itself is in every build since v2.1. Every other build, for CI, the
// previews and next, keeps prep. v2.2 removes the flag when prep goes live.

/** Whether this build is the release workflow's. */
export const isRelease = (env: NodeJS.ProcessEnv = process.env): boolean => env.BRADTHOME_RELEASE === '1'

/** The constant the window reads, so a release build's bundler drops prep's code. */
export const prepDefine = (env: NodeJS.ProcessEnv = process.env): Record<string, string> => ({
  __BRADTHOME_PREP__: JSON.stringify(!isRelease(env)),
})
