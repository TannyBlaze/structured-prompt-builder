/* global React, window */
(function () {
    const Section = ({ title, description, items, onChange, onAdd, onRemove, onMove, placeholder }) => (
        <div className="mb-4">
            <h3 className="text-lg font-medium mb-1 text-gray-900 dark:text-white">{title}</h3>
            {description && <p className="text-xs text-gray-500 dark:text-neutral-400 mb-2">{description}</p>}
            {items.map((item, index) => (
                <div key={index} className="flex items-center mb-2">
                    <input type="text" className="field mr-2" value={item} onChange={(e) => onChange(index, e.target.value)} placeholder={placeholder}/>
                    <div className="flex flex-col gap-1 mr-2">
                        <button className="btn btn-muted" onClick={() => onMove(index, -1)} disabled={index === 0} title="Move up">↑</button>
                        <button className="btn btn-muted" onClick={() => onMove(index, 1)} disabled={index === items.length - 1} title="Move down">↓</button>
                    </div>
                    <button className="btn btn-primary" style="background:#ef4444" onClick={() => onRemove(index)} title="Remove">×</button>
                </div>
            ))}
            <button className="btn btn-muted mt-2" onClick={onAdd}>Add {title.slice(0, -1)}</button>
        </div>
    );
    window.Section = Section;
})();
