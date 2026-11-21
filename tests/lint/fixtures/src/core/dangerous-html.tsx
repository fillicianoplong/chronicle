export function Danger(markup: string) {
  return <div dangerouslySetInnerHTML={{ __html: markup }} />
}
