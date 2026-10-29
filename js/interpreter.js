/**
 * Pseudocode Engine & AST Interpreter
 * Supports Indonesian & English pseudocode keywords
 * Supports step-by-step execution & variable inspection
 */

class PseudocodeInterpreter {
    constructor() {
        this.reset();
    }

    reset() {
        this.lines = [];
        this.instructions = [];
        this.ip = 0; // instruction pointer
        this.env = {}; // variable storage
        this.output = [];
        this.inputQueue = [];
        this.waitingForInput = null; // callback or varName when waiting for user
        this.status = 'idle'; // 'idle', 'running', 'paused', 'waiting_input', 'finished', 'error'
        this.error = null;
        this.maxSteps = 15000; // prevent infinite loops
        this.stepCount = 0;
        this.onOutput = null; // hook for live output
        this.onEnvChange = null; // hook for variable table update
        this.onLineChange = null; // hook for line highlight
    }

    // Clean and split source code into line objects
    preprocess(code) {
        const rawLines = code.split('\n');
        const processed = [];

        let inMultiComment = false;

        for (let i = 0; i < rawLines.length; i++) {
            let line = rawLines[i];
            const originalLineNumber = i + 1;

            // Handle Pascal-style { comment }
            line = line.replace(/\{[^}]*\}/g, ' ');

            // Handle multi-line /* ... */
            if (inMultiComment) {
                const endIdx = line.indexOf('*/');
                if (endIdx !== -1) {
                    inMultiComment = false;
                    line = line.substring(endIdx + 2);
                } else {
                    continue;
                }
            }

            const multiStartIdx = line.indexOf('/*');
            if (multiStartIdx !== -1) {
                const multiEndIdx = line.indexOf('*/', multiStartIdx + 2);
                if (multiEndIdx !== -1) {
                    line = line.substring(0, multiStartIdx) + ' ' + line.substring(multiEndIdx + 2);
                } else {
                    line = line.substring(0, multiStartIdx);
                    inMultiComment = true;
                }
            }

            // Single line comment // outside quotes
            let inQuote = false;
            let qChar = '';
            let commentIdx = -1;
            for (let c = 0; c < line.length; c++) {
                const char = line[c];
                if ((char === '"' || char === "'") && (c === 0 || line[c - 1] !== '\\')) {
                    if (!inQuote) {
                        inQuote = true;
                        qChar = char;
                    } else if (char === qChar) {
                        inQuote = false;
                    }
                } else if (!inQuote && char === '/' && line[c + 1] === '/') {
                    commentIdx = c;
                    break;
                }
            }
            if (commentIdx !== -1) {
                line = line.substring(0, commentIdx);
            }

            const trimmed = line.trim();
            processed.push({
                lineNum: originalLineNumber,
                text: trimmed,
                raw: rawLines[i]
            });
        }

        return processed;
    }

    // Compile pseudocode into flat executable instructions with jump targets
    compile(code) {
        this.reset();
        this.lines = this.preprocess(code);
        const instrs = [];

        // Stacks for control flow jumps
        const ifStack = []; // stores { ifInstrIdx, elseInstrIdxList: [], endJumpIndices: [] }
        const loopStack = []; // stores { type: 'for'|'while'|'repeat', startIdx: number, varName?: string, endExpr?: string, stepExpr?: string }

        let inDeclarasi = false;

        for (let i = 0; i < this.lines.length; i++) {
            const lineObj = this.lines[i];
            const text = lineObj.text;
            const lineNum = lineObj.lineNum;

            if (!text) continue; // blank line

            const upper = text.toUpperCase();

            // Detect program header (e.g. "program #####" or "program nama_program" or "algoritma nama")
            if (/^PROGRAM\b/i.test(text) || (/^ALGORITMA\s+[^\s:]+/i.test(text))) {
                continue; // ignore program header
            }
            // Declaration section header (e.g. "kamus", "kamus:", "deklarasi", "deklarasi:")
            if (/^(DEKLARASI|KAMUS)\b/i.test(text)) {
                inDeclarasi = true;
                continue;
            }
            // Execution section header (e.g. "algoritma", "algoritma:", "deskripsi", "deskripsi:", "begin", "mulai")
            if (/^(DESKRIPSI|ALGORITMA|BEGIN|MULAI)\b/i.test(text)) {
                inDeclarasi = false;
                continue;
            }
            // Program end (e.g. "endprogram", "end program", "end_program", "selesai", "end")
            if (/^(SELESAI|END|ENDPROGRAM|END_PROGRAM|END\s*PROGRAM)(\.)?$/i.test(upper)) {
                // Program end
                continue;
            }

            // Variable declaration lines (e.g. "VAR a, b : integer" or "x : integer" or "nama: string")
            if (inDeclarasi || /^VAR\b/i.test(text)) {
                const cleanDecl = text.replace(/^VAR\b/i, '').trim();
                if (cleanDecl.includes(':')) {
                    const [varsPart, typePart] = cleanDecl.split(':');
                    const vars = varsPart.split(',').map(v => v.trim()).filter(Boolean);
                    const type = typePart.trim().toLowerCase();
                    vars.forEach(v => {
                        let defaultVal = 0;
                        if (type.includes('string') || type.includes('teks')) defaultVal = '';
                        else if (type.includes('bool')) defaultVal = false;
                        else if (type.includes('real') || type.includes('float') || type.includes('desimal') || type.includes('pecahan')) defaultVal = 0.0;
                        this.env[v] = defaultVal;
                    });
                    continue;
                }
            }

            // Control structures: IF / JIKA
            if (/^(IF|JIKA)\b/i.test(upper)) {
                const match = text.match(/^(?:IF|JIKA)\s+(.+?)(?:\s+(?:THEN|MAKA))?$/i);
                if (!match) {
                    throw new Error(`Sintaks IF/JIKA tidak valid di baris ${lineNum}: "${text}"`);
                }
                const condition = match[1].replace(/\s+(THEN|MAKA)$/i, '').trim();
                const ifInstrIdx = instrs.length;
                instrs.push({
                    type: 'JUMP_IF_FALSE',
                    lineNum,
                    condition,
                    target: -1 // to be patched
                });
                ifStack.push({
                    ifInstrIdx,
                    exitJumps: []
                });
                continue;
            }

            // ELSE IF / LAINNYA JIKA
            if (/^(ELSE\s*IF|LAINNYA\s*JIKA)\b/i.test(upper)) {
                if (ifStack.length === 0) {
                    throw new Error(`ELSE IF tanpa IF di baris ${lineNum}`);
                }
                const curIf = ifStack[ifStack.length - 1];

                // Jump from previous branch to after ENDIF
                const exitJumpIdx = instrs.length;
                instrs.push({
                    type: 'JUMP',
                    lineNum,
                    target: -1
                });
                curIf.exitJumps.push(exitJumpIdx);

                // Patch previous conditional jump to here
                instrs[curIf.ifInstrIdx].target = instrs.length;

                const match = text.match(/^(?:ELSE\s*IF|LAINNYA\s*JIKA)\s+(.+?)(?:\s+(?:THEN|MAKA))?$/i);
                if (!match) {
                    throw new Error(`Sintaks ELSE IF tidak valid di baris ${lineNum}`);
                }
                const condition = match[1].replace(/\s+(THEN|MAKA)$/i, '').trim();
                curIf.ifInstrIdx = instrs.length;
                instrs.push({
                    type: 'JUMP_IF_FALSE',
                    lineNum,
                    condition,
                    target: -1
                });
                continue;
            }

            // ELSE / LAINNYA / SELAIN_ITU
            if (/^(ELSE|LAINNYA|SELAIN\s*ITU)\b/i.test(upper)) {
                if (ifStack.length === 0) {
                    throw new Error(`ELSE tanpa IF di baris ${lineNum}`);
                }
                const curIf = ifStack[ifStack.length - 1];

                // Jump from previous branch to after ENDIF
                const exitJumpIdx = instrs.length;
                instrs.push({
                    type: 'JUMP',
                    lineNum,
                    target: -1
                });
                curIf.exitJumps.push(exitJumpIdx);

                // Patch previous conditional jump to this ELSE start
                instrs[curIf.ifInstrIdx].target = instrs.length;
                curIf.ifInstrIdx = -1; // no more conditions to patch
                continue;
            }

            // ENDIF / SELESAI_JIKA / END IF
            if (/^(END\s*IF|SELESAI\s*JIKA|SELESAI_JIKA|ENDIF)\b/i.test(upper)) {
                if (ifStack.length === 0) {
                    throw new Error(`ENDIF tanpa pasangan IF di baris ${lineNum}`);
                }
                const curIf = ifStack.pop();
                const afterEndif = instrs.length;

                if (curIf.ifInstrIdx !== -1) {
                    instrs[curIf.ifInstrIdx].target = afterEndif;
                }
                for (const exitIdx of curIf.exitJumps) {
                    instrs[exitIdx].target = afterEndif;
                }
                continue;
            }

            // FOR / UNTUK loop
            // FOR i <- 1 TO 10 DO / UNTUK i <- 1 SAMPAI 10 LAKUKAN
            if (/^(FOR|UNTUK)\b/i.test(upper)) {
                // Match "FOR var <- start TO end [STEP step] [DO]"
                const forMatch = text.match(/^(?:FOR|UNTUK)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:<-|:=|=)\s*(.+?)\s+(?:TO|SAMPAI)\s+(.+?)(?:\s+(?:STEP|LANGKAH)\s+(.+?))?(?:\s+(?:DO|LAKUKAN))?$/i);
                if (!forMatch) {
                    throw new Error(`Sintaks FOR tidak valid di baris ${lineNum}. Contoh: FOR i <- 1 TO 10 DO`);
                }
                const varName = forMatch[1];
                const startExpr = forMatch[2].trim();
                let endExpr = forMatch[3].trim();
                // strip trailing DO/LAKUKAN if present in endExpr
                endExpr = endExpr.replace(/\s+(DO|LAKUKAN)$/i, '').trim();
                const stepExpr = forMatch[4] ? forMatch[4].trim() : '1';

                // Instruction 1: Init variable
                instrs.push({
                    type: 'ASSIGN',
                    lineNum,
                    varName,
                    expr: startExpr
                });

                const loopCondIdx = instrs.length;
                // Instruction 2: Check condition (i <= end)
                instrs.push({
                    type: 'FOR_CHECK',
                    lineNum,
                    varName,
                    endExpr,
                    stepExpr,
                    target: -1 // to be patched
                });

                loopStack.push({
                    type: 'for',
                    startIdx: loopCondIdx,
                    varName,
                    stepExpr
                });
                continue;
            }

            // ENDFOR / SELESAI_UNTUK
            if (/^(END\s*FOR|SELESAI\s*UNTUK|SELESAI_UNTUK|ENDFOR)\b/i.test(upper)) {
                if (loopStack.length === 0 || loopStack[loopStack.length - 1].type !== 'for') {
                    throw new Error(`ENDFOR tanpa pasangan FOR di baris ${lineNum}`);
                }
                const curLoop = loopStack.pop();

                // Increment step instruction
                instrs.push({
                    type: 'FOR_STEP',
                    lineNum,
                    varName: curLoop.varName,
                    stepExpr: curLoop.stepExpr
                });

                // Jump back to check
                instrs.push({
                    type: 'JUMP',
                    lineNum,
                    target: curLoop.startIdx
                });

                // Patch FOR_CHECK target to instruction immediately after loop
                instrs[curLoop.startIdx].target = instrs.length;
                continue;
            }

            // WHILE / SELAMA loop
            // WHILE <condition> DO / SELAMA <condition> LAKUKAN
            if (/^(WHILE|SELAMA)\b/i.test(upper)) {
                const whileMatch = text.match(/^(?:WHILE|SELAMA)\s+(.+?)(?:\s+(?:DO|LAKUKAN))?$/i);
                if (!whileMatch) {
                    throw new Error(`Sintaks WHILE tidak valid di baris ${lineNum}`);
                }
                let condition = whileMatch[1].trim();
                condition = condition.replace(/\s+(DO|LAKUKAN)$/i, '').trim();

                const loopCondIdx = instrs.length;
                instrs.push({
                    type: 'JUMP_IF_FALSE',
                    lineNum,
                    condition,
                    target: -1
                });

                loopStack.push({
                    type: 'while',
                    startIdx: loopCondIdx
                });
                continue;
            }

            // ENDWHILE / SELESAI_SELAMA
            if (/^(END\s*WHILE|SELESAI\s*SELAMA|SELESAI_SELAMA|ENDWHILE)\b/i.test(upper)) {
                if (loopStack.length === 0 || loopStack[loopStack.length - 1].type !== 'while') {
                    throw new Error(`ENDWHILE tanpa pasangan WHILE di baris ${lineNum}`);
                }
                const curLoop = loopStack.pop();

                // Jump back to condition
                instrs.push({
                    type: 'JUMP',
                    lineNum,
                    target: curLoop.startIdx
                });

                // Patch while condition false target
                instrs[curLoop.startIdx].target = instrs.length;
                continue;
            }

            // INPUT / BACA / READ
            if (/^(INPUT|BACA|READ|MASUKKAN)\b/i.test(upper)) {
                // e.g. INPUT x, y or INPUT(x)
                const content = text.replace(/^(?:INPUT|BACA|READ|MASUKKAN)\s*/i, '').replace(/^\(|\)$/g, '').trim();
                const vars = content.split(',').map(s => s.trim()).filter(Boolean);
                if (vars.length === 0) {
                    throw new Error(`Perintah INPUT memerlukan variabel di baris ${lineNum}`);
                }
                for (const v of vars) {
                    instrs.push({
                        type: 'INPUT',
                        lineNum,
                        varName: v
                    });
                }
                continue;
            }

            // OUTPUT / TULIS / PRINT / CETAK / TAMPILKAN
            if (/^(OUTPUT|TULIS|PRINT|CETAK|TAMPILKAN)\b/i.test(upper)) {
                let content = text.replace(/^(?:OUTPUT|TULIS|PRINT|CETAK|TAMPILKAN)\s*/i, '').trim();
                // strip enclosing parentheses if whole line is wrapped like TULIS(...)
                if (content.startsWith('(') && content.endsWith(')')) {
                    // Check if parentheses balance internally
                    let depth = 0;
                    let balanced = true;
                    for (let c = 0; c < content.length - 1; c++) {
                        if (content[c] === '(') depth++;
                        else if (content[c] === ')') depth--;
                        if (depth === 0) { balanced = false; break; }
                    }
                    if (balanced) {
                        content = content.slice(1, -1).trim();
                    }
                }

                instrs.push({
                    type: 'OUTPUT',
                    lineNum,
                    rawContent: content
                });
                continue;
            }

            // ASSIGNMENT: var <- expr OR var := expr OR var = expr
            const assignMatch = text.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:<-|:=|=)\s*(.+)$/);
            if (assignMatch) {
                const varName = assignMatch[1].trim();
                const expr = assignMatch[2].trim();
                instrs.push({
                    type: 'ASSIGN',
                    lineNum,
                    varName,
                    expr
                });
                continue;
            }

            // If we don't recognize it, could be an unknown command or invalid syntax
            throw new Error(`Sintaks tidak dikenali di baris ${lineNum}: "${text}"`);
        }

        if (ifStack.length > 0) {
            throw new Error(`Ada blok IF/JIKA yang belum ditutup dengan ENDIF/SELESAI_JIKA`);
        }
        if (loopStack.length > 0) {
            const top = loopStack[loopStack.length - 1];
            throw new Error(`Ada blok perulangan (${top.type.toUpperCase()}) yang belum ditutup`);
        }

        this.instructions = instrs;
        this.status = 'ready';
        return instrs;
    }

    // Split comma-separated arguments in OUTPUT, respecting quotes and parentheses
    splitOutputArgs(raw) {
        const args = [];
        let current = '';
        let inQuotes = false;
        let quoteChar = '';
        let parenDepth = 0;

        for (let i = 0; i < raw.length; i++) {
            const ch = raw[i];

            if ((ch === '"' || ch === "'") && (i === 0 || raw[i - 1] !== '\\')) {
                if (!inQuotes) {
                    inQuotes = true;
                    quoteChar = ch;
                } else if (ch === quoteChar) {
                    inQuotes = false;
                }
                current += ch;
            } else if (!inQuotes && ch === '(') {
                parenDepth++;
                current += ch;
            } else if (!inQuotes && ch === ')') {
                parenDepth = Math.max(0, parenDepth - 1);
                current += ch;
            } else if (!inQuotes && parenDepth === 0 && ch === ',') {
                if (current.trim()) {
                    args.push(current.trim());
                }
                current = '';
            } else {
                current += ch;
            }
        }
        if (current.trim()) {
            args.push(current.trim());
        }
        return args;
    }

    // Evaluate an expression string with variable context
    evalExpression(expr) {
        if (typeof expr !== 'string') return expr;
        let clean = expr.trim();
        if (!clean) return 0;

        // Replace Pseudocode keywords with JS equivalents safely
        // 1. Strings replacement placeholders to prevent keyword replacements inside strings
        const stringLiterals = [];
        clean = clean.replace(/(["'])(?:(?=(\\?))\2.)*?\1/g, (match) => {
            stringLiterals.push(match);
            return `__STR_${stringLiterals.length - 1}__`;
        });

        // 2. Modulo & integer division
        // MOD or % -> %
        clean = clean.replace(/\bMOD\b/gi, '%');
        // DIV -> Math.floor(a / b) - we can replace a DIV b with Math.floor((a)/(b)) or helper
        clean = clean.replace(/([a-zA-Z0-9_().]+)\s+\bDIV\b\s+([a-zA-Z0-9_().]+)/gi, 'Math.floor(($1)/($2))');

        // Exponentiation ^ -> **
        clean = clean.replace(/\^/g, '**');

        // Logical operators
        clean = clean.replace(/\bAND\b/gi, '&&');
        clean = clean.replace(/\bDAN\b/gi, '&&');
        clean = clean.replace(/\bOR\b/gi, '||');
        clean = clean.replace(/\bATAU\b/gi, '||');
        clean = clean.replace(/\bNOT\b/gi, '!');
        clean = clean.replace(/\bBUKAN\b/gi, '!');

        // Comparison operators: = into == (except <=, >=, !=, ==)
        // First convert <> to !=
        clean = clean.replace(/<>/g, '!=');
        // Convert single = to == (if not already part of ==, <=, >=, !=)
        clean = clean.replace(/(?<![<>=!])=(?![=])/g, '===');

        // Boolean values
        clean = clean.replace(/\b(BENAR|TRUE)\b/gi, 'true');
        clean = clean.replace(/\b(SALAH|FALSE)\b/gi, 'false');

        // Restore string literals
        stringLiterals.forEach((str, idx) => {
            clean = clean.replace(`__STR_${idx}__`, str);
        });

        // Construct safe evaluation scope
        try {
            const varNames = Object.keys(this.env);
            const varValues = varNames.map(k => this.env[k]);
            
            // Standard Math functions available
            const scopeMath = {
                abs: Math.abs,
                sqrt: Math.sqrt,
                round: Math.round,
                floor: Math.floor,
                ceil: Math.ceil,
                min: Math.min,
                max: Math.max
            };

            const fn = new Function(...varNames, 'Math', `"use strict"; return (${clean});`);
            const res = fn(...varValues, Math);
            return res;
        } catch (err) {
            throw new Error(`Gagal mengevaluasi ekspresi: "${expr}". (${err.message})`);
        }
    }

    // Prepare for execution
    initExecution(inputData = []) {
        this.ip = 0;
        this.output = [];
        this.inputQueue = [...inputData];
        this.stepCount = 0;
        this.status = 'running';
        this.error = null;
    }

    // Step forward one instruction. Returns { done: boolean, waitingInput: boolean, lineNum: number }
    step() {
        if (this.status === 'finished' || this.status === 'error') {
            return { done: true, lineNum: null };
        }

        if (this.ip >= this.instructions.length) {
            this.status = 'finished';
            return { done: true, lineNum: null };
        }

        this.stepCount++;
        if (this.stepCount > this.maxSteps) {
            this.status = 'error';
            this.error = `Batas perulangan maksimum (${this.maxSteps}) terlampaui. Kemungkinan ada Infinite Loop!`;
            throw new Error(this.error);
        }

        const instr = this.instructions[this.ip];
        const curLine = instr.lineNum;

        if (this.onLineChange) {
            this.onLineChange(curLine);
        }

        switch (instr.type) {
            case 'ASSIGN': {
                const val = this.evalExpression(instr.expr);
                this.env[instr.varName] = val;
                this.ip++;
                if (this.onEnvChange) this.onEnvChange(this.env);
                break;
            }
            case 'INPUT': {
                if (this.inputQueue.length > 0) {
                    const rawVal = this.inputQueue.shift();
                    let val = rawVal;
                    // Attempt auto-parsing number
                    if (typeof rawVal === 'string') {
                        const trimmed = rawVal.trim();
                        const normalized = trimmed.replace(',', '.');
                        if (/^-?\d+$/.test(normalized)) {
                            val = parseInt(normalized, 10);
                        } else if (/^-?\d+\.\d+$/.test(normalized)) {
                            val = parseFloat(normalized);
                        }
                    }
                    this.env[instr.varName] = val;
                    this.ip++;
                    if (this.onEnvChange) this.onEnvChange(this.env);
                } else {
                    // Need user input!
                    this.status = 'waiting_input';
                    this.waitingForInput = instr.varName;
                    return { done: false, waitingInput: true, varName: instr.varName, lineNum: curLine };
                }
                break;
            }
            case 'OUTPUT': {
                const argStrings = this.splitOutputArgs(instr.rawContent);
                const evaluatedParts = argStrings.map(arg => {
                    const val = this.evalExpression(arg);
                    return val === undefined ? '' : String(val);
                });
                const lineOutput = evaluatedParts.join('');
                this.output.push(lineOutput);
                this.ip++;
                if (this.onOutput) this.onOutput(lineOutput);
                break;
            }
            case 'JUMP': {
                this.ip = instr.target;
                break;
            }
            case 'JUMP_IF_FALSE': {
                const condRes = Boolean(this.evalExpression(instr.condition));
                if (!condRes) {
                    this.ip = instr.target;
                } else {
                    this.ip++;
                }
                break;
            }
            case 'FOR_CHECK': {
                const curVal = this.env[instr.varName];
                const endVal = Number(this.evalExpression(instr.endExpr));
                const stepVal = Number(this.evalExpression(instr.stepExpr));
                const willContinue = stepVal >= 0 ? (curVal <= endVal) : (curVal >= endVal);
                if (!willContinue) {
                    this.ip = instr.target;
                } else {
                    this.ip++;
                }
                break;
            }
            case 'FOR_STEP': {
                const stepVal = Number(this.evalExpression(instr.stepExpr));
                this.env[instr.varName] = (Number(this.env[instr.varName]) || 0) + stepVal;
                this.ip++;
                if (this.onEnvChange) this.onEnvChange(this.env);
                break;
            }
            default:
                this.ip++;
                break;
        }

        const isFinished = this.ip >= this.instructions.length;
        if (isFinished) {
            this.status = 'finished';
        }

        return {
            done: isFinished,
            waitingInput: false,
            lineNum: isFinished ? null : (this.instructions[this.ip] ? this.instructions[this.ip].lineNum : null)
        };
    }

    // Supply input when waiting_input
    provideInput(val) {
        if (this.status !== 'waiting_input' || !this.waitingForInput) return;
        let parsedVal = val;
        if (typeof val === 'string') {
            const trimmed = val.trim();
            const normalized = trimmed.replace(',', '.');
            if (/^-?\d+$/.test(normalized)) parsedVal = parseInt(normalized, 10);
            else if (/^-?\d+\.\d+$/.test(normalized)) parsedVal = parseFloat(normalized);
        }
        this.env[this.waitingForInput] = parsedVal;
        this.waitingForInput = null;
        this.status = 'running';
        this.ip++;
        if (this.onEnvChange) this.onEnvChange(this.env);
    }

    // Execute complete code with given inputs synchronously
    runAll(inputData = []) {
        this.initExecution(inputData);
        while (this.status === 'running') {
            const stepRes = this.step();
            if (stepRes.waitingInput) {
                throw new Error(`Program meminta input '${stepRes.varName}' tetapi tidak ada data input yang diberikan.`);
            }
            if (stepRes.done) break;
        }
        return {
            output: this.output,
            env: { ...this.env },
            steps: this.stepCount
        };
    }
}

window.PseudocodeInterpreter = PseudocodeInterpreter;
