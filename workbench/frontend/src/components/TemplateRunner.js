import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { executeOnce, listTemplates, streamExecute } from '../api.js';
import SSEConsole from './SSEConsole.js';
export default function TemplateRunner() {
    const [templates, setTemplates] = useState([]);
    const [templateId, setTemplateId] = useState('demo.echo');
    const [argsText, setArgsText] = useState('{"message":"hello"}');
    const [logs, setLogs] = useState([]);
    const [result, setResult] = useState(null);
    const [streaming, setStreaming] = useState(false);
    useEffect(() => {
        listTemplates()
            .then((items) => setTemplates(items))
            .catch((error) => console.error('templates failed', error));
    }, []);
    const handleTemplateChange = (event) => {
        setTemplateId(event.target.value);
    };
    const handleArgsChange = (event) => {
        setArgsText(event.target.value);
    };
    const runOnce = async () => {
        setLogs([]);
        setResult(null);
        try {
            const parsed = argsText ? JSON.parse(argsText) : {};
            const response = await executeOnce({ templateId, args: parsed });
            setResult(response);
        }
        catch (error) {
            setLogs((prev) => [...prev, `runOnce error: ${String(error)}`]);
        }
    };
    const runStream = () => {
        setLogs([]);
        setResult(null);
        setStreaming(true);
        const parsed = (() => {
            try {
                return argsText ? JSON.parse(argsText) : {};
            }
            catch (error) {
                setLogs((prev) => [...prev, `parse error: ${String(error)}`]);
                setStreaming(false);
                return null;
            }
        })();
        if (parsed === null)
            return;
        streamExecute({ templateId, args: parsed }, (line) => setLogs((prev) => [...prev, line]), (response) => {
            setResult(response);
            setStreaming(false);
        }, (error) => {
            setLogs((prev) => [...prev, `stream error: ${String(error)}`]);
            setStreaming(false);
        });
    };
    return (_jsxs("section", { id: "run", style: { display: 'grid', gap: 12 }, children: [_jsx("h3", { children: "Run Template" }), _jsxs("label", { children: ["Template:", _jsx("select", { value: templateId, onChange: handleTemplateChange, style: { marginLeft: 8 }, children: templates.map((tmpl) => (_jsx("option", { value: tmpl.id, children: tmpl.id }, tmpl.id))) })] }), _jsxs("label", { children: ["Args (JSON):", _jsx("textarea", { value: argsText, onChange: handleArgsChange, rows: 6, style: { width: '100%', fontFamily: 'ui-monospace' } })] }), _jsxs("div", { style: { display: 'flex', gap: 8 }, children: [_jsx("button", { onClick: runOnce, disabled: streaming, children: "Run (REST)" }), _jsx("button", { onClick: runStream, disabled: streaming, children: "Run (SSE)" })] }), _jsx(SSEConsole, { logs: logs }), result !== null && (_jsx("pre", { style: { background: '#f6f8fa', padding: 8, overflow: 'auto' }, children: JSON.stringify(result, null, 2) }))] }));
}
