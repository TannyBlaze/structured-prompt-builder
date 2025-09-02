/* global React */
(function () {
    const { useRef } = React;

    function uid() {
        try { return crypto.randomUUID(); }
        catch { return 'id_' + Math.random().toString(36).slice(2); }
    }

    function Section({
                         title,
                         description,
                         items = [],
                         onChange = () => {},
                         onAdd = () => {},
                         onRemove = () => {},
                         onMove = () => {},
                         placeholder = ''
                     }) {
        // Keep stable keys so inputs don't lose focus
        const idsRef = useRef([]);
        if (idsRef.current.length !== items.length) {
            const next = [];
            for (let i = 0; i < items.length; i++) {
                next[i] = idsRef.current[i] || uid();
            }
            idsRef.current = next;
        }

        return (
            <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                    <h3 className="text-base font-medium text-gray-900 dark:text-white">
                        {title}
                    </h3>
                    <button type="button" className="btn btn-muted" onClick={onAdd}>
                        Add {title.replace(/s$/, '')}
                    </button>
                </div>
                {description && (
                    <p className="text-xs text-gray-500 dark:text-neutral-400 mb-2">
                        {description}
                    </p>
                )}

                <div className="space-y-2">
                    {items.map((item, index) => (
                        <div key={idsRef.current[index]} className="flex items-center gap-2">
                            <input
                                className="field flex-1"
                                value={item}
                                onChange={(e) => onChange(index, e.target.value)}
                                placeholder={placeholder}
                            />
                            <div className="flex gap-1">
                                <button
                                    type="button"
                                    className="btn btn-muted"
                                    onClick={() => onMove(index, -1)}
                                    disabled={index === 0}
                                    title="Move up"
                                >
                                    ↑
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-muted"
                                    onClick={() => onMove(index, 1)}
                                    disabled={index === items.length - 1}
                                    title="Move down"
                                >
                                    ↓
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-muted"
                                    onClick={() => onRemove(index)}
                                    title="Remove"
                                >
                                    ×
                                </button>
                            </div>
                        </div>
                    ))}

                    {items.length === 0 && (
                        <div className="text-xs text-gray-500 dark:text-neutral-400">
                            No items yet.
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Expose globally for the in-browser Babel build
    window.Section = Section;
})();
