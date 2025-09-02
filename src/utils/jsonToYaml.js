/* global window */
(function () {
    function jsonToYaml(obj, indent = 0) {
        const sp = '  '.repeat(indent);
        if (Array.isArray(obj)) {
            return obj.map((it) => {
                const nested = jsonToYaml(it, indent + 1);
                return typeof it === 'object' && it !== null ? `${sp}-\n${nested}` : `${sp}- ${nested.trim()}`;
            }).join('\n');
        }
        if (obj === null || obj === undefined) return 'null';
        if (typeof obj !== 'object') return String(obj);
        return Object.keys(obj).filter((k) => obj[k] !== undefined).map((k) => {
            const v = obj[k];
            if (typeof v === 'object' && v !== null) return `${sp}${k}:\n${jsonToYaml(v, indent + 1)}`;
            return `${sp}${k}: ${jsonToYaml(v, indent + 1).trim()}`;
        }).join('\n');
    }
    window.jsonToYaml = jsonToYaml;
})();
