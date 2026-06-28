(function () {
    let lastAnswerSource = "not asked yet";

    const profile = {
        name: "Aarush",
        strengths: "algebra",
        goals: "AMC-8 and MATHCOUNTS",
        growthAreas: "counting, number theory, sequences, probability, and circle geometry"
    };

    function formatNumber(value) {
        if (!Number.isFinite(value)) {
            return "undefined";
        }

        const rounded = Math.round(value * 1000000) / 1000000;
        return Number.isInteger(rounded) ? String(rounded) : String(rounded);
    }

    function extractNumbers(text) {
        return (text.match(/-?\d+(\.\d+)?/g) || []).map(Number);
    }

    function nearlyEqual(a, b) {
        return Math.abs(a - b) < 0.000001;
    }

    function parseCoefficient(value) {
        if (value === "" || value === "+") {
            return 1;
        }

        if (value === "-") {
            return -1;
        }

        return Number(value);
    }

    function gcd(a, b) {
        let x = Math.abs(Math.trunc(a));
        let y = Math.abs(Math.trunc(b));

        while (y !== 0) {
            const next = x % y;
            x = y;
            y = next;
        }

        return x;
    }

    function lcm(a, b) {
        if (a === 0 || b === 0) {
            return 0;
        }

        return Math.abs(Math.trunc(a * b)) / gcd(a, b);
    }

    function factorial(n) {
        if (!Number.isInteger(n) || n < 0 || n > 20) {
            return null;
        }

        let total = 1;
        for (let value = 2; value <= n; value += 1) {
            total *= value;
        }

        return total;
    }

    function isPrime(n) {
        if (!Number.isInteger(n) || n < 2) {
            return false;
        }

        for (let factor = 2; factor * factor <= n; factor += 1) {
            if (n % factor === 0) {
                return false;
            }
        }

        return true;
    }

    function factorList(n) {
        const value = Math.abs(Math.trunc(n));
        const factors = [];

        for (let factor = 1; factor * factor <= value; factor += 1) {
            if (value % factor === 0) {
                factors.push(factor);

                if (factor !== value / factor) {
                    factors.push(value / factor);
                }
            }
        }

        return factors.sort((a, b) => a - b);
    }

    function translateExpressionWords(input) {
        return input
            .toLowerCase()
            .replace(/what is|calculate|evaluate/g, "")
            .replace(/multiplied by|times/g, "*")
            .replace(/divided by|over/g, "/")
            .replace(/plus/g, "+")
            .replace(/minus/g, "-")
            .replace(/\?/g, "");
    }

    function tokenizeExpression(expression) {
        const cleaned = expression
            .replace(/[xX]/g, "*")
            .replace(/×/g, "*")
            .replace(/÷/g, "/")
            .replace(/\s+/g, "");

        if (!/^[0-9+\-*/().^%]+$/.test(cleaned)) {
            return null;
        }

        const tokens = [];
        let index = 0;
        let expectsValue = true;

        while (index < cleaned.length) {
            const char = cleaned[index];
            const next = cleaned[index + 1];

            if ((char === "-" || char === "+") && expectsValue && /[0-9.]/.test(next)) {
                let number = char;
                index += 1;

                while (index < cleaned.length && /[0-9.]/.test(cleaned[index])) {
                    number += cleaned[index];
                    index += 1;
                }

                tokens.push(Number(number));
                expectsValue = false;
                continue;
            }

            if (/[0-9.]/.test(char)) {
                let number = "";

                while (index < cleaned.length && /[0-9.]/.test(cleaned[index])) {
                    number += cleaned[index];
                    index += 1;
                }

                tokens.push(Number(number));
                expectsValue = false;
                continue;
            }

            if (char === "(") {
                tokens.push(char);
                expectsValue = true;
                index += 1;
                continue;
            }

            if (char === ")") {
                tokens.push(char);
                expectsValue = false;
                index += 1;
                continue;
            }

            tokens.push(char);
            expectsValue = true;
            index += 1;
        }

        return tokens.every((token) => typeof token === "number" ? Number.isFinite(token) : true)
            ? tokens
            : null;
    }

    function evaluateExpression(expression) {
        const tokens = tokenizeExpression(expression);

        if (!tokens) {
            return null;
        }

        const precedence = {
            "^": 4,
            "*": 3,
            "/": 3,
            "%": 3,
            "+": 2,
            "-": 2
        };
        const rightAssociative = new Set(["^"]);
        const output = [];
        const operators = [];

        tokens.forEach((token) => {
            if (typeof token === "number") {
                output.push(token);
                return;
            }

            if (token === "(") {
                operators.push(token);
                return;
            }

            if (token === ")") {
                while (operators.length && operators[operators.length - 1] !== "(") {
                    output.push(operators.pop());
                }

                operators.pop();
                return;
            }

            while (
                operators.length &&
                operators[operators.length - 1] !== "(" &&
                (
                    precedence[operators[operators.length - 1]] > precedence[token] ||
                    (
                        precedence[operators[operators.length - 1]] === precedence[token] &&
                        !rightAssociative.has(token)
                    )
                )
            ) {
                output.push(operators.pop());
            }

            operators.push(token);
        });

        while (operators.length) {
            output.push(operators.pop());
        }

        const stack = [];

        output.forEach((token) => {
            if (typeof token === "number") {
                stack.push(token);
                return;
            }

            const b = stack.pop();
            const a = stack.pop();

            if (token === "+") stack.push(a + b);
            if (token === "-") stack.push(a - b);
            if (token === "*") stack.push(a * b);
            if (token === "/") stack.push(a / b);
            if (token === "%") stack.push(a % b);
            if (token === "^") stack.push(a ** b);
        });

        return stack.length === 1 && Number.isFinite(stack[0]) ? stack[0] : null;
    }

    function answerLinear(question) {
        const equation = question.toLowerCase().replace(/\s+/g, "").replace(/−/g, "-");

        if (equation.includes("x^2") || equation.includes("x²")) {
            return null;
        }

        const match = equation.match(/([+-]?\d*\.?\d*)x([+-]\d+\.?\d*)?=([+-]?\d+\.?\d*)/);

        if (!match) {
            return null;
        }

        const a = parseCoefficient(match[1]);
        const b = match[2] ? Number(match[2]) : 0;
        const c = Number(match[3]);

        if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(c) || a === 0) {
            return null;
        }

        const x = (c - b) / a;

        return [
            `x = ${formatNumber(x)}`,
            "",
            `Steps:`,
            `1. Start with ${match[0]}.`,
            `2. Move the constant: ${formatNumber(a)}x = ${formatNumber(c - b)}.`,
            `3. Divide by ${formatNumber(a)} to get x = ${formatNumber(x)}.`
        ].join("\n");
    }

    function normalizeEquationText(question) {
        return question
            .toLowerCase()
            .replace(/−/g, "-")
            .replace(/²/g, "^2")
            .replace(/\*\*/g, "^")
            .replace(/\s+/g, "")
            .replace(/=o/g, "=0");
    }

    function parseQuadratic(question) {
        const compact = normalizeEquationText(question);
        const match = compact.match(/([+-]?\d*\.?\d*x\^2(?:[+-]\d*\.?\d*x)?(?:[+-]\d+\.?\d*)?)=([+-]?\d+\.?\d*)/);

        if (!match) {
            return null;
        }

        const left = match[1];
        const right = Number(match[2]);
        let a = 0;
        let b = 0;
        let c = -right;
        const terms = left.match(/[+-]?[^+-]+/g) || [];

        terms.forEach((term) => {
            if (term.includes("x^2")) {
                a += parseCoefficient(term.replace("x^2", ""));
            } else if (term.includes("x")) {
                b += parseCoefficient(term.replace("x", ""));
            } else {
                c += Number(term);
            }
        });

        if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(c) || !Number.isFinite(right) || a === 0) {
            return null;
        }

        return {
            a,
            b,
            c,
            display: `${left}=${match[2]}`
        };
    }

    function answerRootExpression(question) {
        const text = question.toLowerCase();
        const quadratic = parseQuadratic(question);

        if (!quadratic || !/(root|roots)/.test(text) || !/r/.test(text) || !/s/.test(text)) {
            return null;
        }

        if (!/(r\^2|r²)/.test(text) || !/(s\^2|s²)/.test(text)) {
            return null;
        }

        const { a, b, c, display } = quadratic;
        const rootSum = -b / a;
        const rootProduct = c / a;
        const answer = rootSum * rootSum - 2 * rootProduct;

        return [
            `Yes. Let's do it step by step without finding the roots directly.`,
            "",
            `Problem: ${display} has roots r and s. Find r^2 + s^2.`,
            "",
            `Plan: Use Vieta's formulas.`,
            `For ax^2 + bx + c = 0:`,
            `r + s = -b/a`,
            `rs = c/a`,
            "",
            `Step 1: Identify a, b, and c.`,
            `a = ${formatNumber(a)}, b = ${formatNumber(b)}, c = ${formatNumber(c)}`,
            "",
            `Step 2: Find r + s.`,
            `r + s = -b/a = -(${formatNumber(b)})/${formatNumber(a)} = ${formatNumber(rootSum)}`,
            "",
            `Step 3: Find rs.`,
            `rs = c/a = ${formatNumber(c)}/${formatNumber(a)} = ${formatNumber(rootProduct)}`,
            "",
            `Step 4: Rewrite r^2 + s^2 using something we know.`,
            `(r + s)^2 = r^2 + 2rs + s^2`,
            `So r^2 + s^2 = (r + s)^2 - 2rs`,
            "",
            `Step 5: Substitute.`,
            `r^2 + s^2 = (${formatNumber(rootSum)})^2 - 2(${formatNumber(rootProduct)})`,
            `r^2 + s^2 = ${formatNumber(rootSum * rootSum)} - ${formatNumber(2 * rootProduct)}`,
            "",
            `Answer: ${formatNumber(answer)}`
        ].join("\n");
    }

    function answerQuadratic(question) {
        const quadratic = parseQuadratic(question);

        if (!quadratic) {
            return null;
        }

        const { a, b, c } = quadratic;
        const discriminant = b * b - 4 * a * c;

        if (discriminant < 0) {
            return [
                `This is a quadratic, so use the quadratic formula.`,
                "",
                `Step 1: Identify a, b, and c.`,
                `a = ${formatNumber(a)}, b = ${formatNumber(b)}, c = ${formatNumber(c)}`,
                "",
                `Step 2: Compute the discriminant.`,
                `b^2 - 4ac = (${formatNumber(b)})^2 - 4(${formatNumber(a)})(${formatNumber(c)}) = ${formatNumber(discriminant)}`,
                "",
                `Since the discriminant is negative, the roots are complex, not real.`,
                `If your problem asks for an expression involving the roots, Vieta's formulas may still work.`
            ].join("\n");
        }

        const rootOne = (-b + Math.sqrt(discriminant)) / (2 * a);
        const rootTwo = (-b - Math.sqrt(discriminant)) / (2 * a);

        return [
            `The solutions are x = ${formatNumber(rootOne)} and x = ${formatNumber(rootTwo)}.`,
            "",
            `I used the quadratic formula with a = ${formatNumber(a)}, b = ${formatNumber(b)}, c = ${formatNumber(c)}.`,
            `Discriminant: b^2 - 4ac = ${formatNumber(discriminant)}.`
        ].join("\n");
    }

    function answerArithmetic(question) {
        const translated = translateExpressionWords(question);
        const hasArithmeticSignal = /[+\-*/^×÷]/.test(translated) || /\b(plus|minus|times|divided|calculate|evaluate|what is)\b/i.test(question);

        if (!hasArithmeticSignal) {
            return null;
        }

        const expression = translated.replace(/[^0-9+\-*/().^%xX×÷\s]/g, "");

        if (!/\d/.test(expression) || !/[+\-*/^xX×÷]/.test(expression)) {
            return null;
        }

        const value = evaluateExpression(expression);

        if (value === null) {
            return null;
        }

        return `I get ${formatNumber(value)}.\n\nQuick check: use parentheses first, then powers, multiplication/division, and addition/subtraction.`;
    }

    function answerCombinatorics(question) {
        const text = question.toLowerCase();
        const nums = extractNumbers(question).map((number) => Math.trunc(number));

        if (/(combination|choose|committee|selection|without order)/.test(text) && nums.length >= 2) {
            const n = nums[0];
            const r = nums[1];
            const total = factorial(n) / (factorial(r) * factorial(n - r));

            if (Number.isFinite(total)) {
                return `Use combinations because order does not matter: C(${n}, ${r}) = ${formatNumber(total)}.`;
            }
        }

        if (/(permutation|arrange|ordered|order matters|ways)/.test(text) && nums.length >= 1) {
            const n = nums[0];

            if (nums.length >= 2) {
                const r = nums[1];
                const total = factorial(n) / factorial(n - r);

                if (Number.isFinite(total)) {
                    return `Use permutations because order matters: P(${n}, ${r}) = ${formatNumber(total)}.`;
                }
            }

            const total = factorial(n);

            if (total !== null) {
                return `If all ${n} objects are different, they can be arranged in ${n}! = ${formatNumber(total)} ways.`;
            }
        }

        return null;
    }

    function answerSequence(question) {
        const text = question.toLowerCase();
        const nums = extractNumbers(question);

        if (!/(sequence|next|pattern)/.test(text) || nums.length < 3) {
            return null;
        }

        const diffs = nums.slice(1).map((value, index) => value - nums[index]);
        const sameDiff = diffs.every((diff) => nearlyEqual(diff, diffs[0]));

        if (sameDiff) {
            const next = nums[nums.length - 1] + diffs[0];
            return `This looks arithmetic: the difference is ${formatNumber(diffs[0])}. The next number is ${formatNumber(next)}.`;
        }

        const ratios = nums.slice(1).map((value, index) => nums[index] === 0 ? null : value / nums[index]);
        const sameRatio = ratios.every((ratio) => ratio !== null && nearlyEqual(ratio, ratios[0]));

        if (sameRatio) {
            const next = nums[nums.length - 1] * ratios[0];
            return `This looks geometric: multiply by ${formatNumber(ratios[0])}. The next number is ${formatNumber(next)}.`;
        }

        return "I do not see a single constant difference or ratio yet. Try checking second differences, alternating patterns, or whether the terms come from squares/cubes.";
    }

    function answerCircle(question) {
        const text = question.toLowerCase();
        const nums = extractNumbers(question);

        if (!/(circle|radius|diameter|circumference|area)/.test(text) || nums.length === 0) {
            return null;
        }

        if (
            nums.length > 1 ||
            /(tangent|secant|chord|segment|intersect|external|point|passes|touches)/.test(text)
        ) {
            return null;
        }

        if (!/(area|circumference)/.test(text)) {
            return null;
        }

        const given = nums[0];
        const radius = text.includes("diameter") ? given / 2 : given;
        const area = Math.PI * radius * radius;
        const circumference = 2 * Math.PI * radius;

        if (text.includes("circumference")) {
            return `Circumference = 2 * pi * r = ${formatNumber(circumference)}.`;
        }

        if (text.includes("area")) {
            return `Area = pi * r^2 = ${formatNumber(area)}.`;
        }

        return `Using radius ${formatNumber(radius)}: area is ${formatNumber(area)} and circumference is ${formatNumber(circumference)}.`;
    }

    function answerNumberTheory(question) {
        const text = question.toLowerCase();
        const nums = extractNumbers(question).map((number) => Math.trunc(number));

        if (nums.length === 0) {
            return null;
        }

        if (text.includes("gcd") && nums.length >= 2) {
            return `gcd(${nums[0]}, ${nums[1]}) = ${gcd(nums[0], nums[1])}.`;
        }

        if (text.includes("lcm") && nums.length >= 2) {
            return `lcm(${nums[0]}, ${nums[1]}) = ${lcm(nums[0], nums[1])}.`;
        }

        if (text.includes("prime")) {
            return isPrime(nums[0])
                ? `${nums[0]} is prime. Its only positive factors are 1 and ${nums[0]}.`
                : `${nums[0]} is not prime. Its factors are ${factorList(nums[0]).join(", ")}.`;
        }

        if (/(factor|divisor)/.test(text)) {
            return `The positive factors of ${nums[0]} are ${factorList(nums[0]).join(", ")}.`;
        }

        return null;
    }

    function answerProbability(question) {
        const text = question.toLowerCase();
        const nums = extractNumbers(question);

        if (!/(probability|chance|odds)/.test(text)) {
            return null;
        }

        if (nums.length >= 2) {
            let favorable = nums[0];
            let total = nums[1];

            if (/(marble|ball|red|blue|green|yellow)/.test(text)) {
                total = nums.reduce((sum, value) => sum + value, 0);
            }

            if (total > 0) {
                const probability = favorable / total;
                return `Probability = favorable outcomes / total outcomes = ${formatNumber(favorable)}/${formatNumber(total)} = ${formatNumber(probability)}.`;
            }
        }

        return "For probability, start with: favorable outcomes divided by total equally likely outcomes. If there are multiple steps, check whether the events are independent or dependent.";
    }

    function getConfig() {
        return window.QuadraticAIConfig || {};
    }

    function formatConversation(history) {
        if (!Array.isArray(history) || history.length === 0) {
            return "No earlier messages in this chat.";
        }

        return history
            .map((message) => `${message.role === "user" ? "Aarush" : "Quadratic"}: ${message.content}`)
            .join("\n\n");
    }

    function getSystemPrompt() {
        const config = getConfig();

        return config.systemPrompt || [
            "You are Quadratic, a clear and encouraging math coach for Aarush Dechu.",
            "Explain slowly and step by step.",
            "If Aarush asks for a specific method, follow that method.",
            "Remember and use the conversation history."
        ].join(" ");
    }

    function shouldUseAI(config) {
        return config.useAI && config.apiProxyUrl;
    }

    async function askPythonBackend(question, localHint, history) {
        const config = getConfig();

        if (!shouldUseAI(config) || !config.apiProxyUrl) {
            return null;
        }

        const proxyResponse = await fetch(config.apiProxyUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                question,
                localHint,
                history,
                systemPrompt: getSystemPrompt(),
                student: profile
            })
        });

        if (!proxyResponse.ok) {
            let details = "";

            try {
                const errorData = await proxyResponse.json();
                details = errorData.error ? `: ${errorData.error}` : "";
            } catch {
                details = "";
            }

            throw new Error(`Python backend failed with status ${proxyResponse.status}${details}`);
        }

        const proxyData = await proxyResponse.json();
        return proxyData.answer || proxyData.output_text || proxyData.text || "";
    }

    async function askConfiguredAI(question, localHint, history) {
        const config = getConfig();

        if (shouldUseAI(config)) {
            const answer = await askPythonBackend(question, localHint, history);
            return {
                answer,
                source: answer ? "Python Gemini backend" : ""
            };
        }

        return {
            answer: null,
            source: ""
        };
    }

    function answerLocally(question) {
        const cleaned = question.trim();

        if (!cleaned) {
            return "Send a math problem and Quadratic will help.";
        }

        const responders = [
            answerRootExpression,
            answerQuadratic,
            answerLinear,
            answerCombinatorics,
            answerSequence,
            answerCircle,
            answerNumberTheory,
            answerProbability,
            answerArithmetic
        ];

        for (const responder of responders) {
            const response = responder(cleaned);

            if (response) {
                return response;
            }
        }

        return [
            `I can help, but I need the exact problem or numbers.`,
            "",
            `For ${profile.name}'s ${profile.goals} training, I would first identify the topic, list the given information, choose a tool, and test a smaller example.`,
            `This especially helps with ${profile.growthAreas}.`
        ].join("\n");
    }

    function answerFallback(question, history) {
        const priorMethod = Array.isArray(history)
            ? history
                .filter((message) => message.role === "user" && /method|use|solve it by|do it with/i.test(message.content))
                .slice(-1)[0]
            : null;

        const localAnswer = answerLocally(question);

        if (!priorMethod) {
            return localAnswer;
        }

        return [
            `I remember you asked about a method earlier: "${priorMethod.content}"`,
            "",
            "My local brain is limited, so I may not fully follow that method without the OpenAI brain turned on. Here is the best local answer I can give:",
            "",
            localAnswer
        ].join("\n");
    }

    async function answer(question, history = []) {
        const localAnswer = answerFallback(question, history);

        try {
            const aiResult = await askConfiguredAI(question, localAnswer, history);

            if (aiResult.answer) {
                lastAnswerSource = aiResult.source;
                return aiResult.answer;
            }
        } catch (error) {
            lastAnswerSource = "API error, local fallback";
            return [
                "Quadratic could not reach the OpenAI API, so I used the local brain instead.",
                `Reason: ${error.message}`,
                "",
                localAnswer
            ].join("\n");
        }

        lastAnswerSource = "Local fallback";
        return localAnswer;
    }

    window.AarushMathBrain = {
        answer,
        answerLocally,
        getLastAnswerSource() {
            return lastAnswerSource;
        }
    };
}());
