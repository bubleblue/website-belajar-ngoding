/**
 * Pseudocode Engine & AST Interpreter
 * Supports Indonesian & English pseudocode keywords
 * Supports step-by-step execution & variable inspection
 * Features: Case-insensitive variables, Semicolon tolerance,
 * Repeat-Until, For Downto, Array operations, I/O variations (write, readln, scan),
 * and compound assignments.
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

    // Clean and split source code into line objects with semicolon and comment support
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

            // Single line comment // or # outside quotes
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
                } else if (!inQuote && ((char === '/' && line[c + 1] === '/') || char === '#')) {
                    commentIdx = c;
                    break;
                }
            }
            if (commentIdx !== -1) {
                line = line.substring(0, commentIdx);
            }

            // Split statements by semicolon outside quotes
            const statements = [];
            let current = '';
            inQuote = false;
            qChar = '';
            for (let c = 0; c < line.length; c++) {
                const ch = line[c];
                if ((ch === '"' || ch === "'") && (c === 0 || line[c - 1] !== '\\')) {
                    if (!inQuote) {
                        inQuote = true;
                        qChar = ch;
                    } else if (ch === qChar) {
                        inQuote = false;
                    }
                    current += ch;
                } else if (!inQuote && ch === ';') {
                    if (current.trim()) statements.push(current.trim());
                    current = '';
                } else {
                    current += ch;
                }
            }
            if (current.trim()) statements.push(current.trim());

            for (const stmt of statements) {
                processed.push({
                    lineNum: originalLineNumber,
                    text: stmt,
                    raw: rawLines[i]
                });
            }
        }

        return processed;
    }

    // Compile pseudocode into flat executable instructions with jump targets
    compile(code) {
        this.reset();
        this.lines = this.preprocess(code);
        const instrs = [];

        // Stacks for control flow jumps
        const ifStack = []; // stores { ifInstrIdx, exitJumps: [] }
        const loopStack = []; // stores { type: 'for'|'while'|'repeat', startIdx: number, varName?: string, endExpr?: string, stepExpr?: string }

        let inDeclarasi = false;
        let inAlgoritma = false;

        const outRegex = /^(?:OUTPUT|WRITELN|WRITE|PRINTLN|PRINT|TULISLN|TULIS|CETAKLN|CETAK|TAMPILKANLN|TAMPILKAN)\b/i;
        const outStripRegex = /^(?:OUTPUT|WRITELN|WRITE|PRINTLN|PRINT|TULISLN|TULIS|CETAKLN|CETAK|TAMPILKANLN|TAMPILKAN)\b\s*/i;
        const inRegex = /^(?:INPUT|READLN|READ|BACALN|BACA|SCANLN|SCAN|MASUKKAN|MASUKAN)\b/i;
        const inStripRegex = /^(?:INPUT|READLN|READ|BACALN|BACA|SCANLN|SCAN|MASUKKAN|MASUKAN)\b\s*/i;

        for (let i = 0; i < this.lines.length; i++) {
            const lineObj = this.lines[i];
            const text = lineObj.text;
            const lineNum = lineObj.lineNum;

            if (!text) continue; // blank line

            const upper = text.toUpperCase();

            // Detect program header (e.g. "program #####" or "program nama_program" or "algoritma nama")
            if (/^(PROGRAM|ALGORITMA)\s+[^\s:]+/i.test(text) || /^PROGRAM\b/i.test(text)) {
                continue; // ignore program header
            }
            // Declaration section header (e.g. "kamus", "kamus:", "deklarasi", "deklarasi:")
            if (/^(DEKLARASI|KAMUS)\b/i.test(text)) {
                inDeclarasi = true;
                inAlgoritma = false;
                continue;
            }
            // Execution section header (e.g. "algoritma", "algoritma:", "deskripsi", "deskripsi:", "begin", "mulai", "start")
            if (/^(DESKRIPSI|ALGORITMA|BEGIN|MULAI|START)\b/i.test(text)) {
                inDeclarasi = false;
                inAlgoritma = true;
                continue;
            }
            // Program end (e.g. "endprogram", "end program", "end_program", "selesai", "end")
            if (/^(SELESAI|END|ENDPROGRAM|END_PROGRAM|END\s*PROGRAM)(\.)?$/i.test(upper)) {
                continue;
            }

            // Standalone THEN / MAKA / DO / LAKUKAN on their own line
            if (/^(THEN|MAKA|DO|LAKUKAN)$/i.test(text)) {
                continue;
            }

            // Variable declaration lines (e.g. "VAR a, b : integer" or "x : integer" or "var n, a, b int")
            if (inDeclarasi || (!inAlgoritma && text.includes(':')) || /^VAR\b/i.test(text)) {
                if (text.includes(':')) {
                    const cleanDecl = text.replace(/^VAR\b/i, '').trim();
                    const [varsPart, typePart] = cleanDecl.split(':');
                    const vars = varsPart.split(',').map(v => v.trim()).filter(Boolean);
                    const type = (typePart || '').trim().toLowerCase();
                    vars.forEach(v => {
                        let defaultVal = 0;
                        if (type.includes('string') || type.includes('teks') || type.includes('char')) defaultVal = '';
                        else if (type.includes('bool')) defaultVal = false;
                        else if (type.includes('real') || type.includes('float') || type.includes('desimal')) defaultVal = 0.0;
                        else if (type.includes('array') || type.includes('larik')) defaultVal = {};
                        this.env[v] = defaultVal;
                    });
                    continue;
                }

                // Go-style: var x int or var a, b int
                const goDeclMatch = text.match(/^VAR\s+([a-zA-Z0-9_,\s]+)\s+(int|int32|int64|float|float32|float64|string|bool|bilangan|desimal|teks|boolean)\b/i);
                if (goDeclMatch) {
                    const vars = goDeclMatch[1].split(',').map(v => v.trim()).filter(Boolean);
                    const type = goDeclMatch[2].toLowerCase();
                    vars.forEach(v => {
                        let defaultVal = 0;
                        if (type.includes('string') || type.includes('teks')) defaultVal = '';
                        else if (type.includes('bool')) defaultVal = false;
                        else if (type.includes('float') || type.includes('desimal')) defaultVal = 0.0;
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

            // ELSE IF / LAINNYA JIKA / ELSEIF
            if (/^(ELSE\s*IF|LAINNYA\s*JIKA|ELSEIF)\b/i.test(upper)) {
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

                const match = text.match(/^(?:ELSE\s*IF|LAINNYA\s*JIKA|ELSEIF)\s+(.+?)(?:\s+(?:THEN|MAKA))?$/i);
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
            if (/^(ELSE|LAINNYA|SELAIN\s*ITU|SELAINITU)\b/i.test(upper)) {
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
            if (/^(END\s*IF|SELESAI\s*JIKA|SELESAI_JIKA|ENDIF|END_IF)\b/i.test(upper)) {
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

            // FOR / UNTUK loop (Supports TO, SAMPAI, DOWNTO, TURUN KE, STEP, LANGKAH, DO, LAKUKAN)
            if (/^(FOR|UNTUK)\b/i.test(upper)) {
                const isDownTo = /\b(?:DOWNTO|TURUN\s*KE|TURUN)\b/i.test(text);
                const forMatch = text.match(/^(?:FOR|UNTUK)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:<-|:=|=|FROM)\s*(.+?)\s+(?:TO|SAMPAI|DOWNTO|TURUN\s*KE|TURUN)\s+(.+?)(?:\s+(?:STEP|LANGKAH)\s+(.+?))?(?:\s+(?:DO|LAKUKAN))?$/i);
                if (!forMatch) {
                    throw new Error(`Sintaks FOR tidak valid di baris ${lineNum}. Contoh: FOR i <- 1 TO 10 DO`);
                }
                const varName = forMatch[1];
                const startExpr = forMatch[2].trim();
                let endExpr = forMatch[3].trim().replace(/\s+(DO|LAKUKAN)$/i, '').trim();
                const stepExpr = forMatch[4] ? forMatch[4].trim() : (isDownTo ? '-1' : '1');

                // Instruction 1: Init variable
                instrs.push({
                    type: 'ASSIGN',
                    lineNum,
                    varName,
                    expr: startExpr
                });

                const loopCondIdx = instrs.length;
                // Instruction 2: Check condition
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

            // ENDFOR / SELESAI_UNTUK / NEXT
            if (/^(END\s*FOR|SELESAI\s*UNTUK|SELESAI_UNTUK|ENDFOR|END_FOR|NEXT(\s+[a-zA-Z_][a-zA-Z0-9_]*)?)\b/i.test(upper)) {
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

            // REPEAT / ULANGI loop
            if (/^(REPEAT|ULANGI)\b/i.test(upper)) {
                loopStack.push({
                    type: 'repeat',
                    startIdx: instrs.length
                });
                continue;
            }

            // UNTIL / SAMPAI
            if (/^(UNTIL|SAMPAI)\b/i.test(upper)) {
                if (loopStack.length === 0 || loopStack[loopStack.length - 1].type !== 'repeat') {
                    throw new Error(`UNTIL/SAMPAI tanpa pasangan REPEAT/ULANGI di baris ${lineNum}`);
                }
                const curLoop = loopStack.pop();
                const match = text.match(/^(?:UNTIL|SAMPAI)\s+(.+)$/i);
                if (!match) {
                    throw new Error(`Sintaks UNTIL/SAMPAI tidak valid di baris ${lineNum}`);
                }
                const condition = match[1].trim();
                // REPEAT-UNTIL: jumps back if condition is FALSE
                instrs.push({
                    type: 'JUMP_IF_FALSE',
                    lineNum,
                    condition,
                    target: curLoop.startIdx
                });
                continue;
            }

            // WHILE / SELAMA loop
            if (/^(WHILE|SELAMA)\b/i.test(upper)) {
                const whileMatch = text.match(/^(?:WHILE|SELAMA)\s+(.+?)(?:\s+(?:DO|LAKUKAN))?$/i);
                if (!whileMatch) {
                    throw new Error(`Sintaks WHILE tidak valid di baris ${lineNum}`);
                }
                let condition = whileMatch[1].trim().replace(/\s+(DO|LAKUKAN)$/i, '').trim();

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
            if (/^(END\s*WHILE|SELESAI\s*SELAMA|SELESAI_SELAMA|ENDWHILE|END_WHILE)\b/i.test(upper)) {
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

            // INPUT / BACA / READ / READLN / SCAN / SCANLN / MASUKKAN
            if (inRegex.test(upper)) {
                const content = text.replace(inStripRegex, '').replace(/^\(|\)$/g, '').trim();
                const vars = content.split(',').map(s => s.trim().replace(/^&/, '')).filter(Boolean);
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

            // OUTPUT / WRITE / WRITELN / PRINT / PRINTLN / TULIS / CETAK / TAMPILKAN
            if (outRegex.test(upper)) {
                let content = text.replace(outStripRegex, '').trim();
                // strip enclosing parentheses if whole line is wrapped like TULIS(...)
                if (content.startsWith('(') && content.endsWith(')')) {
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

            // Increment / Decrement: i++ or i--
            const incDecMatch = text.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*(\+\+|\-\-)$/);
            if (incDecMatch) {
                const varName = incDecMatch[1];
                const op = incDecMatch[2] === '++' ? '+' : '-';
                instrs.push({
                    type: 'ASSIGN',
                    lineNum,
                    varName,
                    expr: `${varName} ${op} 1`
                });
                continue;
            }

            // Compound Assignment: var += expr, var -= expr, etc.
            const compoundMatch = text.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*(\+=|\-=|\*=|\/=)\s*(.+)$/);
            if (compoundMatch) {
                const varName = compoundMatch[1];
                const op = compoundMatch[2][0];
                const rightExpr = compoundMatch[3].trim();
                instrs.push({
                    type: 'ASSIGN',
                    lineNum,
                    varName,
                    expr: `${varName} ${op} (${rightExpr})`
                });
                continue;
            }

            // Array Assignment: A[i] <- expr
            const arrayAssignMatch = text.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*\[(.+?)\]\s*(?:<-|:=|=)\s*(.+)$/);
            if (arrayAssignMatch) {
                const arrName = arrayAssignMatch[1];
                const indexExpr = arrayAssignMatch[2].trim();
                const expr = arrayAssignMatch[3].trim();
                instrs.push({
                    type: 'ASSIGN_ARRAY',
                    lineNum,
                    arrName,
                    indexExpr,
                    expr
                });
                continue;
            }

            // Regular Assignment: var <- expr OR var := expr OR var = expr
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

            // If we don't recognize it, throw clear syntax error
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

        // Strip trailing semicolon if present
        clean = clean.replace(/;\s*$/, '');

        // Replace Pseudocode keywords with JS equivalents safely
        // 1. Strings replacement placeholders to prevent keyword replacements inside strings
        const stringLiterals = [];
        clean = clean.replace(/(["'])(?:(?=(\\?))\2.)*?\1/g, (match) => {
            stringLiterals.push(match);
            return `__STR_${stringLiterals.length - 1}__`;
        });

        // 2. Modulo & integer division
        clean = clean.replace(/\bMOD\b/gi, '%');
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

        // Comparison operators: = into === (except <=, >=, !=, ==)
        clean = clean.replace(/<>/g, '!=');
        clean = clean.replace(/(?<![<>=!])=(?![=])/g, '===');

        // Boolean values
        clean = clean.replace(/\b(BENAR|TRUE)\b/gi, 'true');
        clean = clean.replace(/\b(SALAH|FALSE)\b/gi, 'false');

        // Restore string literals
        stringLiterals.forEach((str, idx) => {
            clean = clean.replace(`__STR_${idx}__`, str);
        });

        // Case-insensitive variable resolution
        const envKeys = Object.keys(this.env);
        envKeys.forEach(k => {
            const regex = new RegExp(`\\b${k}\\b`, 'gi');
            clean = clean.replace(regex, k);
        });

        // Construct safe evaluation scope
        try {
            const varNames = Object.keys(this.env);
            const varValues = varNames.map(k => this.env[k]);

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
                const lowerVar = instr.varName.toLowerCase();
                let realKey = Object.keys(this.env).find(k => k.toLowerCase() === lowerVar) || instr.varName;
                this.env[realKey] = val;
                this.ip++;
                if (this.onEnvChange) this.onEnvChange(this.env);
                break;
            }
            case 'ASSIGN_ARRAY': {
                const idx = this.evalExpression(instr.indexExpr);
                const val = this.evalExpression(instr.expr);
                const lowerArr = instr.arrName.toLowerCase();
                let realKey = Object.keys(this.env).find(k => k.toLowerCase() === lowerArr) || instr.arrName;
                if (!this.env[realKey] || typeof this.env[realKey] !== 'object') {
                    this.env[realKey] = {};
                }
                this.env[realKey][idx] = val;
                this.ip++;
                if (this.onEnvChange) this.onEnvChange(this.env);
                break;
            }
            case 'INPUT': {
                const lowerVar = instr.varName.toLowerCase();
                let realKey = Object.keys(this.env).find(k => k.toLowerCase() === lowerVar) || instr.varName;

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
                    this.env[realKey] = val;
                    this.ip++;
                    if (this.onEnvChange) this.onEnvChange(this.env);
                } else {
                    // Need user input!
                    this.status = 'waiting_input';
                    this.waitingForInput = realKey;
                    return { done: false, waitingInput: true, varName: realKey, lineNum: curLine };
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
                const lowerVar = instr.varName.toLowerCase();
                let realKey = Object.keys(this.env).find(k => k.toLowerCase() === lowerVar) || instr.varName;
                const curVal = this.env[realKey];
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
                const lowerVar = instr.varName.toLowerCase();
                let realKey = Object.keys(this.env).find(k => k.toLowerCase() === lowerVar) || instr.varName;
                const stepVal = Number(this.evalExpression(instr.stepExpr));
                this.env[realKey] = (Number(this.env[realKey]) || 0) + stepVal;
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
        let str = String(val).trim();
        // Support space-separated input buffering
        const parts = str.split(/\s+/);
        const firstVal = parts[0];
        if (parts.length > 1) {
            this.inputQueue.push(...parts.slice(1));
        }

        let parsedVal = firstVal;
        const normalized = firstVal.replace(',', '.');
        if (/^-?\d+$/.test(normalized)) parsedVal = parseInt(normalized, 10);
        else if (/^-?\d+\.\d+$/.test(normalized)) parsedVal = parseFloat(normalized);

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

if (typeof window !== 'undefined') {
    window.PseudocodeInterpreter = PseudocodeInterpreter;
}
if (typeof module !== 'undefined') {
    module.exports = { PseudocodeInterpreter };
}
