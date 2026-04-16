export default function FormLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'auto', background: '#f8f4ec' }}>
      {children}
    </div>
  )
}
