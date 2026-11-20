import styles from '../../styles/replay.css?url'
import { CONTROLS, PHONE, stepsOf, type Path, type Step } from './replay.ts'
import { aiOf, entryOf, finishedOf, meOf, offerOf, pillsOf, phoneOf, secOf, summaryOf, traceOf } from './render.ts'

// The replay's player (spec 047), its own chunk with its own styles, which the
// site's one module loads only as the replay nears the screen. Plain DOM, no
// framework. It plays the conversation and the trace step by step, and loops
// after a pause, but only while the replay is in view and the tab is shown;
// Pause, the first control, holds it until pressed again (WCAG 2.2.2). With
// reduced motion it draws the finished frame, still, and plays only when the
// visitor presses Play. The moving copy stays hidden from screen readers; the
// label's link leads to the same words as plain text.

const STOP = Symbol('stop')

/** How long each kind of step holds before the next, in ms (MA-29). */
export const HOLD = { sec: 300, tr: 650, dots: 900, ai: 1400, html: 1100, typed: 500, pick: 500, char: 45, send: 350, loop: 5000 } as const

/**
 * Links the replay's own stylesheet, by its URL rather than an import, so the
 * build never adds it to the page's styles, and waits for it before drawing.
 */
function linked(): Promise<void> {
  return new Promise((resolve, reject) => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = styles
    link.addEventListener('load', () => resolve(), { once: true })
    link.addEventListener('error', () => reject(new Error('The replay has no styles.')), { once: true })
    document.head.append(link)
  })
}

export async function start(root: HTMLElement): Promise<void> {
  const phone = root.querySelector<HTMLElement>('.r-phone')
  const trace = root.querySelector<HTMLElement>('.r-trace')
  if (!phone || !trace) return
  await linked()
  phone.innerHTML = phoneOf()
  trace.innerHTML = traceOf()
  const chat = root.querySelector<HTMLElement>('[data-r-chat]')
  const log = root.querySelector<HTMLElement>('[data-r-log]')
  const box = root.querySelector<HTMLElement>('[data-r-box]')
  const send = root.querySelector<HTMLElement>('[data-r-send]')
  const main = root.querySelector<HTMLButtonElement>('[data-replay-pause]')
  const restart = root.querySelector<HTMLButtonElement>('[data-replay-restart]')
  const paths = [...root.querySelectorAll<HTMLButtonElement>('[data-replay-path]')]
  if (!chat || !log || !box || !send || !main || !restart || paths.length !== 2) return

  // Reduced motion, as the replay's own stylesheet reads it (styles/replay.css), so the
  // site's scripts never ask the media themselves (spec 003). Read each time it matters.
  const stage = root.querySelector<HTMLElement>('.r-stage') ?? root
  const still = () => getComputedStyle(stage).getPropertyValue('--r-still').trim() === '1'
  let path: Path = 'accepts'
  let run = 0
  let playing = false
  let paused = false
  let inView = false
  let resume: (() => void) | undefined

  // A hold in progress, which a pause, a scroll away or a restart cuts short.
  const halts = new Set<() => void>()
  const running = () => playing && !paused && inView && !document.hidden
  const update = () => {
    if (!running()) for (const halt of [...halts]) halt()
    else if (resume) {
      const go = resume
      resume = undefined
      go()
    }
  }
  const whenRunning = () => (running() ? Promise.resolve() : new Promise<void>((go) => (resume = go)))

  // Waits a step's hold with one timer, counting only the time it plays.
  const wait = async (ms: number, id: number) => {
    let left = ms
    while (left > 0) {
      await whenRunning()
      if (id !== run) throw STOP
      const began = performance.now()
      await new Promise<void>((go) => {
        const done = () => {
          window.clearTimeout(timer)
          halts.delete(done)
          go()
        }
        const timer = window.setTimeout(done, left)
        halts.add(done)
      })
      if (id !== run) throw STOP
      left -= performance.now() - began
    }
  }

  const toEnd = (el: HTMLElement) => {
    el.scrollTop = el.scrollHeight
  }
  const label = () => {
    main.textContent = playing && !paused ? CONTROLS.pause : CONTROLS.play
  }
  const placeholder = () => {
    box.classList.remove('r-box--live')
    send.classList.remove('r-send--on')
    box.textContent = PHONE.placeholder
  }

  const add = (into: HTMLElement, html: string) => {
    into.insertAdjacentHTML('beforeend', html)
    toEnd(into)
  }

  const act = async (step: Step, id: number): Promise<number> => {
    if ('sec' in step) {
      add(log, secOf(step.sec))
      return HOLD.sec
    }
    if ('tr' in step) {
      log.querySelector('.r-now')?.classList.remove('r-now')
      add(log, entryOf(step.tr[0], step.tr[1], step.tr[2], true))
      return HOLD.tr
    }
    if ('dots' in step) {
      add(chat, '<p class="r-typing"><span></span><span></span><span></span></p>')
      return HOLD.dots
    }
    chat.querySelector('.r-typing')?.remove()
    if ('ai' in step) {
      add(chat, aiOf(step.ai))
      return HOLD.ai
    }
    if ('offer' in step) {
      add(chat, offerOf(step.offer))
      return HOLD.html
    }
    if ('pills' in step) {
      add(chat, pillsOf(step.pills))
      return HOLD.html
    }
    if ('summary' in step) {
      add(chat, summaryOf(step.summary[0], step.summary[1]))
      return HOLD.html
    }
    if ('type' in step) {
      box.textContent = ''
      box.classList.add('r-box--live')
      for (const letter of step.type) {
        box.textContent += letter
        await wait(HOLD.char, id)
      }
      send.classList.add('r-send--on')
      await wait(HOLD.send, id)
      placeholder()
      add(chat, meOf(step.type))
      return HOLD.typed
    }
    const card = chat.querySelector<HTMLElement>(`[data-r-offer="${step.pick[0]}"]`)
    card?.classList.add('r-offer--decided')
    card?.querySelector(step.pick[1] ? '.r-btn' : '.r-no')?.classList.add('r-pick')
    return HOLD.pick
  }

  // The finished frame, still: with reduced motion, and where a reduced-motion play ends.
  const finish = () => {
    const done = finishedOf(path)
    chat.innerHTML = done.chat
    log.innerHTML = done.log
    placeholder()
    toEnd(chat)
    toEnd(log)
  }

  const play = async () => {
    const id = ++run
    playing = true
    label()
    chat.innerHTML = ''
    log.innerHTML = ''
    placeholder()
    try {
      for (;;) {
        for (const step of stepsOf(path)) {
          await whenRunning()
          if (id !== run) return
          await wait(await act(step, id), id)
        }
        // With reduced motion, a play the visitor asked for ends on the finished frame, once.
        if (still()) break
        await wait(HOLD.loop, id)
        chat.innerHTML = ''
        log.innerHTML = ''
      }
    } catch (error) {
      if (error !== STOP) throw error
      return
    }
    playing = false
    label()
  }

  const stop = () => {
    run += 1
    playing = false
    resume = undefined
    for (const halt of [...halts]) halt()
  }

  main.addEventListener('click', () => {
    if (!playing) {
      paused = false
      void play()
      return
    }
    paused = !paused
    label()
    update()
  })
  restart.addEventListener('click', () => {
    paused = false
    stop()
    void play()
  })
  for (const button of paths)
    button.addEventListener('click', () => {
      path = button.dataset.replayPath === 'declines' ? 'declines' : 'accepts'
      for (const other of paths) other.setAttribute('aria-pressed', String(other === button))
      paused = false
      stop()
      if (still()) {
        finish()
        label()
      } else void play()
    })

  new IntersectionObserver(
    (entries) => {
      inView = entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.15)
      update()
    },
    { threshold: 0.15 },
  ).observe(root)
  document.addEventListener('visibilitychange', update)

  root.classList.add('is-ready')
  if (still()) {
    finish()
    label()
  } else void play()
}
