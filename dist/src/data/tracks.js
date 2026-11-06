// Track model (PRD P1.1, C2.1). A track is a partition of the curriculum:
// every topic belongs to exactly one track. Topic ids are globally unique
// across tracks (plan section 04); enforced by convention plus a dev-time
// assertion in topicRegistry.ts.
export const TRACKS = [
    {
        id: 'swe',
        label: 'SWE Track',
        description: 'Data structures, algorithms, and system design for software engineer interviews.',
        topicPrefix: '',
        switcherLabel: 'SWE',
    },
    {
        id: 'ai',
        label: 'AI Track',
        description: 'AI engineer interview prep built to be learned from zero: what these systems are, why they fail, and how you answer for it.',
        topicPrefix: 'ai-',
        switcherLabel: 'AI engineering',
        hub: {
            path: 'learn/ai',
            metaTitle: 'AI Interview Prep, Visualized | LearningTo',
            metaDescription: 'Learn what AI engineer interviews probe: prompting, retrieval, evals, agents, cost, fine-tuning, guardrails and running in production. Free.',
            h1: 'AI interview prep, starting from what you actually know',
            lead: 'Most candidates arrive here in the same place: you have used ChatGPT, you may not yet be able to explain how any of it works, and that is fine. This track starts there. The topics take you up from a blank chat window to the judgment calls AI engineers make - what the system reads before it answers, how you prove a change got better instead of just different, when an agent should stop, what a change costs, and where untrusted text gets blocked. Every step lets you run the thing and break it, which is the part interviewers ask about.',
        },
    },
];
export function getTrack(id) {
    const track = TRACKS.find((t) => t.id === id);
    if (!track)
        throw new Error(`Unknown track: ${id}`);
    return track;
}
// Track membership for a topic id (C2.1). The explicit field wins; absent
// means the SWE track, which keeps every existing topic untouched. topicId is
// part of the contract signature (callers key events by it) but the default
// rule does not inspect it.
export function trackFromTopicId(_topicId, track) {
    return track ?? 'swe';
}
