// What spec 021's tests need from the API's own dependencies, which resolve
// from this package only. The server never imports this file, so the bundle
// leaves it out.
export { solveChallenge } from 'altcha-lib'
export { deriveKey } from 'altcha-lib/algorithms/pbkdf2'
export { simulateReadableStream } from 'ai'
export { MockLanguageModelV4 } from 'ai/test'
export { createAnthropic } from '@ai-sdk/anthropic'
