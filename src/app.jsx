/* global React, ReactDOM */

(function () {
    const { useState, useMemo } = React;

    function StructuredPromptBuilder() {
        // ---------- Core form state ----------
        const [role, setRole] = useState('');
        const [task, setTask] = useState('');
        const [audience, setAudience] = useState('');
        const [style, setStyle] = useState('');
        const [tone, setTone] = useState('');
        const [constraints, setConstraints] = useState([]);
        const [steps, setSteps] = useState([]);
        const [inputs, setInputs] = useState([]);
        const [examples, setExamples] = useState([]);

        // model params
        const [temperature, setTemperature] = useState(0.7);
        const [topP, setTopP] = useState(1.0);
        const [maxTokens, setMaxTokens] = useState(1024);
        const [presencePenalty, setPresencePenalty] = useState(0.0);
        const [frequencyPenalty, setFrequencyPenalty] = useState(0.0);

        // preview
        const [previewTab, setPreviewTab] = useState('markdown');

        // ---------- Gemini integration (ALL INSIDE THE COMPONENT) ----------
        const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
        const [model, setModel] = useState('gemini-1.5-flash');
        const [outFmt, setOutFmt] = useState('markdown'); // markdown | json | yaml
        const [generating, setGenerating] = useState(false);
        const [genError, setGenError] = useState('');
        const [geminiPreview, setGeminiPreview] = useState({ md: '', json: '', yaml: '' });

        function saveApiKey(v) {
            setApiKey(v);
            localStorage.setItem('gemini_api_key', v);
        }

        // ---------- list helpers (stable focus) ----------
        const updateItem = (list, setList) => (i, v) => {
            setList(list.map((item, idx) => (idx === i ? v : item)));
        };
        const moveItem = (list, setList) => (i, dir) => {
            const j = i + dir;
            if (j < 0 || j >= list.length) return;
            const next = list.slice();
            [next[i], next[j]] = [next[j], next[i]];
            setList(next);
        };
        const removeItem = (list, setList) => (i) => setList(list.filter((_, x) => x !== i));
        const addItem = (list, setList, v) => setList([...list, v]);

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

        // ---------- builders ----------
        const buildPromptObject = useMemo(
            () => () => ({
                role: role.trim() || undefined,
                task: task.trim() || undefined,
                audience: audience.trim() || undefined,
                style: style.trim() || undefined,
                tone: tone.trim() || undefined,
                constraints: constraints.filter(Boolean),
                steps: steps.filter(Boolean),
                inputs: inputs
                    .filter(Boolean)
                    .map((s) => {
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
                    frequency_penalty: frequencyPenalty
                }
            }),
            [role, task, audience, style, tone, constraints, steps, inputs, examples,
                temperature, topP, maxTokens, presencePenalty, frequencyPenalty]
        );

        const generateMarkdown = useMemo(
            () => () => {
                const o = buildPromptObject();
                let md = '';
                if (o.role) md += `**Role:** ${o.role}\n\n`;
                if (o.task) md += `**Task:** ${o.task}\n\n`;
                if (o.audience) md += `**Audience:** ${o.audience}\n\n`;
                if (o.style) md += `**Style:** ${o.style}\n\n`;
                if (o.tone) md += `**Tone:** ${o.tone}\n\n`;
                if (o.constraints?.length) {
                    md += '**Constraints:**\n';
                    o.constraints.forEach((c) => (md += `- ${c}\n`));
                    md += '\n';
                }
                if (o.steps?.length) {
                    md += '**Steps:**\n';
                    o.steps.forEach((s, i) => (md += `${i + 1}. ${s}\n`));
                    md += '\n';
                }
                if (o.inputs?.length) {
                    md += '**Inputs:**\n';
                    o.inputs.forEach((inp) => (md += `- **${inp.name}**: ${inp.value}\n`));
                    md += '\n';
                }
                if (o.examples?.length) {
                    md += '**Few-shot examples:**\n';
                    o.examples.forEach((ex) => (md += `- ${ex}\n`));
                    md += '\n';
                }
                md += `**Parameters:**\n- Temperature: ${o.parameters.temperature}\n- Top-p: ${o.parameters.top_p}\n- Max tokens: ${o.parameters.max_tokens}\n- Presence penalty: ${o.parameters.presence_penalty}\n- Frequency penalty: ${o.parameters.frequency_penalty}`;
                return md.trim();
            },
            [buildPromptObject]
        );

        // computed previews (local)
        const promptObject   = buildPromptObject();
        const jsonString     = JSON.stringify(promptObject, null, 2);
        const yamlString     = window.jsonToYaml(promptObject);
        const markdownString = generateMarkdown();

        // ---------- file ops ----------
        function downloadFile(name, content) {
            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = name; document.body.appendChild(a);
            a.click(); a.remove(); URL.revokeObjectURL(url);
        }

        function handleImport(e) {
            const f = e.target.files[0]; if (!f) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const d = JSON.parse(ev.target.result);
                    setRole(d.role || ''); setTask(d.task || ''); setAudience(d.audience || '');
                    setStyle(d.style || ''); setTone(d.tone || '');
                    setConstraints(d.constraints || []); setSteps(d.steps || []);
                    setInputs((d.inputs || []).map((inp) => (inp.name && inp.value ? `${inp.name}: ${inp.value}` : (inp.name || ''))));
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
            reader.readAsText(f); e.target.value = '';
        }

        const Section = window.Section;
        const copyToClipboard = (s) =>
            navigator.clipboard.writeText(s)
                .then(() => alert('Copied to clipboard!'))
                .catch(() => alert('Failed to copy.'));

        // ---------- Gemini helpers (use component state) ----------
        function buildUserPromptForLLM(fmt) {
            const md   = generateMarkdown();
            const json = JSON.stringify(buildPromptObject(), null, 2);
            const yaml = window.jsonToYaml(buildPromptObject());

            let targetHint = '';
            if (fmt === 'json') targetHint = 'Return only valid JSON. No backticks or extra commentary.';
            else if (fmt === 'yaml') targetHint = 'Return only valid YAML. No backticks or extra commentary.';
            else targetHint = 'Return only Markdown. No code fences around the whole answer.';

            return [
                'You are given a structured prompt specification. Use it to produce the final prompt text for an LLM user.',
                'Follow constraints and steps. Keep the response faithful to the spec.',
                `Output format required: ${fmt.toUpperCase()}. ${targetHint}`,
                '',
                '--- Prompt Specification (Markdown) ---',
                md,
                '',
                '--- JSON Snapshot (for reference) ---',
                json,
                '',
                'If fields are missing, be reasonable and concise.'
            ].join('\n');
        }

        async function generateWithGemini() {
            setGenError('');
            if (!apiKey) { setGenError('Please enter your Gemini API key.'); return; }

            setGenerating(true);
            try {
                const userPrompt = buildUserPromptForLLM(outFmt);
                const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

                const body = {
                    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
                    generationConfig: {
                        temperature: temperature,
                        topP: topP,
                        maxOutputTokens: maxTokens
                    }
                };

                const res = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });

                if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);

                const data = await res.json();
                const text =
                    data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') ||
                    data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

                if (outFmt === 'json') {
                    setPreviewTab('json');
                    setGeminiPreview({ md: '', json: text, yaml: '' });
                } else if (outFmt === 'yaml') {
                    setPreviewTab('yaml');
                    setGeminiPreview({ md: '', json: '', yaml: text });
                } else {
                    setPreviewTab('markdown');
                    setGeminiPreview({ md: text, json: '', yaml: '' });
                }
            } catch (e) {
                setGenError(e.message || 'Generation failed.');
            } finally {
                setGenerating(false);
            }
        }

        // ---------- UI ----------
        return (
            <div className="w-full max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left */}
                <div className="card p-4 lg:p-5">
                    <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Prompt Composition</h2>
                    <div className="space-y-4">
                        <div><label className="label">Role</label><input className="field" value={role} onChange={(e)=>setRole(e.target.value)} placeholder="e.g. Helpful AI assistant" /></div>
                        <div><label className="label">Task</label><input className="field" value={task} onChange={(e)=>setTask(e.target.value)} placeholder="Describe what you want the model to do" /></div>
                        <div><label className="label">Audience</label><input className="field" value={audience} onChange={(e)=>setAudience(e.target.value)} placeholder="Who is the prompt for?" /></div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><label className="label">Style</label><input className="field" value={style} onChange={(e)=>setStyle(e.target.value)} placeholder="e.g. Formal, casual" /></div>
                            <div><label className="label">Tone</label><input className="field" value={tone} onChange={(e)=>setTone(e.target.value)} placeholder="e.g. Friendly, neutral" /></div>
                        </div>

                        <Section title="Constraints" items={constraints} onChange={updateConstraint} onAdd={()=>addItem(constraints, setConstraints, '')} onRemove={removeConstraint} onMove={moveConstraint} placeholder="Add a constraint (e.g. Do not mention brand names)" />
                        <Section title="Steps"       items={steps}       onChange={updateStep}       onAdd={()=>addItem(steps, setSteps, '')}       onRemove={removeStep}       onMove={moveStep}       placeholder="Add a step (e.g. Research the topic)" />
                        <Section title="Inputs" description="Use the format name: value" items={inputs} onChange={updateInput} onAdd={()=>addItem(inputs, setInputs, '')} onRemove={removeInput} onMove={moveInput} placeholder="e.g. topic: Artificial Intelligence" />
                        <Section title="Few-shot examples" items={examples} onChange={updateExample} onAdd={()=>addItem(examples, setExamples, '')} onRemove={removeExample} onMove={moveExample} placeholder="Add an example" />

                        <div><label className="label">Import from JSON</label><input type="file" accept="application/json" onChange={handleImport} className="cursor-pointer text-sm" /></div>
                    </div>
                </div>

                {/* Right */}
                <div className="card p-4 lg:p-5">
                    <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Model Parameters & Preview</h2>

                    {/* Gemini panel */}
                    <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="md:col-span-2">
                            <label className="label">Gemini API Key</label>
                            <input type="password" className="field" value={apiKey} onChange={(e)=>saveApiKey(e.target.value)} placeholder="Paste your Google AI Studio key" />
                            <p className="text-xs text-gray-500 dark:text-neutral-400 mt-1">Stored locally in your browser. For production, proxy this call on the server.</p>
                        </div>
                        <div>
                            <label className="label">Model</label>
                            <select className="field" value={model} onChange={(e)=>setModel(e.target.value)}>
                                <option value="gemini-1.5-flash">gemini-1.5-flash</option>
                                <option value="gemini-1.5-pro">gemini-1.5-pro</option>
                            </select>
                        </div>
                    </div>

                    <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                            <label className="label">Output format</label>
                            <select className="field" value={outFmt} onChange={(e)=>setOutFmt(e.target.value)}>
                                <option value="markdown">Markdown</option>
                                <option value="json">JSON</option>
                                <option value="yaml">YAML</option>
                            </select>
                        </div>
                        <div className="flex items-end">
                            <button className="btn btn-primary w-full" disabled={generating} onClick={generateWithGemini}>
                                {generating ? 'Generating…' : 'Generate with Gemini'}
                            </button>
                        </div>
                        <div className="flex items-end">
                            {genError && <div className="text-sm text-red-600 dark:text-red-400">{genError}</div>}
                        </div>
                    </div>

                    {/* Params */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div><label className="label">Temperature</label><input type="number" step="0.01" min="0" max="1" className="field" value={temperature} onChange={(e)=>setTemperature(parseFloat(e.target.value || '0'))} /></div>
                        <div><label className="label">Top-p</label><input type="number" step="0.01" min="0" max="1" className="field" value={topP} onChange={(e)=>setTopP(parseFloat(e.target.value || '0'))} /></div>
                        <div><label className="label">Max tokens</label><input type="number" min="1" className="field" value={maxTokens} onChange={(e)=>setMaxTokens(parseInt(e.target.value, 10) || 0)} /></div>
                        <div><label className="label">Presence penalty</label><input type="number" step="0.01" min="-2" max="2" className="field" value={presencePenalty} onChange={(e)=>setPresencePenalty(parseFloat(e.target.value || '0'))} /></div>
                        <div><label className="label">Frequency penalty</label><input type="number" step="0.01" min="-2" max="2" className="field" value={frequencyPenalty} onChange={(e)=>setFrequencyPenalty(parseFloat(e.target.value || '0'))} /></div>
                    </div>

                    {/* Tabs */}
                    <div className="tabs mb-2 border-b border-gray-200 dark:border-neutral-800">
                        {['markdown','json','yaml'].map((tab) => (
                            <button key={tab} className={previewTab === tab ? 'active' : 'inactive'} onClick={() => setPreviewTab(tab)}>
                                {tab.toUpperCase()}
                            </button>
                        ))}
                    </div>

                    {/* Preview */}
                    <div className="preview h-64">
                        {previewTab === 'markdown' && <pre className="whitespace-pre-wrap">{geminiPreview.md || markdownString}</pre>}
                        {previewTab === 'json'      && <pre>{geminiPreview.json || jsonString}</pre>}
                        {previewTab === 'yaml'      && <pre>{geminiPreview.yaml || yamlString}</pre>}
                    </div>

                    {/* Actions */}
                    <div className="mt-3 flex flex-wrap gap-2">
                        <button className="btn btn-muted" onClick={() => copyToClipboard(previewTab==='markdown'? (geminiPreview.md||markdownString) : previewTab==='json'? (geminiPreview.json||jsonString) : (geminiPreview.yaml||yamlString))}>
                            Copy {previewTab.toUpperCase()}
                        </button>
                        <button className="btn btn-primary" onClick={() => downloadFile('prompt.md', geminiPreview.md || markdownString)}>Download MD</button>
                        <button className="btn btn-primary" onClick={() => downloadFile('prompt.json', geminiPreview.json || jsonString)}>Download JSON</button>
                        <button className="btn btn-primary" onClick={() => downloadFile('prompt.yaml', geminiPreview.yaml || yamlString)}>Download YAML</button>
                    </div>
                </div>
            </div>
        );
    }

    ReactDOM.createRoot(document.getElementById('root')).render(<StructuredPromptBuilder />);
})();
