#!/usr/bin/env node
/**
 * LearningTo MCP server - interview prep tools for AI agents.
 *
 * Self-contained: curriculum, challenges, and the learning-path graph are
 * bundled (see data.ts). AI feedback tools call the deployed endpoints at
 * https://learningto.co/api/* and require ALGOVAULT_SESSION_TOKEN.
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { topicSummaries, getTopic, getChallenge, buildLearningPath, recommendNext, categories, } from "./data.js";
const SITE_BASE = "https://learningto.co";
const AI_BASE_URL = process.env.ALGOVAULT_API_URL ?? `${SITE_BASE}/api`;
const SESSION_TOKEN = process.env.ALGOVAULT_SESSION_TOKEN;
const SERVER_VERSION = "1.2.0";
const CATEGORY_LABEL = {
    "data-structures": "Data Structures",
    algorithms: "Algorithms",
    concepts: "Concepts",
};
function categoryLabel(category) {
    return CATEGORY_LABEL[category] ?? category;
}
function ctaForTopic(topicId) {
    return `Practice interactively: ${SITE_BASE}/learn/${topicId}`;
}
function ctaForChallenge(topicId, challengeId) {
    return `Practice interactively: ${SITE_BASE}/problems/${topicId}/${challengeId}`;
}
// ---------------------------------------------------------------------------
// AI endpoint helper
// ---------------------------------------------------------------------------
const AI_AUTH_MESSAGE = "AI tools require a LearningTo account. " +
    "Sign up free at https://learningto.co, then set ALGOVAULT_SESSION_TOKEN " +
    "in your MCP server env to your session token to enable AI tools.";
async function callAiEndpoint(path, body) {
    const headers = {
        "Content-Type": "application/json",
    };
    if (SESSION_TOKEN) {
        headers.Authorization = `Bearer ${SESSION_TOKEN}`;
    }
    let response;
    try {
        response = await fetch(`${AI_BASE_URL}${path}`, {
            method: "POST",
            headers,
            body: JSON.stringify(body),
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        throw new Error(`Network error calling ${path}: ${message}`);
    }
    const text = await response.text();
    let data = text;
    try {
        data = JSON.parse(text);
    }
    catch {
        // keep raw text
    }
    return { ok: response.ok, status: response.status, data };
}
function aiErrorMessage(status, data) {
    if (status === 401) {
        return AI_AUTH_MESSAGE;
    }
    const detail = typeof data === "string" ? data : JSON.stringify(data ?? {}, null, 2);
    return `learningto.co API error ${status}: ${detail}`;
}
// ---------------------------------------------------------------------------
// Zod schemas for runtime validation of tool inputs
// ---------------------------------------------------------------------------
const GetTopicInput = z.object({
    topicId: z.string(),
});
const GetChallengeInput = z.object({
    topicId: z.string(),
    challengeId: z.string(),
});
const AnalyzeCodeInput = z.object({
    code: z.string(),
    challenge: z.string(),
    optimalComplexity: z
        .object({
        time: z.string(),
        space: z.string(),
    })
        .optional(),
    language: z.string().optional().default("python"),
});
const GetHintInput = z.object({
    challenge: z.string(),
    currentCode: z.string(),
    hintLevel: z.number().int().min(1).max(3),
});
const ExplainInput = z.object({
    context: z.string(),
    question: z.string(),
    userLevel: z.string().optional(),
    topicId: z.string().optional(),
});
const AssessReadinessInput = z.object({
    progress: z.record(z.string(), z.object({
        mastery: z.number().min(0).max(1),
        challengesCompleted: z.number().int().min(0),
    })),
});
const GenerateProblemInput = z.object({
    topicId: z.string(),
    difficulty: z.enum(["easy", "medium", "hard"]),
    avoidProblems: z.array(z.string()).optional(),
    focusPatterns: z.array(z.string()).optional(),
});
const RecommendNextInput = z.object({
    topicId: z.string(),
});
// ---------------------------------------------------------------------------
// Markdown formatters (compact, terminal-friendly)
// ---------------------------------------------------------------------------
function difficultyStars(difficulty) {
    return "★".repeat(difficulty) + "☆".repeat(5 - difficulty);
}
function escapeCell(text) {
    return text.replace(/\|/g, "\\|").replace(/\n/g, " ");
}
function formatCurriculum() {
    const lines = [
        "# LearningTo Interview Prep — Curriculum",
        "",
        `${topicSummaries.length} topics · ${topicSummaries.reduce((s, t) => s + t.challengeCount, 0)} challenges`,
        "",
        "| Topic | Category | Difficulty | Challenges | IDs |",
        "|---|---|---|---|---|",
    ];
    for (const t of topicSummaries) {
        lines.push(`| **${escapeCell(t.title)}** (\`${t.id}\`) | ${categoryLabel(t.category)} | ${t.difficulty}/5 | ${t.challengeCount} | ${t.challengeIds.map((id) => `\`${id}\``).join(", ")} |`);
    }
    lines.push("", "**Categories:** " + Object.values(categories).map((c) => c.label).join(" · "));
    lines.push("", ctaForTopic(topicSummaries[0].id));
    return lines.join("\n");
}
function formatTopic(topicId) {
    const topic = getTopic(topicId);
    if (!topic) {
        return `Topic not found: \`${topicId}\`. Use \`learningto_get_curriculum\` to list valid topic ids.`;
    }
    const lines = [
        `# ${topic.title}`,
        "",
        `**Category:** ${categoryLabel(topic.category)} · **Difficulty:** ${difficultyStars(topic.difficulty)} (${topic.difficulty}/5)`,
        "",
        escapeCell(topic.description),
        "",
    ];
    if (topic.bigO) {
        lines.push("**Complexity:**", "", "| Best | Average | Worst | Space |", "|---|---|---|---|", `| ${topic.bigO.best} | ${topic.bigO.average} | ${topic.bigO.worst} | ${topic.bigO.space} |`);
    }
    const summary = topicSummaries.find((t) => t.id === topicId);
    const prerequisites = summary?.prerequisites ?? [];
    if (prerequisites.length > 0) {
        lines.push("", `**Prerequisites:** ${prerequisites.map((p) => `\`${p}\``).join(", ")}`);
    }
    else {
        lines.push("", "**Prerequisites:** none — start here");
    }
    lines.push("", "**Key points:**", "");
    for (const point of topic.keyPoints) {
        lines.push(`- ${point}`);
    }
    lines.push("", "**Reference example:**", "", "```python", topic.pythonExample.trimEnd(), "```");
    lines.push("", "**Challenges:**", "");
    for (const c of topic.challenges) {
        lines.push(`- **${escapeCell(c.title)}** (\`${c.id}\`, ${c.difficulty}) — ${escapeCell(c.description.split(". ")[0])}.`);
    }
    lines.push("", ctaForTopic(topicId));
    return lines.join("\n");
}
function formatChallenge(topicId, challengeId) {
    const topic = getTopic(topicId);
    if (!topic) {
        return `Topic not found: \`${topicId}\`.`;
    }
    const challenge = getChallenge(topicId, challengeId);
    if (!challenge) {
        return `Challenge not found: \`${challengeId}\` in topic \`${topicId}\`. Available: ${topic.challenges.map((c) => `\`${c.id}\``).join(", ")}.`;
    }
    const c = challenge;
    const lines = [
        `# ${c.title}`,
        "",
        `**Topic:** ${escapeCell(topic.title)} · **Difficulty:** ${c.difficulty} · **Tags:** ${c.tags.map((t) => `\`${t}\``).join(", ")}`,
        "",
        c.description.trimEnd(),
        "",
        "**Starter code:**",
        "",
        "```python",
        c.starterCode.trimEnd(),
        "```",
        "",
        "**Test cases:**",
        "",
        "| Input | Expected |",
        "|---|---|",
    ];
    for (const tc of c.testCases) {
        lines.push(`| \`${escapeCell(tc.input)}\` | \`${escapeCell(tc.expected)}\` |`);
    }
    lines.push("", `**Optimal:** ${c.optimalComplexity.time} time, ${c.optimalComplexity.space} space`, "", "**Hints (progressive):**", "");
    c.hints.forEach((hint, i) => {
        lines.push(`${i + 1}. ${hint}`);
    });
    lines.push("", ctaForChallenge(topicId, challengeId));
    return lines.join("\n");
}
function formatLearningPath() {
    const graph = buildLearningPath();
    const labelById = {};
    for (const node of graph.nodes) {
        labelById[node.id] = node.label;
    }
    const lines = [
        "# LearningTo Learning Path (prerequisite graph)",
        "",
        `${graph.nodes.length} nodes · ${graph.edges.length} edges`,
        "",
    ];
    const rowsByCategory = {};
    for (const node of graph.nodes) {
        (rowsByCategory[node.category] ??= []).push(node);
    }
    for (const category of Object.keys(rowsByCategory)) {
        lines.push(`## ${category}`, "", "| Node | Requires |", "|---|---|");
        for (const node of rowsByCategory[category]) {
            const prereqs = node.prerequisites.length > 0
                ? node.prerequisites.map((p) => `\`${labelById[p] ?? p}\``).join(", ")
                : "—";
            const topic = node.topicId ? ` → [\`${node.topicId}\`]` : "";
            lines.push(`| **${escapeCell(node.label)}** (\`${node.id}\`)${topic} | ${prereqs} |`);
        }
        lines.push("");
    }
    lines.push(ctaForTopic("big-o-notation"));
    return lines.join("\n");
}
function formatRecommend(topicId) {
    const result = recommendNext(topicId);
    const lines = [
        `# Next after \`${result.completedTopic}\``,
        "",
    ];
    if (result.next.length === 0) {
        lines.push("No recommendations — this topic has no unlocked follow-ups.");
    }
    else {
        lines.push("| Topic | Why | Difficulty |", "|---|---|---|");
        for (const rec of result.next) {
            lines.push(`| **${escapeCell(rec.title)}** (\`${rec.topicId}\`) | ${escapeCell(rec.reason)} | ${rec.difficulty}/5 |`);
        }
    }
    lines.push("", ctaForTopic(topicId));
    return lines.join("\n");
}
// ---------------------------------------------------------------------------
// Tool definitions with plain JSON Schema input schemas
// ---------------------------------------------------------------------------
const TOOLS = [
    {
        name: "learningto_get_curriculum",
        description: "Retrieve the full LearningTo curriculum: all topics, challenge lists, and categories. " +
            "Use this to give the user an overview of what is available to study, or to find topicIds " +
            "before calling other tools.",
        inputSchema: {
            type: "object",
            properties: {},
            required: [],
        },
    },
    {
        name: "learningto_get_topic",
        description: "Get detailed information about a single topic - description, concepts covered, " +
            "prerequisite topics, and the list of challenges available. Use this before starting " +
            "a study session on a specific data structure or algorithm.",
        inputSchema: {
            type: "object",
            properties: {
                topicId: {
                    type: "string",
                    description: "The topic identifier, e.g. 'arrays-strings', 'graphs'",
                },
            },
            required: ["topicId"],
        },
    },
    {
        name: "learningto_get_challenge",
        description: "Fetch a specific coding challenge by topic and challenge ID. Returns the problem " +
            "statement, examples, constraints, and any starter code. Use this when the user " +
            "wants to work on a named problem.",
        inputSchema: {
            type: "object",
            properties: {
                topicId: {
                    type: "string",
                    description: "The topic that owns the challenge, e.g. 'arrays-strings'",
                },
                challengeId: {
                    type: "string",
                    description: "The challenge identifier, e.g. 'two-sum'",
                },
            },
            required: ["topicId", "challengeId"],
        },
    },
    {
        name: "learningto_analyze_code",
        description: "Analyze a Python coding solution for correctness, time/space complexity, and style. " +
            "Returns a rating (1-5), detected complexities, improvement suggestions, and identified " +
            "algorithm patterns. Use this whenever the user shares code or asks for feedback on a solution.",
        inputSchema: {
            type: "object",
            properties: {
                code: {
                    type: "string",
                    description: "The Python (or other language) solution code to analyze",
                },
                challenge: {
                    type: "string",
                    description: "The challenge description or name being solved",
                },
                optimalComplexity: {
                    type: "object",
                    description: "Known optimal complexities for the challenge (optional)",
                    properties: {
                        time: {
                            type: "string",
                            description: "Optimal time complexity, e.g. 'O(n)'",
                        },
                        space: {
                            type: "string",
                            description: "Optimal space complexity, e.g. 'O(1)'",
                        },
                    },
                    required: ["time", "space"],
                },
                language: {
                    type: "string",
                    description: "Programming language of the code (default: python)",
                },
            },
            required: ["code", "challenge"],
        },
    },
    {
        name: "learningto_get_hint",
        description: "Get a progressive hint for a coding challenge. " +
            "Level 1 = gentle nudge about the general approach (prefer this first). " +
            "Level 2 = specific algorithm pattern or data structure to use. " +
            "Level 3 = near-complete pseudocode walkthrough. " +
            "Always start at level 1 unless the user explicitly asks for a stronger hint.",
        inputSchema: {
            type: "object",
            properties: {
                challenge: {
                    type: "string",
                    description: "The challenge description or name the user is working on",
                },
                currentCode: {
                    type: "string",
                    description: "The user's current (partial) code attempt",
                },
                hintLevel: {
                    type: "integer",
                    description: "Hint verbosity: 1 = gentle nudge, 2 = algorithm pattern, 3 = pseudocode",
                    minimum: 1,
                    maximum: 3,
                },
            },
            required: ["challenge", "currentCode", "hintLevel"],
        },
    },
    {
        name: "learningto_explain",
        description: "Get a contextual explanation of an algorithm concept, data structure, or code snippet. " +
            "Adapts the depth to the user's level. Use this when the user asks 'why does this work', " +
            "'explain X', or needs clarification on a concept encountered while studying.",
        inputSchema: {
            type: "object",
            properties: {
                context: {
                    type: "string",
                    description: "The surrounding topic or code context for the explanation",
                },
                question: {
                    type: "string",
                    description: "The specific concept or question to explain",
                },
                userLevel: {
                    type: "string",
                    description: "User proficiency level, e.g. 'beginner', 'intermediate', 'advanced'",
                },
                topicId: {
                    type: "string",
                    description: "Related topic identifier to anchor the explanation",
                },
            },
            required: ["context", "question"],
        },
    },
    {
        name: "learningto_assess_readiness",
        description: "Assess the user's overall Google interview readiness based on mastery scores " +
            "and completed challenges across all topics. Returns a readiness score, weak areas, " +
            "and a recommended study focus. Use this when the user asks 'am I ready?' or wants " +
            "a progress summary.",
        inputSchema: {
            type: "object",
            properties: {
                progress: {
                    type: "object",
                    description: "Map of topicId to progress data. Example: { \"arrays-strings\": { \"mastery\": 0.8, \"challengesCompleted\": 5 } }",
                    additionalProperties: {
                        type: "object",
                        properties: {
                            mastery: {
                                type: "number",
                                description: "Mastery score between 0 and 1",
                                minimum: 0,
                                maximum: 1,
                            },
                            challengesCompleted: {
                                type: "integer",
                                description: "Number of challenges completed for this topic",
                                minimum: 0,
                            },
                        },
                        required: ["mastery", "challengesCompleted"],
                    },
                },
            },
            required: ["progress"],
        },
    },
    {
        name: "learningto_generate_problem",
        description: "Generate a fresh practice problem for a given topic and difficulty. Useful when the " +
            "user has exhausted the built-in challenges or wants a variation. Pass avoidProblems " +
            "to prevent repeating problems they have already seen.",
        inputSchema: {
            type: "object",
            properties: {
                topicId: {
                    type: "string",
                    description: "Topic for the generated problem, e.g. 'dynamic-programming'",
                },
                difficulty: {
                    type: "string",
                    enum: ["easy", "medium", "hard"],
                    description: "Desired problem difficulty",
                },
                avoidProblems: {
                    type: "array",
                    items: { type: "string" },
                    description: "List of problem names or IDs to avoid repeating",
                },
                focusPatterns: {
                    type: "array",
                    items: { type: "string" },
                    description: "Algorithm patterns to emphasize, e.g. ['sliding-window', 'two-pointers']",
                },
            },
            required: ["topicId", "difficulty"],
        },
    },
    {
        name: "learningto_get_learning_path",
        description: "Retrieve the full prerequisite graph (skill tree) showing which topics must be studied " +
            "before others. Use this to help the user plan a structured study schedule or understand " +
            "topic dependencies.",
        inputSchema: {
            type: "object",
            properties: {},
            required: [],
        },
    },
    {
        name: "learningto_recommend_next",
        description: "Get recommended next topics after the user completes a given topic. Returns an ordered " +
            "list of what to study next based on the prerequisite graph and difficulty progression. " +
            "Use this after the user finishes a topic and asks 'what should I do next?'",
        inputSchema: {
            type: "object",
            properties: {
                topicId: {
                    type: "string",
                    description: "The topic just completed. The server returns what to study next.",
                },
            },
            required: ["topicId"],
        },
    },
];
// ---------------------------------------------------------------------------
// Server setup
// ---------------------------------------------------------------------------
const server = new Server({ name: "learningto", version: SERVER_VERSION }, { capabilities: { tools: {} } });
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: TOOLS };
});
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const input = (args ?? {});
    try {
        let text;
        switch (name) {
            case "learningto_get_curriculum":
                text = formatCurriculum();
                break;
            case "learningto_get_topic": {
                const { topicId } = GetTopicInput.parse(input);
                text = formatTopic(topicId);
                break;
            }
            case "learningto_get_challenge": {
                const { topicId, challengeId } = GetChallengeInput.parse(input);
                text = formatChallenge(topicId, challengeId);
                break;
            }
            case "learningto_analyze_code": {
                const parsed = AnalyzeCodeInput.parse(input);
                const res = await callAiEndpoint("/analyze", parsed);
                text = res.ok ? JSON.stringify(res.data, null, 2) : aiErrorMessage(res.status, res.data);
                break;
            }
            case "learningto_get_hint": {
                const parsed = GetHintInput.parse(input);
                const res = await callAiEndpoint("/hint", parsed);
                text = res.ok ? JSON.stringify(res.data, null, 2) : aiErrorMessage(res.status, res.data);
                break;
            }
            case "learningto_explain": {
                const parsed = ExplainInput.parse(input);
                const res = await callAiEndpoint("/explain", parsed);
                text = res.ok ? JSON.stringify(res.data, null, 2) : aiErrorMessage(res.status, res.data);
                break;
            }
            case "learningto_assess_readiness": {
                const parsed = AssessReadinessInput.parse(input);
                const res = await callAiEndpoint("/assess", parsed);
                text = res.ok ? JSON.stringify(res.data, null, 2) : aiErrorMessage(res.status, res.data);
                break;
            }
            case "learningto_generate_problem": {
                const parsed = GenerateProblemInput.parse(input);
                const res = await callAiEndpoint("/generate", parsed);
                text = res.ok ? JSON.stringify(res.data, null, 2) : aiErrorMessage(res.status, res.data);
                break;
            }
            case "learningto_get_learning_path":
                text = formatLearningPath();
                break;
            case "learningto_recommend_next": {
                const { topicId } = RecommendNextInput.parse(input);
                text = formatRecommend(topicId);
                break;
            }
            default:
                return {
                    content: [{ type: "text", text: `Unknown tool: ${name}` }],
                    isError: true,
                };
        }
        return {
            content: [{ type: "text", text }],
        };
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
            content: [{ type: "text", text: `Error: ${message}` }],
            isError: true,
        };
    }
});
// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    // Log to stderr so it does not pollute the MCP stdio stream
    process.stderr.write("LearningTo MCP server running. Waiting for requests.\n");
}
main().catch((err) => {
    process.stderr.write(`Fatal error: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
});
