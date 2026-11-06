// Fine-tuning decision topic (AI track, unit 7 lane). One topic with three
// pure-Python challenges, matching the AiTopic shape in aiTopics.ts: track
// 'ai', keyTradeoffs instead of bigO, no packages (the Pyodide runner needs
// none). The topic lives in its own file so aiTopics.ts stays at its pinned
// six; wiring into the registry and the page spine is owned by integration.
//
// Voice contract: the reader has used ChatGPT and nothing else, so every term
// is defined at first use in one plain sentence anchored in something
// familiar. No em dashes, no exclamation marks, no banned words anywhere.
import { AI_JUDGE_RUBRICS } from './aiJudgeRubrics.js';
const FINETUNING_DECISION = {
    id: 'finetuning-decision',
    title: 'Fine-Tuning: When, and Why',
    category: 'concepts',
    icon: 'GraduationCap',
    difficulty: 3,
    track: 'ai',
    description: 'Picture a specific morning. Your support inbox fills with replies from the AI assistant your team switched on last month, and a customer has written in because the assistant told them refunds take fourteen days, when your policy changed to seven. Nothing is broken. The model is doing, very competently, exactly what it learned to do before your product existed. Fine-tuning is the name for one of the ways you could respond: take a model that already works and continue its training on thousands of your own examples, so its default behavior shifts and it starts answering the way your product should answer without being asked every time. That is different from the two moves you already know. A prompt is a request, and a request has to be repeated on every single call; retrieval is looking things up, and looking things up solves missing facts. Training changes the default itself: the patterns land in the weights, the model\'s adjustable settings, the ones that were set when the model learned the first time. The honest headline of this whole topic is a ladder. Better prompting costs nearly nothing and is the right first move almost every time. Adapter tuning, the light kind, where you train a small add-on called a LoRA (a low-rank adapter, a small add-on trained while the base model stays frozen) costs a little and needs a few thousand cleaned, labeled examples, examples where someone wrote down the answer that was wanted. A full fine-tune, where every core weight moves, costs a lot, eats your week, and almost no product ever needs one. Tuning can only teach what your examples show, so with messy examples you pay to teach the model your mistakes, and with facts that change weekly no amount of training can keep up, because a trained model is a snapshot. That is the shape of the classic interview question, RAG or fine-tune or a better prompt: knowledge that changes points to retrieval, style and format the model keeps getting wrong points to tuning or to a careful prompt, and no data points to neither. Whatever you pick, you prove it the same way every time: run the eval set, a batch of typical questions with known-good answers, before the change and after, and compare. One more word worth carrying into interviews: distillation, which means training a small model to imitate a big one on one narrow job, to cut the cost per answer. The challenges below grade the parts you can write down: the route rule as code, the arithmetic of what an adapter run actually costs, the audit that keeps a spoiled example out of your training pool, and one written decision, graded against a published rubric, on the fine-tune versus the prompt.',
    keyPoints: [
        'Fine-tuning changes the default, not the instructions: the patterns from your examples land in the weights (the model\'s adjustable settings), so the behavior carries into every future call without being repeated. A prompt has to be re-sent and re-followed on every call, which is the whole difference',
        'The cost ladder reads: a better prompt costs nearly nothing, LoRA adapter tuning costs a little (a small add-on trained while the base model stays frozen, plus a data pipeline and an eval harness), and a full fine-tune of every weight costs a lot and is almost never the product answer',
        'Training copies your examples, including their mistakes: blanks, unvalidated labels, and duplicates in the training pool all come back out as behaviors the model now performs more confidently',
        'A fine-tuned model is a snapshot: facts that stay true for days belong in retrieval, where the answer is built from information that is still true at question time',
        'Whatever route you pick, the proof is the same eval set measured before and after the change. A number you have no before-shot for is not evidence, and the interviewer will ask for exactly that',
        'Distillation is the one-sentence shortcut: train a small model to imitate a big one on one narrow job, and the cost per answer drops with it',
    ],
    keyTradeoffs: [
        {
            axis: 'A default you train vs a request you write',
            tension: 'A tuned adapter holds the behavior in the model, so it keeps applying even when nobody is watching, and it costs a tuning run, a data set, and a re-run whenever the behavior has to change. A prompt costs a rewrite, but it must be re-sent on every call and followed, not just received.',
        },
        {
            axis: 'Snapshots in the weights vs current facts in storage',
            tension: 'Training puts a copy of your examples into the model and cannot keep pace with information that changes weekly. Retrieval serves whatever is true right now but cannot change how the model writes. Products that work use both, sorted by whether the problem is knowing or sounding.',
        },
        {
            axis: 'More examples vs cleaner examples',
            tension: 'A bigger pool teaches more variety, and a cleaned pool teaches fewer wrong habits. An audit that drops blank texts, unvalidated labels, and duplicates is usually worth more to the final answer than another week of collecting.',
        },
    ],
    pythonExample: `# The route rule, as code. A prompt is a request, retrieval is a lookup,
# and fine-tuning is training: continuing a model's training on your own
# examples so its default behavior shifts.
def route(labeled_examples, knowledge_stays_true_days, prompt_already_works):
    if prompt_already_works:
        return "prompt"           # the cheapest thing that works wins
    if knowledge_stays_true_days <= 7:
        return "retrieval"        # facts that move weekly must be looked up
    if labeled_examples >= 1000:
        return "finetune"         # a habit prompts could not instill
    return "collect-more-data"    # a few examples teach a few sentences

print(route(4000, 400, False))   # finetune
print(route(2600, 3, False))     # retrieval
print(route(300, 365, True))     # prompt
print(route(60, 365, False))     # collect-more-data

# The cost ladder folds into one multiplication each. Fictional numbers,
# chosen so the ladder reads clearly; no vendor price is quoted anywhere.
def tune_cost(examples, epochs, per_1k_usd, setup_usd):
    return round(setup_usd + (examples / 1000) * per_1k_usd * epochs, 2)

print(tune_cost(4000, 3, 55, 240))   # 900.0 for a full adapter run
`,
    challenges: [
        {
            id: 'finetune-vs-prompt-math',
            title: 'Route the Request',
            difficulty: 'medium',
            description: 'A teammate brings you a model problem, and the meeting wants a decision today: better prompt, retrieval, or fine-tune. Interviewers ask it in exactly that phrasing, and the defensible answer is not a vibe; it is a fixed route rule you can state before anyone opens a laptop. The rule runs cheapest-first. A carefully written prompt, one that states the format and shows worked examples, is the cheapest thing that can work, so when one already does the job, everything else is spending to feel busy. When the problem is knowledge that goes stale, facts that stop being true within days, no prompt can carry them, because the person writing the prompt does not know next week either, and training bakes in a snapshot that is dated the day it finishes; that is exactly what retrieval, the build-time habit of looking the current facts up at question time, is for. When the problem is a habit, a repeating style or format that serious prompt work demonstrably could not fix, fine-tuning is the tool, and it is only rational once you hold enough labeled examples, texts paired with the answer that was wanted, for the run to learn the habit instead of memorizing your few. The bar this route uses is one thousand cleaned examples. Implement decide_route(labeled_examples, drift_days, prompt_already_works): labeled_examples is the count of cleaned examples you can train on; drift_days is how many days your facts stay true before they change, and use 365 for knowledge that effectively never moves; prompt_already_works is a boolean, true when prompt work already does the job. Return one string, decided in this fixed order: prompt when prompt_already_works is true; otherwise retrieval when drift_days is at most 7; otherwise finetune when labeled_examples is at least 1000; otherwise collect-more-data. The fixed order is the interview answer, because checking the expensive tool first is how tuning projects get funded for problems a rewrite would have solved.',
            starterCode: `def decide_route(labeled_examples, drift_days, prompt_already_works):
    # The fixed order is the interview answer. The cheapest thing that
    # works wins:
    #   1. prompt_already_works              -> 'prompt'
    #   2. facts go stale within 7 days      -> 'retrieval'
    #   3. at least 1,000 cleaned examples   -> 'finetune'
    #   4. otherwise                         -> 'collect-more-data'
    pass

# Test
print(decide_route(4000, 400, True))    # prompt
print(decide_route(2600, 3, True))      # prompt
print(decide_route(2600, 3, False))     # retrieval
print(decide_route(4000, 365, False))   # finetune
print(decide_route(1000, 365, False))   # finetune
print(decide_route(60, 365, False))     # collect-more-data
print(decide_route(999, 365, False))    # collect-more-data
`,
            testCases: [
                {
                    input: 'decide_route(4000, 400, True)',
                    expected: 'prompt',
                },
                {
                    input: 'decide_route(2600, 3, True)',
                    expected: 'prompt',
                },
                {
                    input: 'decide_route(2600, 3, False)',
                    expected: 'retrieval',
                },
                {
                    input: 'decide_route(4000, 365, False)',
                    expected: 'finetune',
                },
                {
                    input: 'decide_route(1000, 365, False)',
                    expected: 'finetune',
                },
                {
                    input: 'decide_route(60, 365, False)',
                    expected: 'collect-more-data',
                },
                {
                    input: 'decide_route(999, 365, False)',
                    expected: 'collect-more-data',
                },
            ],
            hints: [
                'Check prompt_already_works first. When the cheapest tool already does the job, the other two branches never run, even for drifting facts, even for a huge example pool.',
                'The drift branch owns every stale-knowledge case before the example count is read, so 2,600 examples with weekly drift still route to retrieval. The order is not decoration: reordering the branches changes the answers.',
                'The fifth case is the boundary: exactly 1,000 qualifies for tuning, because the bar in this route is at-or-over. 999 falls through to collect-more-data.',
            ],
            optimalComplexity: { time: 'O(1)', space: 'O(1)' },
            tags: ['decision-routing', 'rag-vs-finetune', 'cost-ladder', 'ai-track'],
        },
        {
            id: 'lora-cost-estimate',
            title: 'Adapter Cost Estimate',
            difficulty: 'easy',
            description: 'Before anyone in the room hears the word fine-tune, they will ask one question: what does the training bill come to. Estimating it takes three numbers and one multiplication, and doing it in public is worth the discipline, because a concrete figure turns a vague want into a budget line someone can approve or refuse. The usual plan is not training every weight in the model, a full fine-tune, which costs so much in machine time and babysitting that almost no product runs one. It is adapter tuning with a LoRA, a low-rank adapter: a small add-on trained while the base model stays frozen. You pay two things. One is setup, the engineering hours to clean examples and build the eval harness, billed once. The other is the training itself, priced per thousand examples per pass over the set, and each full pass is called an epoch; an adapter run usually wants a few. Implement tune_budget(examples, epochs, per_1k_usd, setup_usd): examples is the count of cleaned examples, epochs the number of passes, per_1k_usd the price of training one thousand examples for one pass, and setup_usd the one-time engineering bill. Return a two-item list: the total cost rounded to 2 decimal places, and the cost per single example rounded to 4. The per-example figure is the one that settles arguments: a large pool spreads the fixed setup cost across many examples, so the same project prices very differently at 800 examples than at 8,000.',
            starterCode: `def tune_budget(examples, epochs, per_1k_usd, setup_usd):
    # Two lines of arithmetic. The training bill is setup plus price per
    # 1,000 examples per pass, times the number of passes over the set.
    # The per-example figure is the settle-the-argument number: a bigger
    # pool spreads the fixed setup line across more examples.
    pass

# Test
print(tune_budget(4000, 3, 55, 240))     # [900.0, 0.225]
print(tune_budget(800, 3, 55, 240))      # [372.0, 0.465]
print(tune_budget(4000, 1, 55, 240))     # [460.0, 0.115]
print(tune_budget(8000, 3, 55, 240))     # [1560.0, 0.195]
print(tune_budget(3000, 2, 33.33, 100))  # [299.98, 0.1]
`,
            testCases: [
                {
                    input: 'tune_budget(4000, 3, 55, 240)',
                    expected: '[900.0, 0.225]',
                },
                {
                    input: 'tune_budget(800, 3, 55, 240)',
                    expected: '[372.0, 0.465]',
                },
                {
                    input: 'tune_budget(4000, 1, 55, 240)',
                    expected: '[460.0, 0.115]',
                },
                {
                    input: 'tune_budget(8000, 3, 55, 240)',
                    expected: '[1560.0, 0.195]',
                },
                {
                    input: 'tune_budget(3000, 2, 33.33, 100)',
                    expected: '[299.98, 0.1]',
                },
            ],
            hints: [
                'The total is one expression: setup_usd + (examples / 1000) * per_1k_usd * epochs. Keep the division by 1000, because the price is quoted per thousand examples.',
                'Round the two outputs separately, total to 2 places and per-example to 4. At 3,000 examples the per-example figure is about 0.09999 before rounding, and round(value, 4) lands it on 0.1.',
                'Compare the first and third cases: the same pool and price with three passes instead of one scales only the training term, never the setup. If your numbers move the setup line, the fixed cost slid into the loop.',
            ],
            optimalComplexity: { time: 'O(1)', space: 'O(1)' },
            tags: ['lora', 'cost-estimate', 'cost-ladder', 'ai-track'],
        },
        {
            id: 'training-data-audit',
            title: 'Training Data Audit',
            difficulty: 'medium',
            description: 'A fine-tune teaches the model whatever its examples show, so the example pool is the product before the model is. The team has collected labeled examples, each a customer text paired with the label that was wanted for it, and a tuning run is booked. Before anything trains, the pool needs one passing audit, because the three ways a pool spoils are all quiet. A blank text where the content got lost teaches nothing and dilutes everything else. A label nobody validated is the most expensive defect in the file, because it is a lesson in your mistake, delivered with confidence. And the same ticket pasted twice quietly weights that one example as if several people had written it. Every one of them survives a naive run and comes back out as behavior, only now rehearsed. Implement audit_examples(records, valid_labels): each record is a dict with a text and a label, and valid_labels is the exact list of labels this run accepts. Walk the records in order and return the indexes worth dropping: a text that is empty or nothing but whitespace; a label not in the accepted set, checked exactly, so a stray capital letter fails it; and any text that exactly repeats the text of a record you kept earlier. Judge duplicates against texts that survived, so a record already dropped on some other rule does not establish its text. Return the list of dropped indexes in input order, and read the last case carefully: an empty pool returns an empty list, not an error, because an audit that crashes on nothing audits nothing.',
            starterCode: `def audit_examples(records, valid_labels):
    # One pass, three quiet ways a pool spoils:
    #   - blank text (empty, or nothing but whitespace)
    #   - a label not exactly in the accepted set
    #   - a text exactly repeating one from a record you kept earlier
    # Duplicates are judged against texts that survived. Return the
    # dropped indexes, in input order.
    pass

# Test
print(audit_examples([{"text": "Please refund my order", "label": "refund"}, {"text": "Please refund my order", "label": "refund"}, {"text": " ", "label": "refund"}, {"text": "Where is my package", "label": "shipping"}, {"text": "Cancel my subscription", "label": "cancle"}, {"text": "Where is my package", "label": "shipping"}], ["refund", "shipping", "cancel"]))  # [1, 2, 4, 5]
print(audit_examples([{"text": "Reset my password", "label": "account"}, {"text": "", "label": "account"}, {"text": "I cannot log in", "label": "login"}], ["account", "login"]))  # [1]
print(audit_examples([{"text": "Same thing", "label": "billing"}, {"text": "Same thing", "label": "billing"}, {"text": "Same thing", "label": "billing"}], ["billing"]))  # [1, 2]
print(audit_examples([{"text": "Close my account", "label": "Refund"}, {"text": "Close my account", "label": "close"}], ["refund", "close"]))  # [0]
print(audit_examples([], ["refund"]))  # []
`,
            testCases: [
                {
                    input: 'audit_examples([{"text": "Please refund my order", "label": "refund"}, {"text": "Please refund my order", "label": "refund"}, {"text": " ", "label": "refund"}, {"text": "Where is my package", "label": "shipping"}, {"text": "Cancel my subscription", "label": "cancle"}, {"text": "Where is my package", "label": "shipping"}], ["refund", "shipping", "cancel"])',
                    expected: '[1, 2, 4, 5]',
                },
                {
                    input: 'audit_examples([{"text": "Reset my password", "label": "account"}, {"text": "", "label": "account"}, {"text": "I cannot log in", "label": "login"}], ["account", "login"])',
                    expected: '[1]',
                },
                {
                    input: 'audit_examples([{"text": "Same thing", "label": "billing"}, {"text": "Same thing", "label": "billing"}, {"text": "Same thing", "label": "billing"}], ["billing"])',
                    expected: '[1, 2]',
                },
                {
                    input: 'audit_examples([{"text": "Close my account", "label": "Refund"}, {"text": "Close my account", "label": "close"}], ["refund", "close"])',
                    expected: '[0]',
                },
                {
                    input: 'audit_examples([], ["refund"])',
                    expected: '[]',
                },
            ],
            hints: [
                'Three checks per record, in one fixed pass: blank text (strip it, then test for empty), a label failing an exact membership test in the accepted set, and a text already kept. Three ifs in order is the whole shape.',
                'The strip is the trap the second case carries: a text of spaces is not empty, and a length check without str.strip() sails it into training. An audit is a filter before it is anything else.',
                'Duplicates are judged against records your audit kept. In the fourth case, index 0 drops on a failed label and its text never registers, so the same text at index 1 passes with its good label. Keep one set of seen texts and add to it only on a keep.',
            ],
            optimalComplexity: { time: 'O(number of records)', space: 'O(number of records)' },
            tags: ['data-cleaning', 'labeled-examples', 'training-data', 'ai-track'],
        },
        {
            // P2.14: written decision challenge, graded by a model against the
            // published 'finetune-vs-prompt' rubric (PRD C2.4). The axes are the
            // rubric's own objects, imported rather than copied, so the
            // pre-submission list can never drift from what the grader scores.
            id: 'finetune-vs-prompt',
            title: 'The Fine-Tune Decision',
            difficulty: 'hard',
            description: 'The route rule above is code, and the version a hiring manager wants is prose: what would you do, and how would you argue for it when half the room wants the word fine-tune in the plan. This challenge is that question, graded the way the interview would grade it. Submit your decision as text, and a model reads it against the published finetune-vs-prompt rubric shown in the editor panel - naming the broken behavior and the layer that owns it, walking the ladder in cost order, pricing the maintenance the choice creates, and saying how the rollout would be proven.',
            responsePrompt: 'The assistant your team runs answers refund questions from a prompt plus the policy wiki. The breaking case: since the policy changed, the assistant keeps telling customers refunds take fourteen days when the correct window is seven, and the ticket volume for that question is about 200 a week. Prompt edits have not fixed it; the wording is now explicit, the current date is in the prompt, the wiki page is correct, and the wrong answer still appears on roughly one ticket in five. Decide: better prompt, retrieval, or fine-tune. Write the reasoning, not just the pick. Name the layer you think owns the failure and what evidence you have from the case; walk the ladder in cost order and say where the fix lives on it; price the maintenance any tuning alternative creates (data collection, re-runs when behavior changes, the harness proving it after each change); and give the rollout plan: what stays on standby, what gate the change runs behind, and what observation makes you revert.',
            starterCode: `# Design challenge: submit written prose, not code. Replace the draft
# below with your own decision on the fourteen-days-versus-seven case.

# Where the failure lives:
# The ladder, in cost order, and where the fix belongs:
# What the choice costs to keep:
# The rollout and the revert signal:
`,
            testCases: [],
            hints: [
                'Start with the diagnosis the rubric weights highest: the wiki carries the true fact and the model still answers from its old default, which is a behavior failure, not a missing-knowledge failure. Say which layer owns it before reaching for a fix.',
                'The ladder runs cheapest-first for a reason: a fine-tune would spend weeks teaching a fact that changed once, and one policy rewrite re-dates the snapshot. The defensible decision names what evidence would have made the tuning rung right.',
                'Whatever you pick, the maintenance question is live: data collection, re-tuning on the next policy change, and the before/after eval set are all named costs with consequences, not a vague word like overhead.',
            ],
            optimalComplexity: { time: 'N/A', space: 'N/A' },
            tags: ['rag-vs-finetune', 'decision-criteria', 'ai-judge', 'ai-track'],
            grading: {
                kind: 'aiJudge',
                rubricId: 'finetune-vs-prompt',
                axes: AI_JUDGE_RUBRICS['finetune-vs-prompt'].axes,
            },
        },
    ],
    visualizationType: 'chart',
};
export const finetuneTopic = FINETUNING_DECISION;
export const finetuneTopics = [FINETUNING_DECISION];
export function getFinetuneTopicById(id) {
    return finetuneTopics.find((t) => t.id === id);
}
