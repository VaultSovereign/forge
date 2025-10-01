import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useRef } from 'react';
export default function SSEConsole({ logs }) {
    const ref = useRef(null);
    useEffect(() => {
        ref.current?.scrollTo(0, ref.current.scrollHeight);
    }, [logs]);
    return (_jsx("div", { ref: ref, style: {
            background: '#0b1220',
            color: '#cbd5e1',
            height: 160,
            overflow: 'auto',
            padding: 8,
            fontFamily: 'ui-monospace,Menlo,monospace',
            fontSize: 12
        }, children: logs.map((line, idx) => (_jsx("div", { children: line }, idx))) }));
}
