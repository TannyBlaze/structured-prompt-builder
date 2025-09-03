/* global React, ReactDOM, jsonToYaml, Section */

// ===== Helpers & tiny utilities =====
const STORAGE_KEY = 'spb.prompts.v1';
const GEMINI_KEY  = 'gemini_api_key';
const OPENAI_KEY  = 'openai_api_key';

function getSourceByFmt(fmt, { markdownString, jsonString, yamlString, smileString }) {
    if (fmt === 'json') return jsonString;
    if (fmt === 'yaml') return yamlString;
    if (fmt === 'smile') return smileString;
    return markdownString;
}
function readLibrary() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch { return []; }
}
function writeLibrary(list) { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); }
function uid() {
    try { return crypto.randomUUID(); }
    catch { return 'id_' + Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
}
function fmtDate(ts) { return new Date(ts).toLocaleString(); }

(function () {
    const { useState, useMemo } = React;

    function StructuredPromptBuilder() {
        // ===== Prompt fields =====
        const [title, setTitle] = useState('');
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

        // ===== API Keys & Models =====
        const [apiKey, setApiKey] = useState(localStorage.getItem(GEMINI_KEY) || '');
        const [model, setModel] = useState('gemini-1.5-flash');
        const [openaiKey, setOpenaiKey] = useState(localStorage.getItem(OPENAI_KEY) || '');
        const [openaiModel, setOpenaiModel] = useState('gpt-4o-mini');
        const [openaiBaseUrl, setOpenaiBaseUrl] = useState(localStorage.getItem('openai_base_url') || 'https://api.openai.com/v1');
        const [useChatMode, setUseChatMode] = useState(true);


        // ===== Preview / format =====
        const [previewTab, setPreviewTab] = useState('markdown');
        const [outFmt, setOutFmt] = useState('markdown');
        const [generating, setGenerating] = useState(false);
        const [genError, setGenError] = useState('');

        // ===== Library =====
        const [libraryOpen, setLibraryOpen] = useState(false);
        const [library, setLibrary] = useState(readLibrary());
        const [editingId, setEditingId] = useState(null); // currently loaded library item id (for Save vs Save As)

        // === list helpers (immutable) ===
        const mkHandlers = (setter) => ({
            onChange: (i, val) => setter(prev => prev.map((v, idx) => idx === i ? val : v)),
            onAdd: () => setter(prev => [...prev, '']),
            onRemove: (i) => setter(prev => prev.filter((_, idx) => idx !== i)),
            onMove: (i, dir) => setter(prev => {
                const a = [...prev];
                const j = i + dir;
                if (j < 0 || j >= a.length) return a;
                [a[i], a[j]] = [a[j], a[i]];
                return a;
            }),
        });

        const constraintH = mkHandlers(setConstraints);
        const stepsH = mkHandlers(setSteps);
        const inputsH = mkHandlers(setInputs);
        const examplesH = mkHandlers(setExamples);

        // ===== Prompt object =====
        const promptObject = useMemo(() => ({
            title,
            role, task, audience, style, tone,
            constraints: constraints.filter(Boolean),
            steps: steps.filter(Boolean),
            inputs: inputs.filter(Boolean).map(s => {
                const p = s.split(':');
                if (p.length >= 2) {
                    const n = p.shift().trim();
                    return { name: n, value: p.join(':').trim() };
                }
                return { name: s.trim(), value: '' };
            }),
            examples: examples.filter(Boolean),
            parameters: { temperature, top_p: topP, max_tokens: maxTokens }
        }), [title, role, task, audience, style, tone, constraints, steps, inputs, examples, temperature, topP, maxTokens]);

        // ===== Export formats =====
        const markdownString = useMemo(() => {
            const lines = [];
            lines.push(`# ${title || 'Untitled Prompt'}`);
            if (role) lines.push(`**Role:** ${role}`);
            if (task) lines.push(`**Task:** ${task}`);
            if (audience) lines.push(`**Audience:** ${audience}`);
            if (style) lines.push(`**Style:** ${style}`);
            if (tone) lines.push(`**Tone:** ${tone}`);
            if (constraints.length) lines.push(`**Constraints:**\n${constraints.map(c=>`- ${c}`).join('\n')}`);
            if (steps.length)       lines.push(`**Steps:**\n${steps.map((s,i)=>`${i+1}. ${s}`).join('\n')}`);
            if (inputs.length)      lines.push(`**Inputs:**\n${promptObject.inputs.map(i=>`- ${i.name}: ${i.value}`).join('\n')}`);
            if (examples.length)    lines.push(`**Examples:**\n${examples.map(e=>`- ${e}`).join('\n')}`);
            lines.push(`\n**Parameters:** temperature=${temperature}, top_p=${topP}, max_tokens=${maxTokens}`);
            return lines.join('\n\n');
        }, [title, role, task, audience, style, tone, constraints, steps, inputs, examples, temperature, topP, maxTokens]);

        const jsonString  = useMemo(() => JSON.stringify(promptObject, null, 2), [promptObject]);
        const yamlString  = useMemo(() => jsonToYaml(promptObject), [promptObject]);

        // New: SMILE (Simple Markup for Instruction Language) – compact, plaintext
        const smileString = useMemo(() => {
            const block = [
                `SMILE v1`,
                `TITLE: ${title || 'Untitled'}`,
                `ROLE: ${role || ''}`,
                `TASK: ${task || ''}`,
                `AUDIENCE: ${audience || ''}`,
                `STYLE: ${style || ''}`,
                `TONE: ${tone || ''}`,
                `CONSTRAINTS:`,
                ...(constraints.filter(Boolean).map(c => ` - ${c}`)),
                `STEPS:`,
                ...(steps.filter(Boolean).map((s,i)=>` ${i+1}. ${s}`)),
                `INPUTS:`,
                ...(promptObject.inputs.map(i=>` - ${i.name} = ${i.value}`)),
                `EXAMPLES:`,
                ...(examples.filter(Boolean).map(e=>` - ${e}`)),
                `PARAMS: temperature=${temperature}; top_p=${topP}; max_tokens=${maxTokens}`
            ];
            return block.join('\n');
        }, [title, role, task, audience, style, tone, constraints, steps, inputs, examples, temperature, topP, maxTokens]);

        // ===== Load Sample =====
        function loadSamplePrompt() {
            setTitle('Customer Support Triage');
            setRole('Helpful AI support agent');
            setTask('Categorize incoming customer requests into billing, technical support, or general');
            setAudience('Customer support staff');
            setStyle('Concise');
            setTone('Friendly but professional');
            setConstraints(['Do not make up information', 'Always provide a suggested reply']);
            setSteps(['Read the user message', 'Detect intent', 'Classify category', 'Generate short response']);
            setInputs(['user_message: The full text of the customer query']);
            setExamples([
                'Input: "I can’t log in to my account" → Output: Technical Support',
                'Input: "How do I update my payment method?" → Output: Billing'
            ]);
            setEditingId(null);
        }

        // ===== Library helpers =====
        const buildSnapshot = () => ({
            title, role, task, audience, style, tone,
            constraints, steps, inputs, examples,
            temperature, topP, maxTokens
        });

        const applySnapshot = (s={}) => {
            setTitle(s.title || '');
            setRole(s.role || '');
            setTask(s.task || '');
            setAudience(s.audience || '');
            setStyle(s.style || '');
            setTone(s.tone || '');
            setConstraints(Array.isArray(s.constraints) ? s.constraints : []);
            setSteps(Array.isArray(s.steps) ? s.steps : []);
            setInputs(Array.isArray(s.inputs) ? s.inputs : []);
            setExamples(Array.isArray(s.examples) ? s.examples : []);
            setTemperature(typeof s.temperature==='number'? s.temperature : 0.7);
            setTopP(typeof s.topP==='number'? s.topP : 1.0);
            setMaxTokens(typeof s.maxTokens==='number'? s.maxTokens : 1024);
        };

        function saveToLibrary(asNew=false) {
            const snap = buildSnapshot();
            const t = (title && title.trim()) || 'Untitled Prompt';
            const now = Date.now();

            let list = [...library];
            if (!asNew && editingId) {
                list = list.map(it => it.id === editingId ? ({ ...it, title: t, data: snap, ts: now }) : it);
            } else {
                const item = { id: uid(), title: t, data: snap, ts: now };
                list.unshift(item);
                setEditingId(item.id);
            }
            setLibrary(list);
            writeLibrary(list);
            setLibraryOpen(true);
        }

        function duplicateItem(id) {
            const orig = library.find(x => x.id === id);
            if (!orig) return;
            const copy = { id: uid(), title: orig.title + ' (copy)', data: orig.data, ts: Date.now() };
            const list = [copy, ...library];
            setLibrary(list);
            writeLibrary(list);
        }

        function deleteItem(id) {
            const list = library.filter(x => x.id !== id);
            setLibrary(list);
            writeLibrary(list);
            if (editingId === id) setEditingId(null);
        }

        function loadItem(id) {
            const it = library.find(x => x.id === id);
            if (!it) return;
            applySnapshot(it.data);
            setEditingId(it.id);
            setLibraryOpen(false);
        }

        function renameItem(id, newTitle) {
            const list = library.map(x => x.id === id ? { ...x, title: newTitle || x.title, ts: Date.now() } : x);
            setLibrary(list);
            writeLibrary(list);
            if (editingId === id && newTitle) setTitle(newTitle);
        }

        // ===== Generation =====
        async function generateWithOpenAI() {
            setGenError('');
            if (!openaiKey) { setGenError('Please enter your API key.'); return; }
            setGenerating(true);

            try {
                const original = getSourceByFmt(outFmt, { markdownString, jsonString, yamlString, smileString });

                const endpoint = useChatMode
                    ? `${openaiBaseUrl}/chat/completions`
                    : `${openaiBaseUrl}/completions`;

                const body = useChatMode
                    ? {
                        model: openaiModel,
                        messages: [
                            { role: "system", content: "You are a helpful assistant." },
                            { role: "user", content: `Optimize this prompt:\n\n${original}` }
                        ],
                        temperature,
                        max_tokens: Math.max(512, maxTokens)
                    }
                    : {
                        model: openaiModel,
                        prompt: `Optimize this prompt:\n\n${original}`,
                        temperature,
                        max_tokens: Math.max(512, maxTokens)
                    };


                console.log('generateWithOpenAI', { endpoint, body });

                const res = await fetch(endpoint, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        ...(openaiKey ? { "Authorization": `Bearer ${openaiKey}` } : {})
                    },
                    body: JSON.stringify(body)
                });

                if (!res.ok) throw new Error(await res.text());
                const data = await res.json();

                const cleaned = useChatMode
                    ? (data.choices?.[0]?.message?.content || '')
                    : (data.choices?.[0]?.text || '');

                window.__openaiPreview = { [outFmt]: cleaned.trim() };
                setPreviewTab(outFmt);
            } catch (e) {
                setGenError(e.message || 'OpenAI-compatible generation failed.');
            } finally {
                setGenerating(false);
            }
        }


        async function generateWithGemini() {
            setGenError('');
            if (!apiKey) { setGenError('Please enter your Gemini API key.'); return; }
            setGenerating(true);
            try {
                const original = getSourceByFmt(outFmt, { markdownString, jsonString, yamlString, smileString });
                const body = {
                    contents: [{ role: 'user', parts: [{ text: `Optimize this prompt:\n\n${original}` }] }],
                    generationConfig: { temperature, topP, maxOutputTokens: Math.max(512, maxTokens) }
                };
                const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`;
                const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
                if (!res.ok) throw new Error(await res.text());
                const data = await res.json();
                const cleaned = (data?.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('');
                window.__geminiPreview = { [outFmt]: cleaned };
                setPreviewTab(outFmt);
            } catch (e) {
                setGenError(e.message || 'Gemini generation failed.');
            } finally {
                setGenerating(false);
            }
        }

        // ===== UI =====
        const previewText =
            (window.__openaiPreview?.[previewTab]) ||
            (window.__geminiPreview?.[previewTab]) ||
            (previewTab === 'json'
                ? jsonString
                : previewTab === 'yaml'
                    ? yamlString
                    : previewTab === 'smile'
                        ? smileString
                        : markdownString);


        return (
            <div className="w-full max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Left column */}
                <div className="card p-4 lg:p-5">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="label text-lg font-semibold">Prompt Composition</h2>
                        <div className="flex gap-2">
                            <button className="btn btn-muted" onClick={()=>setLibraryOpen(v=>!v)}>
                                {libraryOpen ? 'Close Library' : 'Library'}
                            </button>
                            <button className="btn btn-muted" onClick={loadSamplePrompt}>Load Sample</button>
                            <button className="btn btn-primary" onClick={()=>saveToLibrary(false)}>
                                Save {editingId ? '' : '(new)'}
                            </button>
                            <button className="btn btn-muted" onClick={()=>saveToLibrary(true)}>Save as new</button>
                        </div>
                    </div>

                    {/* Library drawer */}
                    {libraryOpen && (
                        <div className="rounded-lg border p-3 mb-4">
                            {library.length === 0 && <div className="text-sm text-gray-500">No saved prompts yet.</div>}
                            {library.map(item => (
                                <div key={item.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                                    <div>
                                        <div className="font-medium">{item.title}</div>
                                        <div className="text-xs text-gray-500">Saved {fmtDate(item.ts)}</div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button className="btn btn-primary btn-xs" onClick={()=>loadItem(item.id)}>Load</button>
                                        <button className="btn btn-muted btn-xs" onClick={()=>{
                                            const t = prompt('Rename to:', item.title);
                                            if (t !== null) renameItem(item.id, t.trim());
                                        }}>Rename</button>
                                        <button className="btn btn-muted btn-xs" onClick={()=>duplicateItem(item.id)}>Duplicate</button>
                                        <button className="btn btn-muted btn-xs" onClick={()=>deleteItem(item.id)}>Delete</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Fields */}
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div><label className="label">Title</label><input className="field" value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g., Customer Support Triage" /></div>
                            <div className="flex items-end text-xs text-gray-500">{editingId ? `Editing saved prompt` : ''}</div>
                        </div>
                        <div><label className="label">Role</label><input className="field" value={role} onChange={e=>setRole(e.target.value)} placeholder="e.g., Helpful AI support agent" /></div>
                        <div><label className="label">Task</label><input className="field" value={task} onChange={e=>setTask(e.target.value)} placeholder="What should the model do?" /></div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div><label className="label">Audience</label><input className="field" value={audience} onChange={e=>setAudience(e.target.value)} placeholder="Who will read the output?" /></div>
                            <div><label className="label">Style</label><input className="field" value={style} onChange={e=>setStyle(e.target.value)} placeholder="e.g., Concise, step-by-step" /></div>
                            <div><label className="label">Tone</label><input className="field" value={tone} onChange={e=>setTone(e.target.value)} placeholder="e.g., Friendly, formal" /></div>
                        </div>

                        <Section title="Constraints" description="Hard rules the model must follow."
                                 items={constraints} {...constraintH} placeholder="e.g., Do not make up information" />
                        <Section title="Steps" description="Ordered instructions the model should execute."
                                 items={steps} {...stepsH} placeholder="e.g., Read the message and detect intent" />
                        <Section title="Inputs" description='Name-value pairs. Use "name: default value".'
                                 items={inputs} {...inputsH} placeholder="e.g., user_message: The user’s message" />
                        <Section title="Examples" description="Few-shot examples or demonstrations."
                                 items={examples} {...examplesH} placeholder='e.g., Input: "...", Output: "Billing"' />
                    </div>
                </div>

                {/* Right column */}
                <div className="card p-4 lg:p-5">
                    {/* Output format selector */}
                    <div className="mb-3">
                        <div className="text-sm mb-1 font-medium">Output Format</div>
                        <div className="tabs">
                            {['markdown','json','yaml','smile'].map(tab => (
                                <button
                                    key={tab}
                                    className={outFmt===tab ? 'active' : ''}
                                    onClick={()=>{ setOutFmt(tab); setPreviewTab(tab); }}
                                >
                                    {tab.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* OpenAI / Compatible */}
                    <div className="rounded-lg border p-4 mb-3 space-y-4">
                        <h3 className="label text-sm font-medium mb-2">OpenAI / Compatible Provider</h3>

                        {/* API Key + Base URL */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="label">API Key</label>
                                <input
                                    type="password"
                                    className="field w-full"
                                    value={openaiKey}
                                    onChange={e=>{ setOpenaiKey(e.target.value); localStorage.setItem(OPENAI_KEY, e.target.value); }}
                                    placeholder="sk-... or provider key"
                                />
                            </div>
                            <div>
                                <label className="label">Base URL</label>
                                <input
                                    type="text"
                                    className="field w-full"
                                    value={openaiBaseUrl}
                                    onChange={e=>{ setOpenaiBaseUrl(e.target.value); localStorage.setItem('openai_base_url', e.target.value); }}
                                    placeholder="https://api.openai.com/v1"
                                />
                            </div>
                        </div>

                        {/* Mode + Model */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                            <div>
                                <label className="label">Model</label>
                                <input
                                    type="text"
                                    className="field w-full"
                                    value={openaiModel}
                                    onChange={e=>setOpenaiModel(e.target.value)}
                                    placeholder="gpt-4o-mini, mistral, llama-3..."
                                />
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                                <input
                                    type="checkbox"
                                    checked={useChatMode}
                                    onChange={e => setUseChatMode(e.target.checked)}
                                />
                                <label className="label m-0">Use Chat Mode</label>
                            </div>
                        </div>

                        {/* Action button */}
                        <div>
                            <button
                                className="btn btn-primary w-full md:w-auto"
                                onClick={generateWithOpenAI}
                                disabled={generating}
                            >
                                {generating ? 'Generating…' : 'Generate'}
                            </button>
                        </div>
                    </div>


                    {/* Gemini */}
                    <div className="rounded-lg border p-3 mb-3">
                        <h3 className="label text-sm font-medium mb-2">Gemini API Key</h3>
                        <input
                            type="password"
                            className="field"
                            value={apiKey}
                            onChange={e=>{ setApiKey(e.target.value); localStorage.setItem(GEMINI_KEY, e.target.value); }}
                            placeholder="AIza…"
                        />
                        <label className="label">Model</label>
                        <select className="field" value={model} onChange={e=>setModel(e.target.value)}>
                            <option>gemini-1.5-flash</option>
                            <option>gemini-1.5-flash-8b</option>
                            <option>gemini-1.5-pro</option>
                            <option>gemini-1.0-pro</option>
                        </select>
                        <button className="btn btn-primary mt-2" onClick={generateWithGemini} disabled={generating}>Generate with Gemini</button>
                    </div>

                    {/* Preview */}
                    <div className="tabs mb-2">
                        {['markdown','json','yaml','smile'].map(tab => (
                            <button
                                key={tab}
                                className={previewTab===tab ? 'active' : ''}
                                onClick={()=>{ setPreviewTab(tab); setOutFmt(tab); }}
                            >
                                {tab.toUpperCase()}
                            </button>
                        ))}
                    </div>

                    <div className="preview h-64"><pre>{previewText}</pre></div>

                    {/* subtle sponsor footer under preview */}
                    <p className="mt-2 text-xs text-gray-600 dark:text-neutral-400">
                        This preview and export are free. If this saves you time,
                        <a
                            className="underline font-medium ml-1"
                            href="https://github.com/sponsors/Siddhesh2377?utm_source=app&utm_medium=preview_footer&utm_campaign=spb"
                            target="_blank" rel="noopener"
                        >consider sponsoring</a>.
                    </p>

                    {genError && <div className="text-red-500 text-sm mt-2">{genError}</div>}


                    {/* Basic params */}
                    <div className="grid grid-cols-3 gap-3 mt-4">
                        <div><label className="label">Temperature</label><input className="field" type="number" step="0.1" min="0" max="2" value={temperature} onChange={e=>setTemperature(parseFloat(e.target.value)||0)} /></div>
                        <div><label className="label">top_p</label><input className="field" type="number" step="0.05" min="0" max="1" value={topP} onChange={e=>setTopP(parseFloat(e.target.value)||0)} /></div>
                        <div><label className="label">max_tokens</label><input className="field" type="number" min="1" value={maxTokens} onChange={e=>setMaxTokens(parseInt(e.target.value)||1)} /></div>
                    </div>
                </div>
            </div>
        );
    }

    ReactDOM.createRoot(document.getElementById('root')).render(<StructuredPromptBuilder />);
})();
