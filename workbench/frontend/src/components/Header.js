import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import StreamingBadge from './StreamingBadge.js';
export default function Header() {
    return (_jsxs("header", { style: {
            padding: '10px 14px',
            borderBottom: '1px solid #eee',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 16,
            flexWrap: 'wrap'
        }, children: [_jsx("strong", { children: "VaultMesh Workbench" }), _jsxs("div", { style: { display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }, children: [_jsxs("nav", { style: { display: 'flex', gap: 12 }, children: [_jsx("a", { href: "#templates", children: "Templates" }), _jsx("a", { href: "#run", children: "Run" }), _jsx("a", { href: "#ledger", children: "Ledger" })] }), _jsx(StreamingBadge, {})] })] }));
}
