import type { SubjectHit } from '../data/TimelineSource.ts'

export function PickedSubject({ subject }: { subject: SubjectHit }) {
  return (
    <section className="picked-subject">
      <h1>{subject.label}</h1>
      <p className="picked-id">{subject.id}</p>
      {subject.description ? <p>{subject.description}</p> : null}
    </section>
  )
}
