export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="light"
      data-theme="default"
      style={{
        position: 'fixed',
        inset: 0,
        overflow: 'auto',
        background: '#f8f4ec',
        colorScheme: 'light',
      }}
    >
      {children}
    </div>
  )
}
