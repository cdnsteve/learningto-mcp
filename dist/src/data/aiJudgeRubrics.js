// AI judge rubric data (PRD P2.10, C2.4). Each rubric is versioned data, not
// prose: bump `version` when axes or weights change, and bump `promptVersion`
// when the shared scoring prompt wording in api/_lib/aiJudge.ts changes. The
// grading model is AI_MODEL (grok-4-1-fast-non-reasoning) in api/_lib/grok.ts;
// a model change is a calibration re-run (PRD C3.5), not a rubric edit - the
// promptVersion/AI_MODEL pair is what the aijudge_scored payload records so
// tripwires T2/T3 can tell the three apart.
//
// Calibration history against the 10 hand-graded fixtures (2026-10-19,
// three endpoint runs): p1 unanchored averaged 15.4 weighted points generous,
// p2 scale anchors 12.8, p3 explicit tier bands 11.6 - the acceptance rule's
// one-point bar is out of reach for this fast non-reasoning grading model, so
// acceptance now rides band agreement (C3.5). p4 restores the p2 wording,
// which held the best band agreement and the tightest bottom anchors; p3's
// tier bands cost band agreement without fixing mid-grade inflation.
//
// Rubric ids are contract-fixed: the launch challenges are authored against
// 'support-bot-design', 'eval-criteria-writing', and 'finetune-vs-prompt',
// and the 9-gap diagnosis prompts grade against 'gap-diagnosis'. Renaming an
// id re-versions every score ever logged under it, so do not rename.
//
// Weights sum to 1.0 and are validated at module load, not by the type
// system (C2.4): an invalid sum throws on import, so a bad edit fails the
// build and the test suite rather than shipping skewed totals.
const SUPPORT_BOT_DESIGN = {
    id: 'support-bot-design',
    version: 1,
    promptVersion: 'p4',
    axes: [
        {
            axis: 'architecture-fit',
            weight: 0.25,
            maxPoints: 10,
            descriptor: 'The design names a concrete pipeline (retrieval, generation, response surface) and its parts fit the stated support volume and audience.',
        },
        {
            axis: 'retrieval-quality',
            weight: 0.25,
            maxPoints: 10,
            descriptor: 'Retrieval choices such as chunking, top-k, reranking, or keyword versus semantic matching are justified against the real failure: fetching the wrong document.',
        },
        {
            axis: 'failure-handling',
            weight: 0.2,
            maxPoints: 10,
            descriptor: 'The design says what happens when retrieval finds nothing or the model invents an answer, with a deflection or refusal path instead of a confident wrong reply.',
        },
        {
            axis: 'evaluation-plan',
            weight: 0.15,
            maxPoints: 10,
            descriptor: 'The design names a measurable checklist or fixed question set that would show the bot answering better after a change.',
        },
        {
            axis: 'cost-awareness',
            weight: 0.15,
            maxPoints: 10,
            descriptor: 'Per-message token cost reasoning appears where it changes a decision, such as a context cap or a smaller model, not as decoration.',
        },
    ],
};
const EVAL_CRITERIA_WRITING = {
    id: 'eval-criteria-writing',
    version: 1,
    promptVersion: 'p4',
    axes: [
        {
            axis: 'specificity',
            weight: 0.25,
            maxPoints: 10,
            descriptor: 'Criteria name observable behaviors in the response rather than adjectives like good or helpful that any grader can stretch.',
        },
        {
            axis: 'failure-coverage',
            weight: 0.25,
            maxPoints: 10,
            descriptor: 'Criteria cover the failure modes the task makes cheap and dangerous, including one a casual reviewer would miss.',
        },
        {
            axis: 'measurability',
            weight: 0.2,
            maxPoints: 10,
            descriptor: 'Each criterion can be checked by a stated method, such as fixed inputs, known-good outputs, or a numeric rule, rather than by taste.',
        },
        {
            axis: 'bias-awareness',
            weight: 0.15,
            maxPoints: 10,
            descriptor: 'The criteria anticipate grading bias and say how verbosity, confident tone, or ties would be kept from inflating scores.',
        },
        {
            axis: 'priority-order',
            weight: 0.15,
            maxPoints: 10,
            descriptor: 'Criteria are ordered by what breaks the product worst, and that order is defended in a sentence.',
        },
    ],
};
const FINETUNE_VS_PROMPT = {
    id: 'finetune-vs-prompt',
    version: 1,
    promptVersion: 'p4',
    axes: [
        {
            axis: 'behavior-diagnosis',
            weight: 0.3,
            maxPoints: 10,
            descriptor: 'The answer names the broken behavior and the layer that owns it before reaching for a fix.',
        },
        {
            axis: 'decision-boundary',
            weight: 0.25,
            maxPoints: 10,
            descriptor: 'The fine-tune-versus-prompt reasoning cites the real boundary: behavior like format and style tunes well, facts do not, and prompting wins when behavior is already fine.',
        },
        {
            axis: 'cost-framing',
            weight: 0.2,
            maxPoints: 10,
            descriptor: 'Data collection, retraining, and serving costs are named with their consequence rather than as a vague expense.',
        },
        {
            axis: 'risk-acknowledgment',
            weight: 0.15,
            maxPoints: 10,
            descriptor: 'The answer addresses what the chosen path cannot fix and what observation would show that guess was wrong.',
        },
        {
            axis: 'verification-plan',
            weight: 0.1,
            maxPoints: 10,
            descriptor: 'A concrete way to prove the chosen path worked, such as before/after grading on a fixed set, appears in the answer.',
        },
    ],
};
const GAP_DIAGNOSIS = {
    id: 'gap-diagnosis',
    version: 1,
    promptVersion: 'p4',
    axes: [
        {
            axis: 'gap-identification',
            weight: 0.3,
            maxPoints: 10,
            descriptor: 'The diagnosis names the one gap that explains the symptom instead of listing every gap the system could ever have.',
        },
        {
            axis: 'evidence-use',
            weight: 0.25,
            maxPoints: 10,
            descriptor: 'The diagnosis cites the observable evidence given in the prompt, such as trace lines, counts, or cache hits, and says what each rules out.',
        },
        {
            axis: 'alternative-elimination',
            weight: 0.2,
            maxPoints: 10,
            descriptor: 'A plausible-but-wrong gap is explicitly ruled out, and the ruling-out is stated rather than implied.',
        },
        {
            axis: 'remediation',
            weight: 0.15,
            maxPoints: 10,
            descriptor: 'The next action is specific to the named gap and sized to what is known, not a recital of general best practices.',
        },
        {
            axis: 'verification-plan',
            weight: 0.1,
            maxPoints: 10,
            descriptor: 'The plan says what observation after the change would confirm or refute the diagnosis.',
        },
    ],
};
export const AI_JUDGE_RUBRICS = {
    'support-bot-design': SUPPORT_BOT_DESIGN,
    'eval-criteria-writing': EVAL_CRITERIA_WRITING,
    'finetune-vs-prompt': FINETUNE_VS_PROMPT,
    'gap-diagnosis': GAP_DIAGNOSIS,
};
// Load-time validation (C2.4: weights validated at module load, not by the
// type system). Throws on any bad rubric so a broken edit fails the build.
export function validateRubric(rubric) {
    if (!rubric.id || rubric.id.length > 64) {
        throw new Error(`aiJudgeRubrics: id "${String(rubric.id).slice(0, 32)}" must be 1-64 chars`);
    }
    if (!Number.isInteger(rubric.version) || rubric.version < 1) {
        throw new Error(`aiJudgeRubrics: ${rubric.id} version must be an integer >= 1`);
    }
    if (!rubric.promptVersion || rubric.promptVersion.length > 32) {
        throw new Error(`aiJudgeRubrics: ${rubric.id} promptVersion must be 1-32 chars`);
    }
    if (rubric.axes.length < 3 || rubric.axes.length > 6) {
        throw new Error(`aiJudgeRubrics: ${rubric.id} needs 3-6 axes, has ${rubric.axes.length}`);
    }
    let weightSum = 0;
    for (const axis of rubric.axes) {
        if (!axis.axis || axis.axis.length > 64) {
            throw new Error(`aiJudgeRubrics: ${rubric.id} axis slug must be 1-64 chars`);
        }
        if (!Number.isFinite(axis.weight) || axis.weight <= 0 || axis.weight > 1) {
            throw new Error(`aiJudgeRubrics: ${rubric.id} axis "${axis.axis}" weight must be in (0, 1]`);
        }
        weightSum += axis.weight;
        if (!Number.isInteger(axis.maxPoints) || axis.maxPoints < 1 || axis.maxPoints > 10) {
            throw new Error(`aiJudgeRubrics: ${rubric.id} axis "${axis.axis}" maxPoints must be an integer 1-10`);
        }
        if (!axis.descriptor || axis.descriptor.length > 300) {
            throw new Error(`aiJudgeRubrics: ${rubric.id} axis "${axis.axis}" descriptor must be 1-300 chars`);
        }
    }
    // Float-authoring tolerance: 0.3 + 0.25 + ... lands within 1e-9 of 1.0.
    if (Math.abs(weightSum - 1) > 1e-9) {
        throw new Error(`aiJudgeRubrics: ${rubric.id} weights sum to ${weightSum}, must sum to 1.0`);
    }
}
for (const rubric of Object.values(AI_JUDGE_RUBRICS)) {
    validateRubric(rubric);
}
// Rubric lookup for the endpoint and the calibration script. Returns undefined
// for an unknown id - the route turns that into a 400 (C3.2).
export function getRubric(rubricId) {
    return AI_JUDGE_RUBRICS[rubricId];
}
