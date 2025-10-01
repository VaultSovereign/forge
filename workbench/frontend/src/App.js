import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Header from './components/Header.js';
import TemplateRunner from './components/TemplateRunner.js';
import LedgerTable from './components/LedgerTable.js';
export default function App() {
    return (_jsxs("div", { style: { maxWidth: 980, margin: '0 auto', padding: 16 }, children: [_jsx(Header, {}), _jsxs("section", { id: "templates", children: [_jsx("h3", { children: "Templates" }), _jsx("p", { children: "Browse templates via the BFF. Editing flows will be added here (Monaco + JSON Schema driven forms)." })] }), _jsx(TemplateRunner, {}), _jsx(LedgerTable, {})] }));
}
