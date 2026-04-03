export default function ChatLoading() {
  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="w-[260px] bg-surf2 border-r border-border2 animate-pulse p-[12px] space-y-[8px]">
        <div className="h-[32px] bg-surface rounded-[8px]" />
        {[1,2,3,4,5].map(i => <div key={i} className="h-[40px] bg-surface rounded-[8px]" />)}
      </div>
      <div className="flex-1 animate-pulse p-[20px] space-y-[12px]">
        {[1,2,3,4].map(i => <div key={i} className="h-[60px] bg-surf2 rounded-[10px]" />)}
      </div>
    </div>
  )
}
