import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { listLedger } from '../api.js';
export default function LedgerTable() {
    const [rows, setRows] = useState([]);
    useEffect(() => {
        listLedger(25)
            .then((payload) => setRows(payload.rows ?? []))
            .catch((error) => console.error('ledger failed', error));
    }, []);
    return (_jsxs("section", { id: "ledger", children: [_jsx("h3", { children: "Reality Ledger" }), _jsxs("table", { style: { width: '100%', borderCollapse: 'collapse' }, children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { align: "left", children: "Event ID" }), _jsx("th", { align: "left", children: "Template" }), _jsx("th", { align: "left", children: "Profile" }), _jsx("th", { align: "left", children: "Timestamp" }), _jsx("th", { align: "left", children: "Status" })] }) }), _jsx("tbody", { children: rows.map((row) => (_jsxs("tr", { children: [_jsx("td", { children: _jsx("code", { children: row.id }) }), _jsx("td", { children: row.template }), _jsx("td", { children: row.profile }), _jsx("td", { children: new Date(row.ts).toLocaleString() }), _jsx("td", { children: row.status ?? 'ok' })] }, row.id))) })] })] }));
}
