import { FieldValue, Firestore } from '@google-cloud/firestore'
import { PROJECT, PULSE_COLLECTION, SPEND_COLLECTION } from './constants.ts'
import type { Cached, DataOf, PulseStore, Source } from './pulse.ts'
import type { SpendStore } from './spend.ts'

// The spend totals in Firestore (D182): one document a UTC day and one a UTC
// month in chat-spend, each { usd, answers }, raised by atomic increments.
// They hold numbers only (D175). The service account's own login reaches
// them, with no key.

export function firestoreStore(db: Firestore = new Firestore({ projectId: PROJECT })): SpendStore {
  const collection = db.collection(SPEND_COLLECTION)
  return {
    async totals(day, month) {
      const [daySnap, monthSnap] = await db.getAll(collection.doc(day), collection.doc(month))
      const usd = (snap: typeof daySnap) => {
        const value: unknown = snap?.get('usd')
        return typeof value === 'number' ? value : 0
      }
      return { day: usd(daySnap), month: usd(monthSnap) }
    },
    async add(day, month, usd) {
      const batch = db.batch()
      const change = { usd: FieldValue.increment(usd), answers: FieldValue.increment(1) }
      batch.set(collection.doc(day), change, { merge: true })
      batch.set(collection.doc(month), change, { merge: true })
      await batch.commit()
    },
  }
}

// The pulse's cache (spec 041, D240): one document a source in pulse, each
// { data, fetched, tried }, holding the source's last good numbers and no
// visitor's data. Since D247 the only source is the App Store. A claim is a transaction, so across instances one request
// refreshes a source at a time, and at most once an hour.

export function firestorePulseStore(db: Firestore = new Firestore({ projectId: PROJECT })): PulseStore {
  const collection = db.collection(PULSE_COLLECTION)
  const number = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : undefined)
  return {
    async read<S extends Source>(source: S) {
      const snap = await collection.doc(source).get()
      if (!snap.exists) return undefined
      const data: unknown = snap.get('data')
      const cached: Cached<S> = {}
      if (typeof data === 'object' && data !== null) cached.data = data as DataOf[S]
      const fetched = number(snap.get('fetched'))
      const tried = number(snap.get('tried'))
      if (fetched !== undefined) cached.fetched = fetched
      if (tried !== undefined) cached.tried = tried
      return cached
    },
    async claim(source, now, stale) {
      const ref = collection.doc(source)
      return db.runTransaction(async (transaction) => {
        const snap = await transaction.get(ref)
        const tried = number(snap.get('tried'))
        if (tried !== undefined && tried > stale && tried <= now) return false
        transaction.set(ref, { tried: now }, { merge: true })
        return true
      })
    },
    async write(source, data, now) {
      await collection.doc(source).set({ data, fetched: now }, { merge: true })
    },
  }
}
