// Track-aware topic registry (PRD C2.1, plan section 04). SWE topics live in
// curriculum.ts; other tracks author their own files (P1.8's aiTopics.ts) and
// land here via the glob discovery below, so no single file owns every track
// and route generation, the sidebar, and id lookups all read one registry.
//
// Convention: a track topic file sits next to this file, is named after its
// track, and exports its topic array as `aiTopics` for the 'ai' track. The
// glob stays tolerant of the file's absence while that file is in flight.
import { curriculum } from './curriculum.js';
// This module is the only consumer of import.meta.env, so it carries the
// vite ambient types itself: Vercel's function typecheck recompiles the
// api-into-src import graph under its own inferred tsconfig that has no
// global types entry, and the undeclared members showed up as non-fatal
// diagnostics on every deploy's build log.
/// <reference types="vite/client" />
import { trackFromTopicId } from './tracks.js';
// Track topic files register through static imports, not import.meta.glob:
// the serverless functions import this module too (explain.ts, aijudge.ts),
// and import.meta.glob is a Vite transform that does not exist in the plain
// Node runtime - it made every api route that reaches the registry crash at
// module load. A new topic file means adding an import and a entry to the
// list below; the sort into AI_TOPIC_DISPLAY_ORDER keeps the result stable
// either way.
import { aiTopics } from './aiTopics.js';
import { promptingTopics } from './aiPromptingTopics.js';
import { finetuneTopics } from './aiFinetuneTopics.js';
import { aiServingTopics } from './aiServingTopics.js';
import { observabilityTopics } from './aiObservabilityTopics.js';
// Display order for AI-track topics: the authoring order of the units, so the
// hub page, practice hub, and dashboard all present the track in the intended
// teaching sequence regardless of which data file a topic lives in. Topics
// not named here keep file registration order (backwards compatible).
const AI_TOPIC_DISPLAY_ORDER = [
    'ai-fundamentals',
    'prompting-context',
    'rag-systems',
    'finetuning-decision',
    'evals-calibration',
    'agents-behavior',
    'inference-economics',
    'serving-internals',
    'serving-tiers',
    'cache-routing',
    'quant-stack',
    'fleet-decision',
    'cost-metering',
    'fleet-efficiency',
    'guardrails-injection',
    'ai-observability',
];
const registeredTopics = [];
// Called by track topic files at module load (or manually) to join the
// shared registry. Registered topics are appended after the SWE curriculum.
export function registerTopics(topics) {
    registeredTopics.push(...topics);
}
// Every track topic file's array, registered on the first registry read.
// Registration cannot run at module load: this module sits in an import
// cycle with curriculum.ts, and when a consumer's import order starts from
// a topic file, the topic-file bindings here are still uninitialized at
// module-eval time. getAllTopics is only ever called at runtime (comment on
// the export below), by which point every statically imported module has
// finished evaluating, so a first-read registration sees every array whole
// and every consumer of any entry point gets all tracks, exactly as the
// eager glob did.
let trackTopicsRegistered = false;
function ensureTrackTopicsRegistered() {
    if (trackTopicsRegistered)
        return;
    trackTopicsRegistered = true;
    for (const list of [aiTopics, promptingTopics, finetuneTopics, aiServingTopics, observabilityTopics]) {
        registerTopics(list);
    }
    // Sort the non-SWE topics into the display order. Deterministic regardless
    // of import order, so consumer UIs never shuffle.
    registeredTopics.sort((a, b) => {
        const ia = AI_TOPIC_DISPLAY_ORDER.indexOf(a.id);
        const ib = AI_TOPIC_DISPLAY_ORDER.indexOf(b.id);
        const oa = ia === -1 ? AI_TOPIC_DISPLAY_ORDER.length + registeredTopics.indexOf(a) : ia;
        const ob = ib === -1 ? AI_TOPIC_DISPLAY_ORDER.length + registeredTopics.indexOf(b) : ib;
        return oa - ob;
    });
}
// Every topic across every track, in stable order (SWE first, then other
// tracks in registration order). Consumers that must see both tracks (route
// discovery, id lookups, sidebar cross-track rendering) read this. Only ever
// called at runtime, never during module evaluation, so a curriculum.ts ->
// topicRegistry -> curriculum import cycle cannot reach the live binding
// before it initializes.
export function getAllTopics() {
    ensureTrackTopicsRegistered();
    assertUniqueTopicIds();
    return [...curriculum, ...registeredTopics];
}
// Topics belonging to one track, with the absent-field default applied.
export function getTopicsByTrack(track) {
    return getAllTopics().filter((t) => trackFromTopicId(t.id, t.track) === track);
}
// Dev-time guard for the globally-unique id convention (plan section 04).
// Runs on the first registry read in dev servers and vitest; stripped from
// production bundles. It must NOT run at module top level: curriculum.ts now
// imports getAllTopics back, so under the curriculum -> registry eval order
// the `curriculum` binding here is still uninitialized and a top-level read
// would throw. Lazy timing also keeps module load free of cross-module reads.
// import.meta.env is a Vite build-time object; optional chaining keeps a
// plain Node import (the serverless functions) from dereferencing undefined,
// and the guard simply does not run outside Vite-bundled dev servers.
let uniquenessChecked = false;
function assertUniqueTopicIds() {
    if (uniquenessChecked || !import.meta.env?.DEV)
        return;
    uniquenessChecked = true;
    const seen = new Map();
    for (const topic of getAllTopics()) {
        const track = trackFromTopicId(topic.id, topic.track);
        const owner = seen.get(topic.id);
        if (owner) {
            throw new Error(`topicRegistry: topic id "${topic.id}" appears in both the ${owner} and ${track} tracks - ids must be globally unique`);
        }
        seen.set(topic.id, track);
    }
}
