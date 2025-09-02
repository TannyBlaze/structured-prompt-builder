/* global React, ReactDOM */

// ===== Helpers & tiny utilities =====
const STORAGE_KEY = 'spb.prompts.v1';
const GEMINI_KEY  = 'gemini_api_key';
function getSourceByFmt(fmt, { markdownString, jsonString, yamlString }) {
    return fmt === 'json' ? jsonString : fmt === 'yaml' ? yamlString : markdownString;
}
function stripCodeFences(s='') {
    // removes ```...``` fences if model adds them
    return s.replace(/^```[a-zA-Z]*\n?/, '').replace(/\n?```$/, '');
}


function readLibrary() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch { return []; }
}
function writeLibrary(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}
function uid() {
    try { return crypto.randomUUID(); }
    catch { return 'id_' + Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
}
function fmtDate(ts) { return new Date(ts).toLocaleString(); }

// Minimal JSON → YAML (enough for plain objects/arrays/primitives used here)
function jsonToYaml(value, indent = 0) {
    const pad = '  '.repeat(indent);
    if (value === null) return 'null';
    if (typeof value === 'string') return JSON.stringify(value);
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (Array.isArray(value)) {
        if (value.length === 0) return '[]';
        return value.map(v => pad + '- ' + jsonToYaml(v, indent + 1).replace(/^\s+/, '')).join('\n');
    }
    if (typeof value === 'object') {
        const keys = Object.keys(value);
        if (!keys.length) return '{}';
        return keys.map(k => {
            const v = value[k];
            const rendered = jsonToYaml(v, indent + 1);
            const needsBlock = typeof v === 'object' && v !== null && rendered.indexOf('\n') !== -1;
            return pad + k + ': ' + (needsBlock ? '\n' + rendered : rendered);
        }).join('\n');
    }
    return JSON.stringify(value);
}

// Small reusable Section editor
function Section({ title, description, items, onChange, onAdd, onRemove, onMove, placeholder }) {
    return (
        <div>
            <div className="flex items-center justify-between mb-1">
                <label className="label">{title}</label>
                <button className="btn btn-muted btn-xs" onClick={onAdd}>+ Add</button>
            </div>
            {description && <div className="text-xs text-gray-500 dark:text-neutral-400 mb-2">{description}</div>}
            <div className="space-y-2">
                {items.map((v, i) => (
                    <div key={i} className="flex gap-2">
                        <input
                            type="text"
                            className="field flex-1"
                            value={v}
                            onChange={e => onChange(i, e.target.value)}
                            placeholder={placeholder}
                        />
                        <div className="flex gap-1">
                            <button title="Up" className="btn btn-muted" onClick={()=>onMove(i,-1)}>↑</button>
                            <button title="Down" className="btn btn-muted" onClick={()=>onMove(i,+1)}>↓</button>
                            <button title="Delete" className="btn btn-muted" onClick={()=>onRemove(i)}>✕</button>
                        </div>
                    </div>
                ))}
                {items.length === 0 && (
                    <button className="btn btn-muted" onClick={onAdd}>Add your first item</button>
                )}
            </div>
        </div>
    );
}

(function () {
    const { useState, useMemo } = React;

    function StructuredPromptBuilder() {
        // ===== Prompt meta + library =====
        const [title, setTitle] = useState('');
        const [editingId, setEditingId] = useState(null);
        const [libraryOpen, setLibraryOpen] = useState(false);
        const [library, setLibrary] = useState(readLibrary());

        // ===== Prompt fields =====
        const [role, setRole] = useState('');
        const [task, setTask] = useState('');
        const [audience, setAudience] = useState('');
        const [style, setStyle] = useState('');
        const [tone, setTone] = useState('');
        const [constraints, setConstraints] = useState([]);
        const [steps, setSteps] = useState([]);
        const [inputs, setInputs] = useState([]);
        const [examples, setExamples] = useState([]);

        // ===== Parameters =====
        const [temperature, setTemperature] = useState(0.7);
        const [topP, setTopP] = useState(1.0);
        const [maxTokens, setMaxTokens] = useState(1024);
        const [presencePenalty, setPresencePenalty] = useState(0.0);
        const [frequencyPenalty, setFrequencyPenalty] = useState(0.0);

        // ===== Preview & export =====
        const [previewTab, setPreviewTab] = useState('markdown'); // 'markdown' | 'json' | 'yaml'

        // ===== Gemini =====
        const [apiKey, setApiKey] = useState(localStorage.getItem(GEMINI_KEY) || '');
        const [model, setModel] = useState('gemini-1.5-flash');
        const [outFmt, setOutFmt] = useState('markdown');
        const [generating, setGenerating] = useState(false);
        const [genError, setGenError] = useState('');

        // ----- list helpers -----
        const updateItem = (list, setList) => (i, v) => {
            setList(list.map((x, j) => (j === i ? v : x)));
        };
        const moveItem   = (list, setList) => (i, dir) => {
            const j = i + dir; if (j < 0 || j >= list.length) return;
            const a = [...list]; [a[i], a[j]] = [a[j], a[i]]; setList(a);
        };
        const removeItem = (list, setList) => (i) => setList(list.filter((_, x) => x !== i));
        const addItem    = (list, setList, v) => setList([...(list||[]), v]);

        const updateConstraint = updateItem(constraints, setConstraints);
        const moveConstraint   = moveItem(constraints, setConstraints);
        const removeConstraint = removeItem(constraints, setConstraints);

        const updateStep = updateItem(steps, setSteps);
        const moveStep   = moveItem(steps, setSteps);
        const removeStep = removeItem(steps, setSteps);

        const updateInput = updateItem(inputs, setInputs);
        const moveInput   = moveItem(inputs, setInputs);
        const removeInput = removeItem(inputs, setInputs);

        const updateExample = updateItem(examples, setExamples);
        const moveExample   = moveItem(examples, setExamples);
        const removeExample = removeItem(examples, setExamples);

        // ----- Prompt object -----
        const promptObject = useMemo(() => ({
            role: role.trim() || undefined,
            task: task.trim() || undefined,
            audience: audience.trim() || undefined,
            style: style.trim() || undefined,
            tone: tone.trim() || undefined,
            constraints: constraints.filter(Boolean),
            steps: steps.filter(Boolean),
            inputs: inputs.filter(Boolean).map((s) => {
                const p = s.split(':');
                if (p.length >= 2) {
                    const n = p.shift().trim();
                    return { name: n, value: p.join(':').trim() };
                }
                return { name: s.trim(), value: '' };
            }),
            examples: examples.filter(Boolean),
            parameters: {
                temperature,
                top_p: topP,
                max_tokens: maxTokens,
                presence_penalty: presencePenalty,
                frequency_penalty: frequencyPenalty,
            },
        }), [role, task, audience, style, tone, constraints, steps, inputs, examples, temperature, topP, maxTokens, presencePenalty, frequencyPenalty]);

        const markdownString = useMemo(() => {
            const o = promptObject;
            let md = '';
            if (o.role) md += `**Role:** ${o.role}\n\n`;
            if (o.task) md += `**Task:** ${o.task}\n\n`;
            if (o.audience) md += `**Audience:** ${o.audience}\n\n`;
            if (o.style) md += `**Style:** ${o.style}\n\n`;
            if (o.tone) md += `**Tone:** ${o.tone}\n\n`;
            if (o.constraints?.length) { md += '**Constraints:**\n'; o.constraints.forEach(c => md += `- ${c}\n`); md += '\n'; }
            if (o.steps?.length) { md += '**Steps:**\n'; o.steps.forEach((s, i) => md += `${i + 1}. ${s}\n`); md += '\n'; }
            if (o.inputs?.length) { md += '**Inputs:**\n'; o.inputs.forEach(inp => md += `- **${inp.name}**: ${inp.value}\n`); md += '\n'; }
            if (o.examples?.length) { md += '**Few-shot examples:**\n'; o.examples.forEach(ex => md += `- ${ex}\n`); md += '\n'; }
            md += `**Parameters:**\n- Temperature: ${o.parameters.temperature}\n- Top-p: ${o.parameters.top_p}\n- Max tokens: ${o.parameters.max_tokens}\n- Presence penalty: ${o.parameters.presence_penalty}\n- Frequency penalty: ${o.parameters.frequency_penalty}`;
            return md.trim();
        }, [promptObject]);

        const jsonString = useMemo(() => JSON.stringify(promptObject, null, 2), [promptObject]);
        const yamlString = useMemo(() => jsonToYaml(promptObject), [promptObject]);

        function downloadFile(name, content) {
            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = name;
            document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
        }

        function handleImport(e) {
            const f = e.target.files[0]; if (!f) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const d = JSON.parse(ev.target.result);
                    setEditingId(null); // new import = new entry unless saved
                    setTitle(d.title || '');
                    setRole(d.role || '');
                    setTask(d.task || '');
                    setAudience(d.audience || '');
                    setStyle(d.style || '');
                    setTone(d.tone || '');
                    setConstraints(d.constraints || []);
                    setSteps(d.steps || []);
                    setInputs((d.inputs || []).map(inp => inp?.name ? `${inp.name}${inp.value ? ': ' + inp.value : ''}` : ''));
                    setExamples(d.examples || []);
                    if (d.parameters) {
                        setTemperature(d.parameters.temperature ?? 0.7);
                        setTopP(d.parameters.top_p ?? 1.0);
                        setMaxTokens(d.parameters.max_tokens ?? 1024);
                        setPresencePenalty(d.parameters.presence_penalty ?? 0.0);
                        setFrequencyPenalty(d.parameters.frequency_penalty ?? 0.0);
                    }
                } catch { alert('Invalid JSON file'); }
            };
            reader.readAsText(f);
            e.target.value = '';
        }

        // ===== Local Library ops =====
        function buildStoredDoc() {
            return {
                id: editingId || uid(),
                title: (title || (task ? task.slice(0, 60) : 'Untitled Prompt')).trim(),
                createdAt: Date.now(),
                updatedAt: Date.now(),
                doc: promptObject,
            };
        }
        function saveCurrentToLibrary() {
            const entry = buildStoredDoc();
            const next = [...library];
            const i = next.findIndex(x => x.id === entry.id);
            if (i >= 0) { entry.createdAt = next[i].createdAt; next[i] = entry; }
            else { next.unshift(entry); }
            setLibrary(next); writeLibrary(next); setEditingId(entry.id);
            alert('Saved to Library');
        }
        function loadFromLibrary(entry) {
            const d = entry.doc || {};
            setEditingId(entry.id);
            setTitle(entry.title || '');
            setRole(d.role || '');
            setTask(d.task || '');
            setAudience(d.audience || '');
            setStyle(d.style || '');
            setTone(d.tone || '');
            setConstraints(d.constraints || []);
            setSteps(d.steps || []);
            setInputs((d.inputs || []).map(inp => (inp?.name ? `${inp.name}${inp.value ? ': ' + inp.value : ''}` : '')));
            setExamples(d.examples || []);
            if (d.parameters) {
                setTemperature(d.parameters.temperature ?? 0.7);
                setTopP(d.parameters.top_p ?? 1.0);
                setMaxTokens(d.parameters.max_tokens ?? 1024);
                setPresencePenalty(d.parameters.presence_penalty ?? 0.0);
                setFrequencyPenalty(d.parameters.frequency_penalty ?? 0.0);
            }
            setLibraryOpen(false);
        }
        function deleteFromLibrary(id) {
            const next = library.filter(x => x.id !== id);
            setLibrary(next); writeLibrary(next);
            if (editingId === id) setEditingId(null);
        }
        function duplicateEntry(entry) {
            const copy = { ...entry, id: uid(), title: (entry.title || 'Untitled') + ' (Copy)', createdAt: Date.now(), updatedAt: Date.now() };
            const next = [copy, ...library]; setLibrary(next); writeLibrary(next);
        }

        // ===== Gemini call =====
        async function generateWithGemini() {
            setGenError('');
            if (!apiKey) { setGenError('Please enter your Gemini API key.'); return; }
            setGenerating(true);
            try {
                // 1) Build strict instruction: optimize only; preserve schema; output-only
                const instruction =
                    `You are a PROMPT OPTIMIZER.

GOAL:
- Improve grammar, spelling, clarity, and concision.
- Keep the original meaning.
- Do NOT add new facts or change intent.

STRUCTURE RULES (MUST FOLLOW):
- Preserve the exact schema/keys of the input (${outFmt.toUpperCase()}).
- Keep array lengths and order the same (unless an item is completely empty).
- Keep field names identical (role, task, audience, style, tone, constraints, steps, inputs{name,value}, examples, parameters{temperature,top_p,max_tokens,presence_penalty,frequency_penalty}).
- If a field is empty, keep it empty.
- Trim extraneous whitespace.

OUTPUT:
- Return ONLY the corrected ${outFmt.toUpperCase()}.
- No explanations, no commentary, no code fences.`;

                // 2) Provide original in chosen format to minimize conversions
                const original = getSourceByFmt(outFmt, { markdownString, jsonString, yamlString });

                // 3) Call Gemini
                const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
                const body = {
                    contents: [{
                        role: 'user',
                        parts: [{ text: `${instruction}\n\n--- ORIGINAL ${outFmt.toUpperCase()} ---\n${original}` }]
                    }],
                    generationConfig: {
                        temperature,        // small tweaks allowed
                        topP,
                        maxOutputTokens: Math.max(512, maxTokens) // ensure room to return full structure
                    }
                };

                const res = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
                if (!res.ok) throw new Error(await res.text());

                const data = await res.json();
                const raw = (data?.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('');
                const cleaned = stripCodeFences(raw).trim();

                // 4) Store in preview cache by the selected output format
                if (!window.__geminiPreview) window.__geminiPreview = {};
                window.__geminiPreview[outFmt] = cleaned;

                // If model returned in a different format by mistake, we still show what we got.
                setPreviewTab(outFmt);
            } catch (e) {
                setGenError(e.message || 'Generation failed.');
            } finally {
                setGenerating(false);
            }
        }


        // ===== UI =====
        return (
            <div className="w-full max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left column: Builder */}
                <div className="card p-4 lg:p-5">
                    <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Prompt Composition</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="label">Title</label>
                            <input className="field" value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Support Triage Prompt" />
                        </div>
                        <div>
                            <label className="label">Role</label>
                            <input className="field" value={role} onChange={e=>setRole(e.target.value)} placeholder="e.g. Helpful AI assistant" />
                        </div>
                        <div>
                            <label className="label">Task</label>
                            <input className="field" value={task} onChange={e=>setTask(e.target.value)} placeholder="Describe what you want the model to do" />
                        </div>
                        <div>
                            <label className="label">Audience</label>
                            <input className="field" value={audience} onChange={e=>setAudience(e.target.value)} placeholder="Who is the prompt for?" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="label">Style</label>
                                <input className="field" value={style} onChange={e=>setStyle(e.target.value)} placeholder="e.g. Formal, casual" />
                            </div>
                            <div>
                                <label className="label">Tone</label>
                                <input className="field" value={tone} onChange={e=>setTone(e.target.value)} placeholder="e.g. Friendly, neutral" />
                            </div>
                        </div>

                        <Section title="Constraints" items={constraints}
                                 onChange={updateConstraint}
                                 onAdd={()=>addItem(constraints, setConstraints, '')}
                                 onRemove={removeConstraint}
                                 onMove={moveConstraint}
                                 placeholder="Add a constraint (e.g. Don’t mention brand names)" />

                        <Section title="Steps" items={steps}
                                 onChange={updateStep}
                                 onAdd={()=>addItem(steps, setSteps, '')}
                                 onRemove={removeStep}
                                 onMove={moveStep}
                                 placeholder="Add a step (e.g. Research the topic)" />

                        <Section title="Inputs" description="Use the format name: value" items={inputs}
                                 onChange={updateInput}
                                 onAdd={()=>addItem(inputs, setInputs, '')}
                                 onRemove={removeInput}
                                 onMove={moveInput}
                                 placeholder="e.g. topic: Artificial Intelligence" />

                        <Section title="Few-shot examples" items={examples}
                                 onChange={updateExample}
                                 onAdd={()=>addItem(examples, setExamples, '')}
                                 onRemove={removeExample}
                                 onMove={moveExample}
                                 placeholder="Add an example" />

                        <div>
                            <label className="label">Import from JSON</label>
                            <input type="file" accept="application/json" onChange={handleImport} className="cursor-pointer text-sm" />
                        </div>

                        <div className="mt-3 flex gap-2">
                            <button className="btn btn-primary" onClick={saveCurrentToLibrary}>Save</button>
                            <button className="btn btn-muted" onClick={()=>setLibraryOpen(true)}>Library</button>
                        </div>
                    </div>
                </div>

                {/* Right column: Params + Preview + Gemini */}
                <div className="card p-4 lg:p-5">
                    <div className="mb-3 flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Model Parameters & Preview</h2>
                        {editingId && <div className="text-xs text-gray-500 dark:text-neutral-400">Editing: {editingId}</div>}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div><label className="label">Temperature</label><input type="number" step="0.01" min="0" max="1" className="field" value={temperature} onChange={e=>setTemperature(parseFloat(e.target.value||'0'))} /></div>
                        <div><label className="label">Top‑p</label><input type="number" step="0.01" min="0" max="1" className="field" value={topP} onChange={e=>setTopP(parseFloat(e.target.value||'0'))} /></div>
                        <div><label className="label">Max tokens</label><input type="number" min="1" className="field" value={maxTokens} onChange={e=>setMaxTokens(parseInt(e.target.value,10)||0)} /></div>
                        <div><label className="label">Presence penalty</label><input type="number" step="0.01" min="-2" max="2" className="field" value={presencePenalty} onChange={e=>setPresencePenalty(parseFloat(e.target.value||'0'))} /></div>
                        <div><label className="label">Frequency penalty</label><input type="number" step="0.01" min="-2" max="2" className="field" value={frequencyPenalty} onChange={e=>setFrequencyPenalty(parseFloat(e.target.value||'0'))} /></div>
                    </div>

                    {/* Gemini controls */}
                    <div className="rounded-lg border border-gray-200 dark:border-neutral-800 p-3 mb-3">
                        <div className="grid md:grid-cols-3 gap-3">
                            <div>
                                <label className="label">Gemini API key</label>
                                <input type="password" className="field" value={apiKey}
                                       onChange={e=>{ setApiKey(e.target.value); localStorage.setItem(GEMINI_KEY, e.target.value); }}
                                       placeholder="AIza…" />
                            </div>
                            <div>
                                <label className="label">Model</label>
                                <select className="field" value={model} onChange={e=>setModel(e.target.value)}>
                                    <option value="gemini-1.5-flash">gemini-1.5-flash</option>
                                    <option value="gemini-1.5-pro">gemini-1.5-pro</option>
                                    <option value="gemini-1.5-flash-8b">gemini-1.5-flash-8b</option>
                                </select>
                            </div>
                            <div>
                                <label className="label">Show output as</label>
                                <select className="field" value={outFmt} onChange={e=>setOutFmt(e.target.value)}>
                                    <option value="markdown">Markdown</option>
                                    <option value="json">JSON</option>
                                    <option value="yaml">YAML</option>
                                </select>
                            </div>
                        </div>
                        <div className="mt-2 flex gap-2 items-center">
                            <button className="btn btn-primary" onClick={generateWithGemini} disabled={generating}>{generating? 'Generating…':'Generate with Gemini'}</button>
                            {genError && <div className="text-sm text-red-500">{genError}</div>}
                        </div>
                    </div>

                    <div className="tabs mb-2 border-b border-gray-200 dark:border-neutral-800">
                        {['markdown','json','yaml'].map(tab => (
                            <button key={tab} className={previewTab===tab ? 'active' : 'inactive'} onClick={()=>setPreviewTab(tab)}>
                                {tab.toUpperCase()}
                            </button>
                        ))}
                    </div>

                    <div className="preview h-64">
                        {previewTab==='markdown' && (
                            <pre className="whitespace-pre-wrap">{(window.__geminiPreview?.markdown && outFmt==='markdown') ? window.__geminiPreview.markdown : markdownString}</pre>
                        )}
                        {previewTab==='json' && (
                            <pre>{(window.__geminiPreview?.json && outFmt==='json') ? window.__geminiPreview.json : jsonString}</pre>
                        )}
                        {previewTab==='yaml' && (
                            <pre>{(window.__geminiPreview?.yaml && outFmt==='yaml') ? window.__geminiPreview.yaml : yamlString}</pre>
                        )}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                        <button className="btn btn-muted" onClick={()=>navigator.clipboard.writeText(previewTab==='markdown'?markdownString:previewTab==='json'?jsonString:yamlString).then(()=>alert('Copied!')).catch(()=>alert('Copy failed'))}>Copy {previewTab.toUpperCase()}</button>
                        <button className="btn btn-primary" onClick={()=>downloadFile('prompt.md', markdownString)}>Download MD</button>
                        <button className="btn btn-primary" onClick={()=>downloadFile('prompt.json', jsonString)}>Download JSON</button>
                        <button className="btn btn-primary" onClick={()=>downloadFile('prompt.yaml', yamlString)}>Download YAML</button>
                    </div>
                </div>

                {/* Library modal */}
                {libraryOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center">
                        <div className="absolute inset-0 bg-black/50" onClick={()=>setLibraryOpen(false)} />
                        <div className="relative card w-full max-w-2xl p-4 lg:p-5">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Saved Prompts</h3>
                                <button className="btn btn-muted" onClick={()=>setLibraryOpen(false)}>Close</button>
                            </div>

                            {library.length === 0 && (
                                <p className="text-sm text-gray-500 dark:text-neutral-400">No saved prompts yet. Click “Save”.</p>
                            )}

                            <div className="mt-2 divide-y divide-gray-200 dark:divide-neutral-800 max-h-[60vh] overflow-auto">
                                {library.map((item) => (
                                    <div key={item.id} className="py-3 flex items-start justify-between gap-3">
                                        <div>
                                            <div className="font-medium text-gray-900 dark:text-white">{item.title}</div>
                                            <div className="text-xs text-gray-500 dark:text-neutral-400">
                                                Created: {fmtDate(item.createdAt)} · Updated: {fmtDate(item.updatedAt)}
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button className="btn btn-primary" onClick={()=>loadFromLibrary(item)}>Load</button>
                                            <button className="btn btn-muted" onClick={()=>duplicateEntry(item)}>Duplicate</button>
                                            <button className="btn btn-muted" onClick={()=>{ if (confirm('Delete this saved prompt?')) deleteFromLibrary(item.id); }}>Delete</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    ReactDOM.createRoot(document.getElementById('root')).render(<StructuredPromptBuilder />);
})();
