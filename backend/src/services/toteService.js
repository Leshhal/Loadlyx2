export const TOTE_TRANSITIONS = Object.freeze({ AVAILABLE: ['RESERVED','CLEANING','DAMAGED','RETIRED'], RESERVED: ['OUT_FOR_DELIVERY','AVAILABLE'], OUT_FOR_DELIVERY: ['RENTED','AVAILABLE','LOST'], RENTED: ['OVERDUE','RETURNED','DAMAGED','LOST'], OVERDUE: ['RETURNED','DAMAGED','LOST'], RETURNED: ['CLEANING','DAMAGED'], CLEANING: ['AVAILABLE','DAMAGED','RETIRED'], DAMAGED: ['CLEANING','RETIRED'], LOST: ['AVAILABLE','RETIRED'], RETIRED: [] });

export function assertToteTransition(from, to) {
  if (!(TOTE_TRANSITIONS[from] || []).includes(to)) throw new Error(`Invalid tote transition ${from} -> ${to}`);
}

export function toteIsAvailable(state) { return state === 'AVAILABLE'; }
