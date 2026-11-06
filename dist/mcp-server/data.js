/**
 * Bundled curriculum + learning-path data for the LearningTo MCP server.
 *
 * Self-contained: imports the pure data files only (no React, no API).
 * - app/src/data/curriculum.ts        -> topics + challenges (source of truth)
 * - app/src/data/learningPathNodes.ts -> prerequisite graph (source of truth)
 */
import { topics, categories } from "../src/data/curriculum.js";
import { learningPathNodes } from "../src/data/learningPathNodes.js";
export { categories };
// ---------------------------------------------------------------------------
// Derived data
// ---------------------------------------------------------------------------
function prerequisitesForTopicId(topicId) {
    const node = learningPathNodes.find((n) => n.topicId === topicId);
    if (!node)
        return [];
    // Map node-level prerequisite ids back to topic ids where possible.
    const prereqTopicIds = new Set();
    for (const prereqId of node.prerequisites) {
        const prereqNode = learningPathNodes.find((n) => n.id === prereqId);
        if (prereqNode?.topicId && prereqNode.topicId !== topicId) {
            prereqTopicIds.add(prereqNode.topicId);
        }
    }
    return [...prereqTopicIds];
}
export const topicSummaries = topics.map((topic) => ({
    id: topic.id,
    title: topic.title,
    category: topic.category,
    icon: topic.icon,
    difficulty: topic.difficulty,
    description: topic.description,
    bigO: topic.bigO ?? {
        best: 'n/a',
        average: 'n/a',
        worst: 'n/a',
        space: 'n/a',
    },
    visualizationType: topic.visualizationType,
    challengeCount: topic.challenges.length,
    challengeIds: topic.challenges.map((c) => c.id),
    prerequisites: prerequisitesForTopicId(topic.id),
}));
const TOPIC_BY_ID = Object.fromEntries(topics.map((t) => [t.id, t]));
export function getTopic(id) {
    return TOPIC_BY_ID[id];
}
export function getChallenge(topicId, challengeId) {
    return TOPIC_BY_ID[topicId]?.challenges.find((c) => c.id === challengeId);
}
export function buildLearningPath() {
    const edges = [];
    for (const node of learningPathNodes) {
        for (const prereqId of node.prerequisites) {
            edges.push({ from: prereqId, to: node.id });
        }
    }
    return { nodes: learningPathNodes, edges };
}
export function recommendNext(topicId) {
    const completedTitle = TOPIC_BY_ID[topicId]?.title ?? topicId;
    // Topics unlocked by completing this one (their prerequisites reference it).
    const unlocked = topicSummaries
        .filter((t) => t.prerequisites.includes(topicId))
        .map((t) => ({
        topicId: t.id,
        title: t.title,
        reason: `Unlocked by completing ${completedTitle}`,
        difficulty: t.difficulty,
    }));
    // Same-category topics at similar difficulty.
    const current = TOPIC_BY_ID[topicId];
    const lateral = current
        ? topicSummaries
            .filter((t) => t.id !== topicId &&
            t.category === current.category &&
            Math.abs(t.difficulty - current.difficulty) <= 1 &&
            !unlocked.some((u) => u.topicId === t.id))
            .map((t) => ({
            topicId: t.id,
            title: t.title,
            reason: `Similar difficulty in ${t.category}`,
            difficulty: t.difficulty,
        }))
        : [];
    return { completedTopic: topicId, next: [...unlocked, ...lateral].slice(0, 5) };
}
