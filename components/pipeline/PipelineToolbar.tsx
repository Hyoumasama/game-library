export default function PipelineToolbar({ count, editing, busy, isAdmin, onAdd, onEdit }: {
  count: number; editing: boolean; busy: boolean; isAdmin: boolean; onAdd: () => void; onEdit: () => void;
}) {
  return <header className="pipeline-toolbar">
    <div><p className="pipeline-eyebrow">YOUR NEXT ADVENTURE</p><h1>Play Pipeline</h1><p className="pipeline-subtitle">Your path through the games you want to play next.</p></div>
    <div className="pipeline-toolbar-actions"><span className="pipeline-count">{count} {count === 1 ? "Game" : "Games"}</span>
      {isAdmin && <><button className="pipeline-button pipeline-primary" onClick={onAdd} disabled={busy || count >= 15}>+ Add Game</button><button className="pipeline-button" onClick={onEdit} disabled={busy} aria-pressed={editing}>{editing ? "Done Editing" : "Edit Pipeline"}</button></>}
    </div>
  </header>;
}
