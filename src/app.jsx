(function () {
    const { useState } = React;

    function StructuredPromptBuilder() {
        const [role, setRole] = useState('');
        const [task, setTask] = useState('');
        const [audience, setAudience] = useState('');
        const [style, setStyle] = useState('');
        const [tone, setTone] = useState('');
        const [constraints, setConstraints] = useState([]);
        const [steps, setSteps] = useState([]);
        const [inputs, setInputs] = useState([]);
        const [examples, setExamples] = useState([]);
        const [temperature, setTemperature] = useState(0.7);
        const [topP, setTopP] = useState(1.0);
        const [maxTokens, setMaxTokens] = useState(1024);
        const [presencePenalty, setPresencePenalty] = useState(0.0);
        const [frequencyPenalty, setFrequencyPenalty] = useState(0.0);
        const [previewTab, setPreviewTab] = useState('markdown');

        const updateItem = (list, setList) => (i, v) => { const a = [...list]; a[i] = v; setList(a); };
        const moveItem   = (list, setList) => (i, dir) => { const j = i + dir; if (j < 0 || j >= list.length) return; const a = [...list]; [a[i], a[j]] = [a[j], a[i]]; setList(a); };
        const removeItem = (list, setList) => (i) => setList(list.filter((_, x) => x !== i));
        const addItem    = (list, setList, v) => setList([...list, v]);

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

        const buildPromptObject = () => ({
            role: role.trim() || undefined,
            task: task.trim() || undefined,
            audience: audience.trim() || undefined,
            style: style.trim() || undefined,
            tone: tone.trim() || undefined,
            constraints: constraints.filter(Boolean),
            steps: steps.filter(Boolean),
            inputs: inputs.filter(Boolean).map((s) => {
                const p = s.split(':');
                if (p.length >= 2) { const n = p.shift().trim(); return { name: n, value: p.join(':').trim() }; }
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
        });

        function generateMarkdown() {
            const o = buildPromptObject();
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
        }

        const promptObject   = buildPromptObject();
        const jsonString     = JSON.stringify(promptObject, null, 2);
        const yamlString     = window.jsonToYaml(promptObject); // make sure jsonToYaml.js is loaded before this file
        const markdownString = generateMarkdown();

        function downloadFile(name, content) {
            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
        }

        function handleImport(e) {
            const f = e.target.files[0]; if (!f) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const d = JSON.parse(ev.target.result);
                    setRole(d.role || ''); setTask(d.task || ''); setAudience(d.audience || ''); setStyle(d.style || ''); setTone(d.tone || '');
                    setConstraints(d.constraints || []); setSteps(d.steps || []);
                    setInputs((d.inputs || []).map(inp => inp.name && inp.value ? `${inp.name}: ${inp.value}` : (inp.name || '')));
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
            navigator.clipboard.writeText(s).then(() => alert('Copied to clipboard!')).catch(() => alert('Failed to copy.'));

        return (
            <div className="w-full max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card p-4 lg:p-5">
                    <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Prompt Composition</h2>
                    <div className="space-y-4">
                        <div><label className="label">Role</label><input type="text" className="field" value={role} onChange={(e)=>setRole(e.target.value)} placeholder="e.g. Helpful AI assistant" /></div>
                        <div><label className="label">Task</label><input type="text" className="field" value={task} onChange={(e)=>setTask(e.target.value)} placeholder="Describe what you want the model to do" /></div>
                        <div><label className="label">Audience</label><input type="text" className="field" value={audience} onChange={(e)=>setAudience(e.target.value)} placeholder="Who is the prompt for?" /></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><label className="label">Style</label><input type="text" className="field" value={style} onChange={(e)=>setStyle(e.target.value)} placeholder="e.g. Formal, casual" /></div>
                            <div><label className="label">Tone</label><input type="text" className="field" value={tone} onChange={(e)=>setTone(e.target.value)} placeholder="e.g. Friendly, neutral" /></div>
                        </div>

                        <Section title="Constraints" items={constraints} onChange={updateConstraint} onAdd={()=>addItem(constraints,setConstraints,'')} onRemove={removeConstraint} onMove={moveConstraint} placeholder="Add a constraint (e.g. Do not mention brand names)" />
                        <Section title="Steps" items={steps} onChange={updateStep} onAdd={()=>addItem(steps,setSteps,'')} onRemove={removeStep} onMove={moveStep} placeholder="Add a step (e.g. Research the topic)" />
                        <Section title="Inputs" description="Use the format name: value" items={inputs} onChange={updateInput} onAdd={()=>addItem(inputs,setInputs,'')} onRemove={removeInput} onMove={moveInput} placeholder="e.g. topic: Artificial Intelligence" />
                        <Section title="Few-shot examples" items={examples} onChange={updateExample} onAdd={()=>addItem(examples,setExamples,'')} onRemove={removeExample} onMove={moveExample} placeholder="Add an example" />

                        <div><label className="label">Import from JSON</label><input type="file" accept="application/json" onChange={handleImport} className="cursor-pointer text-sm" /></div>
                    </div>
                </div>

                <div className="card p-4 lg:p-5">
                    <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Model Parameters & Preview</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div><label className="label">Temperature</label><input type="number" step="0.01" min="0" max="1" className="field" value={temperature} onChange={(e)=>setTemperature(parseFloat(e.target.value||'0'))} /></div>
                        <div><label className="label">Top-p</label><input type="number" step="0.01" min="0" max="1" className="field" value={topP} onChange={(e)=>setTopP(parseFloat(e.target.value||'0'))} /></div>
                        <div><label className="label">Max tokens</label><input type="number" min="1" className="field" value={maxTokens} onChange={(e)=>setMaxTokens(parseInt(e.target.value,10)||0)} /></div>
                        <div><label className="label">Presence penalty</label><input type="number" step="0.01" min="-2" max="2" className="field" value={presencePenalty} onChange={(e)=>setPresencePenalty(parseFloat(e.target.value||'0'))} /></div>
                        <div><label className="label">Frequency penalty</label><input type="number" step="0.01" min="-2" max="2" className="field" value={frequencyPenalty} onChange={(e)=>setFrequencyPenalty(parseFloat(e.target.value||'0'))} /></div>
                    </div>

                    <div className="tabs mb-2 border-b border-gray-200 dark:border-neutral-800">
                        {['markdown','json','yaml'].map(tab => (
                            <button key={tab} className={previewTab===tab ? 'active' : 'inactive'} onClick={()=>setPreviewTab(tab)}>
                                {tab.toUpperCase()}
                            </button>
                        ))}
                    </div>

                    <div className="preview h-64">
                        {previewTab==='markdown' && <pre className="whitespace-pre-wrap">{markdownString}</pre>}
                        {previewTab==='json' && <pre>{jsonString}</pre>}
                        {previewTab==='yaml' && <pre>{yamlString}</pre>}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                        <button className="btn btn-muted" onClick={()=>copyToClipboard(previewTab==='markdown'?markdownString:previewTab==='json'?jsonString:yamlString)}>Copy {previewTab.toUpperCase()}</button>
                        <button className="btn btn-primary" onClick={()=>downloadFile('prompt.md', markdownString)}>Download MD</button>
                        <button className="btn btn-primary" onClick={()=>downloadFile('prompt.json', jsonString)}>Download JSON</button>
                        <button className="btn btn-primary" onClick={()=>downloadFile('prompt.yaml', yamlString)}>Download YAML</button>
                    </div>
                </div>
            </div>
        );
    }

    ReactDOM.createRoot(document.getElementById('root')).render(<StructuredPromptBuilder />);
})();
