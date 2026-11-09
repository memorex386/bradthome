// The release flag (D190). The release workflow builds with BRADTHOME_RELEASE=1,
// and that build leaves out the chat: its button, its dialog, its gallery
// section and its code. Every other build, for CI, the previews and next,
// keeps it. Slice 4.4 removes the flag when v2.1 puts the chat on
// bradthome.com. Spec 019 retired the flag that kept /v2 off live; this one
// does the same for the chat (spec 022).

/** Whether this build is the release workflow's. */
export const isRelease = (env: NodeJS.ProcessEnv = process.env): boolean => env.BRADTHOME_RELEASE === '1'

/** The constant the site's one module reads, so a release build's bundler drops the chat's code. */
export const chatDefine = (env: NodeJS.ProcessEnv = process.env): Record<string, string> => ({
  __BRADTHOME_CHAT__: JSON.stringify(!isRelease(env)),
})
