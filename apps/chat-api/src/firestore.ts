import { FieldValue, Firestore } from '@google-cloud/firestore'
import { PROJECT, SPEND_COLLECTION } from './constants.ts'
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
