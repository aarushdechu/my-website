(function () {
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

    function answerQuadratic(question) {
        const equation = question.toLowerCase().replace(/\s+/g, "").replace(/\*\*/g, "^");

        if (!equation.includes("x^2") || !equation.includes("=")) {
            return null;
        }

        const parts = equation.split("=");
        const left = parts[0];
        const right = parts[1];

        if (right.includes("x")) {
            return "I see a quadratic. First move every term to one side so it equals 0, then send it again.";
        }

        let a = 0;
        let b = 0;
        let c = -Number(right || 0);
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

        if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(c) || a === 0) {
            return null;
        }

        const discriminant = b * b - 4 * a * c;

        if (discriminant < 0) {
            return `The discriminant is ${formatNumber(discriminant)}, so there are no real-number solutions.`;
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

    function hasApiKey(config) {
        return config.apiKey && config.apiKey !== "PASTE_YOUR_OPENAI_API_KEY_HERE";
    }

    function getResponseText(data) {
        if (data.output_text) {
            return data.output_text;
        }

        if (!Array.isArray(data.output)) {
            return "";
        }

        return data.output
            .flatMap((item) => item.content || [])
            .filter((content) => content.type === "output_text" && content.text)
            .map((content) => content.text)
            .join("\n")
            .trim();
    }

    async function askOpenAI(question, localHint) {
        const config = getConfig();

        if (!config.useOpenAI) {
            return null;
        }

        if (config.apiProxyUrl) {
            const proxyResponse = await fetch(config.apiProxyUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    question,
                    localHint,
                    student: profile
                })
            });

            if (!proxyResponse.ok) {
                throw new Error(`Proxy request failed with status ${proxyResponse.status}`);
            }

            const proxyData = await proxyResponse.json();
            return proxyData.answer || proxyData.output_text || proxyData.text || "";
        }

        if (!hasApiKey(config)) {
            return null;
        }

        const response = await fetch("https://api.openai.com/v1/responses", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${config.apiKey}`
            },
            body: JSON.stringify({
                model: config.model || "gpt-5.5",
                instructions: [
                    "You are Quadratic, a clear and encouraging math coach for Aarush Dechu.",
                    "Aarush is 12, finishing 6th grade and heading into 7th.",
                    "He is strong in algebra and is training for AMC-8 and MATHCOUNTS, with AIME as a stretch goal.",
                    "Prefer step-by-step reasoning, hints, and contest-style strategy over just final answers.",
                    "Keep explanations age-appropriate but not watered down."
                ].join(" "),
                input: [
                    `Question: ${question}`,
                    localHint ? `Local solver hint: ${localHint}` : ""
                ].join("\n")
            })
        });

        if (!response.ok) {
            throw new Error(`OpenAI request failed with status ${response.status}`);
        }

        return getResponseText(await response.json());
    }

    function answerLocally(question) {
        const cleaned = question.trim();

        if (!cleaned) {
            return "Send a math problem and Quadratic will help.";
        }

        const responders = [
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

    async function answer(question) {
        const localAnswer = answerLocally(question);

        try {
            const aiAnswer = await askOpenAI(question, localAnswer);

            if (aiAnswer) {
                return aiAnswer;
            }
        } catch (error) {
            return [
                "Quadratic could not reach the OpenAI API, so I used the local brain instead.",
                `Reason: ${error.message}`,
                "",
                localAnswer
            ].join("\n");
        }

        return localAnswer;
    }

    window.AarushMathBrain = {
        answer,
        answerLocally
    };
}());
