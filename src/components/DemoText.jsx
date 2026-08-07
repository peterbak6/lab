export function DemoIntro({ children, wiki }) {
  return (
    <div className="demo-intro">
      <p>{children}</p>
      <a href={wiki} target="_blank" rel="noreferrer">wiki ↗</a>
    </div>
  )
}

export function ControlGuide({ items }) {
  return (
    <>
      <p className="section-label control-guide-label">How controls affect the view</p>
      <div className="control-guide">
        {items.map(({ name, text }) => <div key={name}><strong>{name}</strong><p>{text}</p></div>)}
      </div>
    </>
  )
}
