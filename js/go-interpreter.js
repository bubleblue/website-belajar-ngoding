/**
 * Go (Golang) Client-Side Transpiler & Runtime Engine
 * Executes Go code directly inside the web browser terminal
 * Provides bidirectional Pseudocode <-> Go translation
 * Supports comprehensive Go syntax including float64, float32, int types,
 * math functions, type conversions, formatted I/O, loops, and slices.
 */

class GoInterpreter {
    constructor(terminal) {
        this.terminal = terminal;
        this.status = 'idle'; // 'idle', 'running', 'waiting_input'
        this.inputResolve = null;
    }

    // Transpile standard Go code to secure async JS
    transpile(goCode) {
        // Normalize spaced types like 'float 64' or 'int 64'
        let cleanCode = goCode
            .replace(/\bfloat\s+64\b/g, 'float64')
            .replace(/\bfloat\s+32\b/g, 'float32')
            .replace(/\bint\s+64\b/g, 'int64')
            .replace(/\bint\s+32\b/g, 'int32')
            .replace(/\bint\s+16\b/g, 'int16')
            .replace(/\bint\s+8\b/g, 'int8')
            .replace(/\buint\s+64\b/g, 'uint64')
            .replace(/\buint\s+32\b/g, 'uint32');

        const rawLines = cleanCode.split('\n');
        const jsLines = [];
        let inGroupVar = false;
        let inGroupConst = false;
        let inSwitch = false;
        let hasFirstCase = false;

        for (let i = 0; i < rawLines.length; i++) {
            const rawLine = rawLines[i];
            let line = rawLine.trim();

            if (!line || line.startsWith('//')) {
                jsLines.push(rawLine);
                continue;
            }

            // Strip package statement
            if (/^package\s+/i.test(line)) continue;

            // Strip import statements (single-line or multi-line block)
            if (/^import\s+/i.test(line)) {
                if (line.includes('(')) {
                    while (i < rawLines.length && !rawLines[i].includes(')')) {
                        i++;
                    }
                }
                continue;
            }

            // Multi-line var ( ... ) or const ( ... )
            if (/^var\s*\(\s*$/.test(line)) { inGroupVar = true; continue; }
            if (/^const\s*\(\s*$/.test(line)) { inGroupConst = true; continue; }
            if ((inGroupVar || inGroupConst) && line === ')') {
                inGroupVar = false;
                inGroupConst = false;
                continue;
            }

            if (inGroupVar && !line.startsWith('var ')) line = 'var ' + line;
            if (inGroupConst && !line.startsWith('const ')) line = 'const ' + line;

            // Function declaration: func name(params) returnType { ... }
            const funcMatch = line.match(/^func\s+([a-zA-Z0-9_]+)\s*\((.*?)\)(?:\s+([a-zA-Z0-9_,\s\*\(\)\[\]]+))?\s*\{/);
            if (funcMatch) {
                const fnName = funcMatch[1];
                if (fnName === 'main') {
                    jsLines.push('async function __main() {');
                } else {
                    // Extract parameter names
                    const params = funcMatch[2].split(',').map(p => {
                        const parts = p.trim().split(/\s+/);
                        return parts[0];
                    }).filter(Boolean).join(', ');
                    jsLines.push(`function ${fnName}(${params}) {`);
                }
                continue;
            }

            // fmt print statements (synchronous output in web terminal)
            line = line.replace(/fmt\.Println\s*\(/g, '__fmt.Println(');
            line = line.replace(/fmt\.Print\s*\(/g, '__fmt.Print(');
            line = line.replace(/fmt\.Printf\s*\(/g, '__fmt.Printf(');

            // fmt.Scan / fmt.Scanln / fmt.Scanf
            const scanMatch = line.match(/fmt\.(?:Scan|Scanln|Scanf)\s*\((.+?)\)/);
            if (scanMatch) {
                // If Scanf, the first argument is format string
                let rawArgs = scanMatch[1];
                if (line.includes('fmt.Scanf')) {
                    const firstComma = rawArgs.indexOf(',');
                    if (firstComma !== -1) {
                        rawArgs = rawArgs.substring(firstComma + 1);
                    }
                }
                const args = rawArgs.split(',').map(s => s.trim().replace(/^&/, '')).filter(Boolean);
                if (args.length === 1) {
                    line = `${args[0]} = await __fmt.Scan("${args[0]}");`;
                } else {
                    line = `[${args.join(', ')}] = await __fmt.ScanMultiple(${args.length}, ${JSON.stringify(args)});`;
                }
                jsLines.push(line);
                continue;
            }

            // Const declarations: const a, b [type] = 1, 2
            let constMatch = line.match(/^const\s+([a-zA-Z0-9_,\s]+?)\s+(int|int64|int32|int16|int8|uint|uint64|uint32|uint16|uint8|float64|float32|string|bool|byte|rune|any)\s*=\s*(.+)$/);
            if (!constMatch) {
                constMatch = line.match(/^const\s+([a-zA-Z0-9_,\s]+)\s*=\s*(.+)$/);
            }
            if (constMatch) {
                const names = constMatch[1].split(',').map(v => v.trim()).filter(Boolean);
                const vals = constMatch[constMatch.length - 1].trim();
                if (names.length === 1) {
                    line = `const ${names[0]} = ${vals};`;
                } else {
                    line = `const [${names.join(', ')}] = [${vals}];`;
                }
                jsLines.push(line);
                continue;
            }

            // Var declaration with explicit type: var a, b int [= val1, val2] or var deret [6]int
            const varTypedMatch = line.match(/^var\s+([a-zA-Z0-9_,\s]+?)\s+(int|int64|int32|int16|int8|uint|uint64|uint32|uint16|uint8|float64|float32|string|bool|byte|rune|any|\[\d*\][a-zA-Z0-9_]+)(?:\s*=\s*(.+))?$/);
            if (varTypedMatch) {
                const names = varTypedMatch[1].split(',').map(v => v.trim()).filter(Boolean);
                const type = varTypedMatch[2];
                let defaultVal = '0';
                if (type === 'string') defaultVal = '""';
                else if (type === 'bool') defaultVal = 'false';
                else if (type.startsWith('float')) defaultVal = '0.0';
                else if (type.startsWith('[')) {
                    const sizeMatch = type.match(/^\[(\d+)\]/);
                    const size = sizeMatch ? parseInt(sizeMatch[1], 10) : 0;
                    defaultVal = size > 0 ? `new Array(${size}).fill(0)` : '[]';
                }

                if (varTypedMatch[3]) {
                    const vals = varTypedMatch[3].trim();
                    if (names.length === 1) {
                        line = `let ${names[0]} = ${vals};`;
                    } else {
                        line = `let [${names.join(', ')}] = [${vals}];`;
                    }
                } else {
                    line = 'let ' + names.map(v => `${v} = ${defaultVal}`).join(', ') + ';';
                }
                jsLines.push(line);
                continue;
            }

            // Var declaration without explicit type: var a, b = 1, 2
            const varInferredMatch = line.match(/^var\s+([a-zA-Z0-9_,\s]+)\s*=\s*(.+)$/);
            if (varInferredMatch) {
                const names = varInferredMatch[1].split(',').map(v => v.trim()).filter(Boolean);
                const vals = varInferredMatch[2].trim();
                if (names.length === 1) {
                    line = `let ${names[0]} = ${vals};`;
                } else {
                    line = `let [${names.join(', ')}] = [${vals}];`;
                }
                jsLines.push(line);
                continue;
            }

            // for C-style: for i := 0; i < n; i++ {
            const forCStyle = line.match(/^for\s+([a-zA-Z0-9_]+)\s*:=\s*(.+?);\s*(.+?);\s*([a-zA-Z0-9_++--\s]+)\s*\{/);
            if (forCStyle) {
                line = `for (let ${forCStyle[1]} = ${forCStyle[2]}; ${forCStyle[3]}; ${forCStyle[4].trim()}) {`;
                jsLines.push(line);
                continue;
            }

            // for range: for i, v := range slice {
            const forRangeMatch = line.match(/^for\s+(?:([a-zA-Z0-9_]+)\s*,\s*)?([a-zA-Z0-9_]+)\s*(?::=|=)\s*range\s+([^{]+)\s*\{/);
            if (forRangeMatch) {
                const idxVar = forRangeMatch[1] && forRangeMatch[1] !== '_' ? forRangeMatch[1] : null;
                const valVar = forRangeMatch[2] && forRangeMatch[2] !== '_' ? forRangeMatch[2] : null;
                const target = forRangeMatch[3].trim();
                line = `for (const [${idxVar || '__i'}, ${valVar || '__v'}] of (${target}).entries()) {`;
                jsLines.push(line);
                continue;
            }

            // Short variable declaration: a, b := 1, 2
            const shortDeclMatch = line.match(/^([a-zA-Z0-9_,\s]+)\s*:=\s*(.+)$/);
            if (shortDeclMatch) {
                const names = shortDeclMatch[1].split(',').map(v => v.trim()).filter(Boolean);
                const vals = shortDeclMatch[2].trim();
                if (names.length === 1) {
                    line = `let ${names[0]} = ${vals};`;
                } else {
                    line = `let [${names.join(', ')}] = [${vals}];`;
                }
                jsLines.push(line);
                continue;
            }

            // for condition { (while equivalent)
            const forWhile = line.match(/^for\s+([^{;]+)\s*\{/);
            if (forWhile) {
                line = `while (${forWhile[1].trim()}) {`;
                jsLines.push(line);
                continue;
            }

            // for { (infinite loop)
            if (/^for\s*\{/.test(line)) {
                line = 'while (true) {';
                jsLines.push(line);
                continue;
            }

            // if statements
            const ifMatch = line.match(/^if\s+([^{]+)\s*\{/);
            if (ifMatch) {
                line = `if (${ifMatch[1].trim()}) {`;
                jsLines.push(line);
                continue;
            }

            // else if
            const elifMatch = line.match(/^else\s+if\s+([^{]+)\s*\{/);
            if (elifMatch) {
                line = `else if (${elifMatch[1].trim()}) {`;
                jsLines.push(line);
                continue;
            }

            // switch statements
            const switchMatch = line.match(/^switch(?:\s+([^{]+))?\s*\{/);
            if (switchMatch) {
                const expr = switchMatch[1] ? switchMatch[1].trim() : 'true';
                line = `switch (${expr}) {`;
                jsLines.push(line);
                inSwitch = true;
                hasFirstCase = false;
                continue;
            }

            // case statements (handle multiple values: case 1, 2:)
            const caseMatch = line.match(/^case\s+(.+?):$/);
            if (caseMatch) {
                const prefix = hasFirstCase ? 'break; ' : '';
                hasFirstCase = true;
                const vals = caseMatch[1].split(',').map(s => s.trim()).filter(Boolean);
                line = prefix + vals.map(v => `case ${v}:`).join(' ');
                jsLines.push(line);
                continue;
            }

            // default statement
            if (/^default\s*:$/.test(line)) {
                const prefix = hasFirstCase ? 'break; ' : '';
                line = prefix + 'default:';
                jsLines.push(line);
                continue;
            }

            if (line === '}' && inSwitch) {
                inSwitch = false;
                hasFirstCase = false;
            }

            jsLines.push(line);
        }

        return jsLines.join('\n') + '\nreturn __main();';
    }

    // Run Go code asynchronously with interactive stdin / stdout
    async run(goCode, inputQueue = []) {
        this.status = 'running';
        const outputs = [];

        let jsExecutable;
        try {
            jsExecutable = this.transpile(goCode);
        } catch (err) {
            this.status = 'idle';
            throw new Error(`Sintaks Go tidak valid: ${err.message}`);
        }

        // Mock `fmt` package in Go runtime
        const mockFmt = {
            Println: async (...args) => {
                const line = args.map(arg => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg))).join(' ');
                outputs.push(line);
                if (this.terminal) {
                    this.terminal.print(line, 'output');
                }
            },
            Print: async (...args) => {
                const text = args.map(arg => String(arg)).join(' ');
                outputs.push(text);
                if (this.terminal) {
                    this.terminal.write(text, 'output');
                }
            },
            Printf: async (fmtStr, ...args) => {
                let argIdx = 0;
                const formatted = String(fmtStr).replace(/%(\.\d+)?([fFgdsvtTc%])/g, (match, precision, specifier) => {
                    if (specifier === '%') return '%';
                    if (argIdx >= args.length) return match;
                    const val = args[argIdx++];

                    switch (specifier) {
                        case 'f':
                        case 'F': {
                            const num = parseFloat(val);
                            if (isNaN(num)) return 'NaN';
                            if (precision) {
                                const dec = parseInt(precision.slice(1), 10);
                                return num.toFixed(dec);
                            }
                            return num.toFixed(6);
                        }
                        case 'g': {
                            const num = parseFloat(val);
                            return isNaN(num) ? 'NaN' : String(num);
                        }
                        case 'd': {
                            const num = parseInt(val, 10);
                            return isNaN(num) ? '0' : String(num);
                        }
                        case 's':
                            return String(val);
                        case 't':
                            return Boolean(val) ? 'true' : 'false';
                        case 'v':
                            return typeof val === 'object' ? JSON.stringify(val) : String(val);
                        case 'T': {
                            if (typeof val === 'number') {
                                return Number.isInteger(val) ? 'int' : 'float64';
                            }
                            if (typeof val === 'string') return 'string';
                            if (typeof val === 'boolean') return 'bool';
                            if (Array.isArray(val)) return '[]interface{}';
                            return typeof val;
                        }
                        case 'c':
                            return String.fromCharCode(Number(val) || 0);
                        default:
                            return String(val);
                    }
                });
                outputs.push(formatted);
                if (this.terminal) {
                    this.terminal.write(formatted, 'output');
                }
            },
            Scan: async (varName = 'input') => {
                if (inputQueue && inputQueue.length > 0) {
                    return this.parseInputVal(inputQueue.shift());
                }
                if (!this.terminal) return 0;
                this.status = 'waiting_input';
                const rawVal = await this.terminal.promptInput(`[input] ${varName}: `);
                this.status = 'running';
                return this.parseInputVal(rawVal);
            },
            ScanMultiple: async (count, names = []) => {
                const results = [];
                for (let c = 0; c < count; c++) {
                    const name = names[c] || `input_${c + 1}`;
                    const val = await mockFmt.Scan(name);
                    results.push(val);
                }
                return results;
            }
        };

        // Go Built-in Type Constructors & Helpers
        const _float64 = (v) => {
            if (typeof v === 'boolean') return v ? 1.0 : 0.0;
            const n = parseFloat(String(v).replace(',', '.'));
            return isNaN(n) ? 0.0 : n;
        };

        const _float32 = _float64;

        const _int = (v) => {
            if (typeof v === 'boolean') return v ? 1 : 0;
            const n = parseInt(v, 10);
            return isNaN(n) ? 0 : Math.trunc(n);
        };

        const _int64 = _int;
        const _int32 = _int;
        const _int16 = _int;
        const _int8 = _int;
        const _uint = (v) => Math.abs(_int(v));
        const _uint64 = _uint;
        const _uint32 = _uint;
        const _uint16 = _uint;
        const _uint8 = _uint;
        const _byte = (v) => _int(v) & 0xFF;
        const _rune = _int;
        const _string = (v) => String(v);
        const _bool = (v) => Boolean(v);

        const _len = (v) => {
            if (v == null) return 0;
            if (typeof v === 'string' || Array.isArray(v)) return v.length;
            if (typeof v === 'object') return Object.keys(v).length;
            return 0;
        };

        const _cap = _len;

        const _append = (slice, ...items) => {
            if (!Array.isArray(slice)) slice = slice != null ? [slice] : [];
            return [...slice, ...items];
        };

        const _make = (type, len = 0, cap = 0) => {
            const size = typeof type === 'number' ? type : len;
            return new Array(size).fill(0);
        };

        const _math = {
            Pi: Math.PI,
            E: Math.E,
            Phi: 1.618033988749895,
            Sqrt: Math.sqrt,
            Pow: Math.pow,
            Abs: Math.abs,
            Floor: Math.floor,
            Ceil: Math.ceil,
            Round: Math.round,
            Max: Math.max,
            Min: Math.min,
            Sin: Math.sin,
            Cos: Math.cos,
            Tan: Math.tan,
            Log: Math.log,
            Log10: Math.log10,
            Mod: (x, y) => x % y
        };

        try {
            const runner = new Function(
                '__fmt',
                'float64',
                'float32',
                'int',
                'int64',
                'int32',
                'int16',
                'int8',
                'uint',
                'uint64',
                'uint32',
                'uint16',
                'uint8',
                'byte',
                'rune',
                'string',
                'bool',
                'len',
                'cap',
                'make',
                'append',
                'math',
                jsExecutable
            );

            await runner(
                mockFmt,
                _float64,
                _float32,
                _int,
                _int64,
                _int32,
                _int16,
                _int8,
                _uint,
                _uint64,
                _uint32,
                _uint16,
                _uint8,
                _byte,
                _rune,
                _string,
                _bool,
                _len,
                _cap,
                _make,
                _append,
                _math
            );

            this.status = 'idle';
            return { outputs, success: true };
        } catch (err) {
            this.status = 'idle';
            throw err;
        }
    }

    parseInputVal(raw) {
        if (typeof raw !== 'string') return raw;
        const trimmed = raw.trim();
        const normalized = trimmed.replace(',', '.');
        if (/^-?\d+$/.test(normalized)) return parseInt(normalized, 10);
        if (/^-?\d+\.\d+$/.test(normalized)) return parseFloat(normalized);
        if (trimmed.toLowerCase() === 'true') return true;
        if (trimmed.toLowerCase() === 'false') return false;
        return trimmed;
    }
}

// Bidirectional Transpiler: Pseudocode <-> Golang
class CodeTranspiler {
    static pseudoToGoType(typeStr) {
        const raw = (typeStr || '').trim().toLowerCase();
        if (raw.includes('real') || raw.includes('float') || raw.includes('desimal')) return 'float64';
        if (raw.includes('string') || raw.includes('teks')) return 'string';
        if (raw.includes('char') || raw.includes('karakter')) return 'byte';
        if (raw.includes('bool')) return 'bool';
        return 'int';
    }

    static parseParamsToGo(paramStr) {
        if (!paramStr || !paramStr.trim()) return '';
        const groupRegex = /(?:(input\/output|inout|input|output)\s+)?([a-zA-Z_][a-zA-Z0-9_,\s]*?)\s*:\s*([a-zA-Z0-9_\[\].\s]+)(?:;|,|$)/gi;
        const parts = [];
        let match;
        let found = false;
        while ((match = groupRegex.exec(paramStr)) !== null) {
            found = true;
            const dir = (match[1] || 'input').toLowerCase();
            const isPointer = (dir === 'input/output' || dir === 'inout');
            const names = match[2].split(',').map(s => s.trim()).filter(Boolean);
            const goType = (isPointer ? '*' : '') + CodeTranspiler.pseudoToGoType(match[3]);
            names.forEach(n => parts.push(`${n} ${goType}`));
        }
        if (!found) {
            return paramStr.split(',').map(p => p.trim() + ' int').join(', ');
        }
        return parts.join(', ');
    }

    // Convert Pseudocode (Indonesian/English) into idiomatic Golang
    static pseudocodeToGo(pseudoCode) {
        const lines = pseudoCode.split('\n');
        const topLevelGo = [];
        const mainGo = [];

        let inKamus = false;
        let inSub = false;
        const declaredVars = new Set();

        const appendGo = (str) => {
            if (inSub) {
                topLevelGo.push(str);
            } else {
                mainGo.push(str);
            }
        };

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
            if (!line) continue;

            line = line.replace(/;\s*$/, '');

            // Comments
            if (line.startsWith('//') || line.startsWith('#')) {
                appendGo('    ' + line.replace(/^#/, '//'));
                continue;
            }

            // Headers
            if (/^program\b/i.test(line) || /^algoritma\s+[^\s:]+/i.test(line)) {
                continue;
            }
            if (/^(kamus|deklarasi)\b/i.test(line)) {
                inKamus = true;
                continue;
            }
            if (/^(algoritma|deskripsi|begin|mulai|start)\b/i.test(line)) {
                inKamus = false;
                continue;
            }
            if (/^(endprogram|selesai|end)$/i.test(line)) {
                continue;
            }

            // Function declaration: function <nama>(<params>) [->|:] <retType>
            const funcMatch = line.match(/^(?:function|fungsi)\s+([a-zA-Z0-9_]+)\s*(?:\((.*?)\))?(?:\s*(?:->|:)\s*([a-zA-Z0-9_\[\].\s]+))?$/i);
            if (funcMatch) {
                inSub = true;
                inKamus = false;
                const fnName = funcMatch[1];
                const rawParams = funcMatch[2] || '';
                const retType = CodeTranspiler.pseudoToGoType(funcMatch[3]);
                const params = CodeTranspiler.parseParamsToGo(rawParams);
                topLevelGo.push(`func ${fnName}(${params}) ${retType} {`);
                continue;
            }

            // Procedure declaration: procedure <nama>(<params>)
            const procMatch = line.match(/^(?:procedure|prosedur)\s+([a-zA-Z0-9_]+)\s*(?:\((.*?)\))?$/i);
            if (procMatch) {
                inSub = true;
                inKamus = false;
                const procName = procMatch[1];
                const rawParams = procMatch[2] || '';
                const params = CodeTranspiler.parseParamsToGo(rawParams);
                topLevelGo.push(`func ${procName}(${params}) {`);
                continue;
            }

            // End of function / procedure
            if (/^(?:endfunction|end_function|end\s*function|endprocedure|end_procedure|end\s*procedure|selesai_fungsi|selesai_prosedur)\b/i.test(line)) {
                topLevelGo.push('}\n');
                inSub = false;
                inKamus = false;
                continue;
            }

            // Return statement
            if (/^(?:return|kembalikan)\b/i.test(line)) {
                let expr = line.replace(/^(?:return|kembalikan)\b\s*/i, '').trim();
                expr = expr.replace(/\bmod\b/gi, '%').replace(/\bdiv\b/gi, '/');
                appendGo(`    return ${expr}`);
                continue;
            }

            // Const declaration: const PI = 3.14
            const constMatch = line.match(/^const\s+([a-zA-Z0-9_]+)\s*=\s*(.+)$/i);
            if (constMatch) {
                const cName = constMatch[1];
                const cVal = constMatch[2].trim();
                if (inSub) {
                    topLevelGo.push(`    const ${cName} = ${cVal}`);
                } else {
                    topLevelGo.unshift(`const ${cName} = ${cVal}`);
                }
                continue;
            }

            // Bounded Array declaration: deret : array [1..5] of integer
            const arrDeclMatch = line.match(/^([a-zA-Z0-9_,\s]+)\s*:\s*array\s*\[\s*(-?\d+)\s*\.\.\s*(-?\d+)\s*\]\s*of\s+([a-zA-Z0-9_]+)/i);
            if (arrDeclMatch) {
                const names = arrDeclMatch[1].split(',').map(s => s.trim()).filter(Boolean);
                const endIdx = parseInt(arrDeclMatch[3], 10) + 1;
                const goType = CodeTranspiler.pseudoToGoType(arrDeclMatch[4]);
                names.forEach(n => declaredVars.add(n));
                appendGo(`    var ${names.join(', ')} [${endIdx}]${goType}`);
                continue;
            }

            // Variable declaration in kamus
            if (inKamus || (!line.includes('<-') && !line.includes(':=') && line.includes(':')) || /^var\b/i.test(line)) {
                if (line.includes(':')) {
                    const [varsPart, typePart] = line.split(':');
                    const vars = varsPart.replace(/^var\b/i, '').split(',').map(v => v.trim()).filter(Boolean);
                    const goType = CodeTranspiler.pseudoToGoType(typePart);

                    vars.forEach(v => declaredVars.add(v));
                    appendGo(`    var ${vars.join(', ')} ${goType}`);
                    continue;
                }
            }

            // Input: input(x) or input(a, b) or read/readln/scan
            if (/^(?:input|baca|masukan|read|readln|scan|scanln)\s*\(/i.test(line)) {
                const match = line.match(/^(?:input|baca|masukan|read|readln|scan|scanln)\s*\((.+?)\)/i);
                if (match) {
                    const args = match[1].split(',').map(s => s.trim().replace(/^&/, ''));
                    const scanArgs = args.map(a => `&${a}`).join(', ');
                    appendGo(`    fmt.Scan(${scanArgs})`);
                    continue;
                }
            }

            // Output: output(...) or write/writeln/print/println
            if (/^(?:output|cetak|tulis|tampilkan|write|writeln|print|println)\s*\(/i.test(line)) {
                const match = line.match(/^(?:output|cetak|tulis|tampilkan|write|writeln|print|println)\s*\((.+?)\)/i);
                if (match) {
                    appendGo(`    fmt.Println(${match[1]})`);
                    continue;
                }
            }

            // If statements: jika ... maka
            if (/^(?:jika|if)\s+(.+?)(?:\s+(?:maka|then))?$/i.test(line)) {
                const match = line.match(/^(?:jika|if)\s+(.+?)(?:\s+(?:maka|then))?$/i);
                let cond = match[1].replace(/\s+(maka|then)$/i, '').trim();
                cond = cond.replace(/\bmod\b/gi, '%');
                cond = cond.replace(/\band\b|\bdan\b/gi, '&&');
                cond = cond.replace(/\bor\b|\batau\b/gi, '||');
                cond = cond.replace(/<>/g, '!=');
                cond = cond.replace(/(?<![<>=!])=(?![=])/g, '==');
                appendGo(`    if ${cond} {`);
                continue;
            }

            if (/^(?:else\s*if|lainnya\s*jika|elseif)\s+(.+?)(?:\s+(?:maka|then))?$/i.test(line)) {
                const match = line.match(/^(?:else\s*if|lainnya\s*jika|elseif)\s+(.+?)(?:\s+(?:maka|then))?$/i);
                let cond = match[1].replace(/\s+(maka|then)$/i, '').trim();
                cond = cond.replace(/\bmod\b/gi, '%').replace(/\band\b|\bdan\b/gi, '&&').replace(/\bor\b|\batau\b/gi, '||');
                cond = cond.replace(/(?<![<>=!])=(?![=])/g, '==');
                appendGo(`    } else if ${cond} {`);
                continue;
            }

            if (/^(?:lainnya|else|selain\s*itu|selainitu)$/i.test(line)) {
                appendGo('    } else {');
                continue;
            }

            if (/^(?:selesai_jika|selesai\s*jika|endif|end\s*if)$/i.test(line)) {
                appendGo('    }');
                continue;
            }

            // For loop: untuk i <- 1 sampai n lakukan (or downto)
            if (/^(?:untuk|for)\s+([a-zA-Z0-9_]+)\s*(?:<-|:=|=|FROM)\s*(.+?)\s+(?:sampai|to|downto|turun\s*ke)\s+(.+?)(?:\s+(?:lakukan|do))?$/i.test(line)) {
                const isDown = /\b(?:downto|turun)\b/i.test(line);
                const match = line.match(/^(?:untuk|for)\s+([a-zA-Z0-9_]+)\s*(?:<-|:=|=|FROM)\s*(.+?)\s+(?:sampai|to|downto|turun\s*ke)\s+(.+?)(?:\s+(?:lakukan|do))?$/i);
                const v = match[1];
                const start = match[2].trim();
                let end = match[3].replace(/\s+(lakukan|do)$/i, '').trim();
                if (isDown) {
                    appendGo(`    for ${v} := ${start}; ${v} >= ${end}; ${v}-- {`);
                } else {
                    appendGo(`    for ${v} := ${start}; ${v} <= ${end}; ${v}++ {`);
                }
                continue;
            }

            if (/^(?:selesai_untuk|selesai\s*untuk|endfor|end\s*for|next(\s+[a-zA-Z0-9_]+)?)$/i.test(line)) {
                appendGo('    }');
                continue;
            }

            // Repeat ... Until
            if (/^(?:repeat|ulangi)$/i.test(line)) {
                appendGo('    for {');
                continue;
            }
            if (/^(?:until|sampai)\s+(.+)$/i.test(line)) {
                const match = line.match(/^(?:until|sampai)\s+(.+)$/i);
                let cond = match[1].trim();
                cond = cond.replace(/\bmod\b/gi, '%').replace(/\band\b|\bdan\b/gi, '&&').replace(/\bor\b|\batau\b/gi, '||');
                cond = cond.replace(/(?<![<>=!])=(?![=])/g, '==');
                appendGo(`        if ${cond} { break }`);
                appendGo('    }');
                continue;
            }

            // While loop: selama ... lakukan
            if (/^(?:selama|while)\s+(.+?)(?:\s+(?:lakukan|do))?$/i.test(line)) {
                const match = line.match(/^(?:selama|while)\s+(.+?)(?:\s+(?:lakukan|do))?$/i);
                let cond = match[1].replace(/\s+(lakukan|do)$/i, '').trim();
                cond = cond.replace(/\bmod\b/gi, '%');
                cond = cond.replace(/\band\b|\bdan\b/gi, '&&');
                cond = cond.replace(/\bor\b|\batau\b/gi, '||');
                cond = cond.replace(/<>/g, '!=');
                cond = cond.replace(/(?<![<>=!])=(?![=])/g, '==');
                appendGo(`    for ${cond} {`);
                continue;
            }

            if (/^(?:selesai_selama|selesai\s*selama|endwhile|end\s*while)$/i.test(line)) {
                appendGo('    }');
                continue;
            }

            // Increment / Decrement
            if (/^[a-zA-Z0-9_]+\s*(\+\+|\-\-)$/.test(line)) {
                appendGo('    ' + line);
                continue;
            }

            // Assignment: a <- b or a := b or a = b
            if (line.includes('<-') || line.includes(':=')) {
                let [left, right] = line.split(/<-|:=/).map(s => s.trim());
                right = right.replace(/\bmod\b/gi, '%');
                right = right.replace(/\bdiv\b/gi, '/');
                appendGo(`    ${left} = ${right}`);
                continue;
            }

            // Fallback
            appendGo('    ' + line);
        }

        const out = [
            'package main',
            '',
            'import "fmt"',
            ''
        ];

        if (topLevelGo.length > 0) {
            out.push(...topLevelGo, '');
        }

        out.push('func main() {');
        out.push(...mainGo);
        out.push('}');

        return out.join('\n');
    }

    // Convert Go code to Pseudocode
    static goToPseudocode(goCode) {
        const lines = goCode.split('\n');
        const pseudoLines = [];

        pseudoLines.push('program dari_golang');
        pseudoLines.push('kamus');

        const declaredVars = new Set();
        const subprogramLines = [];
        const bodyLines = [];
        const blockStack = []; // stores 'for' | 'if' | 'while' | 'repeat' | 'function' | 'procedure'
        let currentSub = null; // 'function' | 'procedure' | null

        const goTypeToPseudo = (t) => {
            if (!t) return 'integer';
            const raw = t.trim().toLowerCase();
            if (raw.includes('float')) return 'real';
            if (raw === 'string') return 'string';
            if (raw === 'bool') return 'boolean';
            if (raw === 'byte' || raw === 'rune') return 'char';
            return 'integer';
        };

        const parseGoParamsToPseudo = (rawParams) => {
            if (!rawParams || !rawParams.trim()) return '';
            const parts = rawParams.split(',').map(p => p.trim()).filter(Boolean);
            const result = [];
            parts.forEach(p => {
                const segs = p.split(/\s+/);
                if (segs.length >= 2) {
                    const name = segs[0];
                    const type = segs[1];
                    const isPointer = type.startsWith('*');
                    const cleanType = type.replace(/^\*/, '');
                    const pType = goTypeToPseudo(cleanType);
                    const dir = isPointer ? 'input/output ' : '';
                    result.push(`${dir}${name} : ${pType}`);
                } else {
                    result.push(p);
                }
            });
            return result.join(', ');
        };

        const appendBody = (str) => {
            if (currentSub) {
                subprogramLines.push(str);
            } else {
                bodyLines.push(str);
            }
        };

        for (let rawLine of lines) {
            let line = rawLine.trim();
            if (!line || line.startsWith('//') || /^package\b|^import\b/i.test(line)) {
                continue;
            }

            // func main()
            if (/^func\s+main\s*\(\s*\)/i.test(line)) {
                currentSub = null;
                continue;
            }

            // Top-level Go function / procedure: func name(params) retType {
            const funcMatch = line.match(/^func\s+([a-zA-Z0-9_]+)\s*\((.*?)\)(?:\s+([a-zA-Z0-9_,\s\*\(\)\[\]]+))?\s*\{/);
            if (funcMatch) {
                const fnName = funcMatch[1];
                const rawParams = funcMatch[2] || '';
                const retType = funcMatch[3];
                const pseudoParams = parseGoParamsToPseudo(rawParams);

                if (retType) {
                    currentSub = 'function';
                    blockStack.push('function');
                    const pType = goTypeToPseudo(retType);
                    subprogramLines.push(`    function ${fnName}(${pseudoParams}) -> ${pType}`);
                } else {
                    currentSub = 'procedure';
                    blockStack.push('procedure');
                    subprogramLines.push(`    procedure ${fnName}(${pseudoParams})`);
                }
                continue;
            }

            // Closing brace }
            if (line === '}' || line.startsWith('}')) {
                const closing = blockStack.pop();
                if (closing === 'for') {
                    appendBody('    selesai_untuk');
                } else if (closing === 'if') {
                    appendBody('    selesai_jika');
                } else if (closing === 'while') {
                    appendBody('    selesai_selama');
                } else if (closing === 'function') {
                    subprogramLines.push('    endfunction\n');
                    currentSub = null;
                } else if (closing === 'procedure') {
                    subprogramLines.push('    endprocedure\n');
                    currentSub = null;
                }
                if (line === '}') continue;
                line = line.replace(/^\}\s*/, '');
            }

            // Const: const PI = 3.14
            const constMatch = line.match(/^const\s+([a-zA-Z0-9_]+)\s*=\s*(.+)$/i);
            if (constMatch) {
                pseudoLines.push(`    const ${constMatch[1]} = ${constMatch[2].trim()}`);
                continue;
            }

            // Fixed array declaration: var deret [6]int
            const arrMatch = line.match(/^var\s+([a-zA-Z0-9_,\s]+)\s+\[(\d+)\]([a-zA-Z0-9_]+)/i);
            if (arrMatch) {
                const names = arrMatch[1].trim();
                const maxIdx = Math.max(1, parseInt(arrMatch[2], 10) - 1);
                const pType = goTypeToPseudo(arrMatch[3]);
                names.split(',').forEach(n => declaredVars.add(n.trim()));
                pseudoLines.push(`    ${names} : array [1..${maxIdx}] of ${pType}`);
                continue;
            }

            // Var declaration: var a, b int or var x float64
            const varMatch = line.match(/^var\s+([a-zA-Z0-9_,\s]+)\s+(int|int64|int32|string|float64|float32|bool)/i);
            if (varMatch) {
                const names = varMatch[1].trim();
                const typeStr = varMatch[2].toLowerCase();
                const pseudoType = goTypeToPseudo(typeStr);
                names.split(',').forEach(n => declaredVars.add(n.trim()));
                pseudoLines.push(`    ${names} : ${pseudoType}`);
                continue;
            }

            // Return statement: return x
            if (/^return\b/i.test(line)) {
                appendBody('    ' + line);
                continue;
            }

            // fmt.Scan / fmt.Scanln / fmt.Scanf
            const scanMatch = line.match(/fmt\.(?:Scan|Scanln|Scanf)\s*\((.+?)\)/);
            if (scanMatch) {
                const args = scanMatch[1].split(',').map(s => s.trim().replace(/^&/, ''));
                appendBody(`    input(${args.join(', ')})`);
                continue;
            }

            // fmt.Println(...) / fmt.Printf(...)
            const printMatch = line.match(/fmt\.(?:Println|Print|Printf)\s*\((.+?)\)/);
            if (printMatch) {
                appendBody(`    output(${printMatch[1]})`);
                continue;
            }

            // for loop: for i := 1; i <= n; i++ {
            const forMatch = line.match(/for\s+([a-zA-Z0-9_]+)\s*:=\s*(.+?);\s*\1\s*<=\s*(.+?);\s*\1\+\+\s*\{/);
            if (forMatch) {
                const loopVar = forMatch[1];
                if (!declaredVars.has(loopVar)) {
                    declaredVars.add(loopVar);
                    pseudoLines.push(`    ${loopVar} : integer`);
                }
                appendBody(`    untuk ${loopVar} <- ${forMatch[2].trim()} sampai ${forMatch[3].trim()} lakukan`);
                blockStack.push('for');
                continue;
            }

            // while-style for in Go: for cond {
            const whileMatch = line.match(/^for\s+([^{]+)\s*\{/);
            if (whileMatch && !line.includes(';')) {
                let cond = whileMatch[1].trim();
                appendBody(`    selama ${cond} lakukan`);
                blockStack.push('while');
                continue;
            }

            // if statement: if cond {
            const ifMatch = line.match(/^if\s+([^{]+)\s*\{/);
            if (ifMatch) {
                appendBody(`    jika ${ifMatch[1].trim()} maka`);
                blockStack.push('if');
                continue;
            }

            if (/^else\s*\{/.test(line)) {
                appendBody('    lainnya');
                blockStack.push('if');
                continue;
            }

            // Assignment
            if (line.includes('=') && !line.includes('==') && !line.includes('<=') && !line.includes('>=')) {
                line = line.replace(':=', '<-').replace('=', '<-');
                appendBody('    ' + line);
                continue;
            }

            appendBody('    ' + line);
        }

        // Flush any unclosed blocks
        while (blockStack.length > 0) {
            const closing = blockStack.pop();
            if (closing === 'for') appendBody('    selesai_untuk');
            else if (closing === 'if') appendBody('    selesai_jika');
            else if (closing === 'while') appendBody('    selesai_selama');
            else if (closing === 'function') subprogramLines.push('    endfunction\n');
            else if (closing === 'procedure') subprogramLines.push('    endprocedure\n');
        }

        if (subprogramLines.length > 0) {
            pseudoLines.push('');
            pseudoLines.push(...subprogramLines);
        }

        pseudoLines.push('algoritma');
        pseudoLines.push(...bodyLines);
        pseudoLines.push('endprogram');

        return pseudoLines.join('\n');
    }
}

if (typeof window !== 'undefined') {
    window.GoInterpreter = GoInterpreter;
    window.CodeTranspiler = CodeTranspiler;
}
if (typeof module !== 'undefined') {
    module.exports = { GoInterpreter, CodeTranspiler };
}
