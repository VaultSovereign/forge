import { useEffect, useState, type ChangeEvent } from 'react';
import { executeOnce, listTemplates, streamExecute, type TemplateSummary } from '../api.js';
import SSEConsole from './SSEConsole.js';

export default function TemplateRunner() {
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [templateId, setTemplateId] = useState('demo.echo');
  const [argsText, setArgsText] = useState('{"message":"hello"}');
  const [logs, setLogs] = useState<string[]>([]);
  const [result, setResult] = useState<unknown | null>(null);
  const [streaming, setStreaming] = useState(false);

  useEffect(() => {
    listTemplates()
      .then((items) => setTemplates(items))
      .catch((error) => console.error('templates failed', error));
  }, []);

  const handleTemplateChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setTemplateId(event.target.value);
  };

  const handleArgsChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setArgsText(event.target.value);
  };

  const runOnce = async () => {
    setLogs([]);
    setResult(null);
    try {
      const parsed = argsText ? JSON.parse(argsText) : {};
      const response = await executeOnce({ templateId, args: parsed });
      setResult(response);
    } catch (error) {
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
      } catch (error) {
        setLogs((prev) => [...prev, `parse error: ${String(error)}`]);
        setStreaming(false);
        return null;
      }
    })();

    if (parsed === null) return;

    streamExecute(
      { templateId, args: parsed },
      (line) => setLogs((prev) => [...prev, line]),
      (response) => {
        setResult(response);
        setStreaming(false);
      },
      (error) => {
        setLogs((prev) => [...prev, `stream error: ${String(error)}`]);
        setStreaming(false);
      }
    );
  };

  return (
    <div className="stack template-runner">
      <div className="stack">
        <label className="template-runner__field">
          <span>Template</span>
          <select value={templateId} onChange={handleTemplateChange}>
            {templates.map((tmpl) => (
              <option key={tmpl.id} value={tmpl.id}>
                {tmpl.id}
              </option>
            ))}
          </select>
        </label>
        <label className="template-runner__field">
          <span>Args (JSON)</span>
          <textarea value={argsText} onChange={handleArgsChange} rows={6} className="monospace" />
        </label>
      </div>
      <div className="template-runner__actions">
        <button onClick={runOnce} disabled={streaming}>
          Run (REST)
        </button>
        <button onClick={runStream} disabled={streaming}>
          Run (SSE)
        </button>
      </div>
      <SSEConsole logs={logs} />
      {result !== null && (
        <pre className="template-runner__result monospace">{JSON.stringify(result, null, 2)}</pre>
      )}
    </div>
  );
}
