// Unit 6 of the AI track: prompts and context windows, in the same
// pure-Python-only form as the base aiTopics file (the Pyodide runner needs
// no packages). The topic lives in its own file per the units-6-8 split; the
// topicRegistry glob picks it up - this file exports the topic object only
// and never imports the registry.
//
// All challenge values below were verified against scripts/case-runner.py,
// the line-for-line mirror of the live Pyodide grading: every reference
// solution passes every test case and every starter fails them.
const PROMPTING_CONTEXT = {
    id: 'prompting-context',
    title: 'Prompting & Context Windows',
    category: 'concepts',
    icon: 'MessageSquare',
    difficulty: 2,
    track: 'ai',
    description: 'You have typed the same question into a chat window twice, gotten two different answers, and watched a third rewording produce a third answer. Nothing about the model changed between those calls. What changed was the wording - and the wording is close to the whole input the model ever sees. That input is the prompt: the entire text sent with each call, your question plus every instruction and worked example around it. It matters because a model reads a fixed amount of text per call, called the context window, counted in tokens, the word-sized pieces models are measured in at roughly 4 characters each; everything you send counts against the window, and so does everything the model writes, and when the count runs out the oldest text drops silently, exactly like a capped log buffer, with no error anywhere. Two skills inside prompting carry the interview weight. One is format control: a program can only route on replies whose shape it can read, and there are two ways to get the shape, describing the rule in prose, which models follow loosely, and few-shot examples, worked question and answer pairs shown instead of described, which anchor the format at the price of tokens carried on every call. The other is the skill interviewers probe hardest: when you change the wording, prove the change made it better before anyone ships it, the same fixed question set graded under the old wording and the new - show me you would not ship a prompt change on vibes. The three challenges below build exactly that: the swap audit that catches what a single pass rate hides, the packing rule that keeps the most recent turns inside the window, and the label contract that shows what format control has to survive.',
    keyPoints: [
        'The prompt is the entire text sent with each call - the question, the instructions around it, and any worked examples - and every word of it is input; there is no channel where the question matters and the surrounding text does not',
        'The context window is the fixed amount of text a model can read per call, counted in tokens at roughly 4 characters each; what the prompt sends and what the model writes back both count against it, and overflow drops the oldest text silently',
        'The same question under different wording gets different answers because the wording is the input - which makes an unmeasured prompt change exactly as dangerous as an unmeasured code change',
        'Few-shot examples pin the output shape where a described rule leaves it loose: worked pairs show the format models copy, and the price is that their tokens are carried on every single call',
        'The interview-ready habit is the fixed question set: grade the old wording and the new wording on the same examples, compare the pass rates, and always name the questions the change broke',
    ],
    keyTradeoffs: [
        {
            axis: 'Describing the rule vs showing examples',
            tension: 'A prose rule costs few tokens once and speaks to every kind of question loosely, and a few-shot block costs tokens on every call and sets the reply shape exactly - while quietly biasing answers toward whatever label the examples lean on.',
        },
        {
            axis: 'Reply freedom vs reply shape',
            tension: 'A model free to write prose reads like a person and parses like nothing, and a label-first contract reads stiff and hands routing code something it can branch on; every sentence of reason you allow after the label is one more place for the shape to drift.',
        },
        {
            axis: 'Room for examples vs room for conversation',
            tension: 'The same per-call text budget holds the worked examples that steady the reply shape and the conversation turns a real ticket needs; examples grow the shared block that repeats on every call, so the block that locks the format can crowd out the history that carries the context, and the overflow never announces itself.',
        },
    ],
    pythonExample: `# A prompt is text you can measure: build it, estimate its tokens, and
# check the reply shape before routing code ever sees it.
def estimate_tokens(text):
    # Roughly 4 characters per token for English, rounded up.
    return (len(text) + 3) // 4

INSTRUCTIONS = ("Read the question and label it. One word first, "
    "either refund or no-refund, then one short sentence of reason.")

EXAMPLES = [("Where do I download an invoice?", "no-refund"),
    ("You billed my card twice for order 5512.", "refund")]

def build_prompt(examples, question):
    # Each worked pair anchors the reply shape: label first, reason after.
    shots = "".join("Q: " + q + "\\nA: " + a + "\\n" for q, a in examples)
    return INSTRUCTIONS + "\\n" + shots + "Q: " + question + "\\nA:"

prompt = build_prompt(EXAMPLES, "The premium charge went through twice.")
print(estimate_tokens(prompt))
print(prompt)

def read_label(answer):
    # The contract routing code relies on: first word, punctuation
    # stripped, lowercased, one of the two labels.
    first = answer.split()[0].strip(".,;:").lower()
    if first == "refund" or first == "no-refund":
        return first
    return "unparseable"

replies = ["Refund. One order was billed twice.",
    "no-refund. Receipts download from the billing page.",
    "I would not refund anything here."]
print([read_label(a) for a in replies])
`,
    challenges: [
        {
            id: 'prompt-swap-audit',
            title: 'Prompt Swap Audit',
            difficulty: 'medium',
            description: 'The wording of a prompt is code, and swapping it deserves a code-review discipline: the same fixed question set graded under the old wording and the new, so the comparison is apples to apples. In production this looks like a spreadsheet of questions with a pass or fail column per wording; here it is two boolean lists. Implement prompt_audit(before, after): both lists record how the same questions were graded under the old prompt and the new one, True for a question that passed, in order, and the lists always have the same length. Return [old_rate, new_rate, broken], where each rate is the True count divided by the list length rounded to 4 decimal places, and broken counts the positions where before is True and after is False - the questions the swap silently broke, the piece a single pass-rate comparison hides, because a new wording can move a point up while pushing two others out the back door. Two lists of equal length, one pass in each direction, and the audit reports exactly what a real prompt change review should: did the rate move, and who paid for it. An empty list means no questions were graded, and an audit of nothing is zeros, not a crash.',
            starterCode: `def prompt_audit(before, after):
    # before[i] and after[i] grade the SAME question i under the old
    # wording and the new wording: True = passed.
    # Return [old_rate, new_rate, broken]:
    #   old_rate, new_rate: True count / length, rounded to 4 decimals
    #   broken: positions where before is True and after is False
    pass

# Test
print(prompt_audit([True, True, True, True, True, True, True, True],
    [True, True, True, True, True, True, True, True]))  # [1.0, 1.0, 0]
print(prompt_audit([True, False, True, False], [True, True, True, True]))  # [0.5, 1.0, 0]
print(prompt_audit([True, True, False, False, True, False],
    [True, True, True, True, False, False]))  # [0.5, 0.6667, 1]
print(prompt_audit([True, True, True, False], [True, False, True, False]))  # [0.75, 0.5, 1]
print(prompt_audit([True, True, False, True, True, False],
    [True, False, True, True, False, True]))  # [0.6667, 0.6667, 2]
print(prompt_audit([], []))  # [0.0, 0.0, 0]
`,
            // Inputs carry the booleans inline: the runner grades case arguments
            // with ast.literal_eval, which accepts pure literals only.
            testCases: [
                {
                    input: 'prompt_audit([True, True, True, True, True, True, True, True], [True, True, True, True, True, True, True, True])',
                    expected: '[1.0, 1.0, 0]',
                },
                {
                    input: 'prompt_audit([True, False, True, False], [True, True, True, True])',
                    expected: '[0.5, 1.0, 0]',
                },
                {
                    input: 'prompt_audit([True, True, False, False, True, False], [True, True, True, True, False, False])',
                    expected: '[0.5, 0.6667, 1]',
                },
                {
                    input: 'prompt_audit([True, True, True, False], [True, False, True, False])',
                    expected: '[0.75, 0.5, 1]',
                },
                {
                    input: 'prompt_audit([True, True, False, True, True, False], [True, False, True, True, False, True])',
                    expected: '[0.6667, 0.6667, 2]',
                },
                { input: 'prompt_audit([], [])', expected: '[0.0, 0.0, 0]' },
            ],
            hints: [
                'The rate is a plain True-count over length, and the fourth test case shows why the audit exists at all: the rate fell AND a question broke - a before-only win that the new wording lost.',
                'The fifth test case is the tie that is not a tie: both rates say 0.6667 and two questions still broke. A single pass-rate comparison would ship this swap and say nothing.',
                'Empty question lists grade nothing, so return the zero audit [0.0, 0.0, 0] before any division - the alternative in real reviews is a crash on the one prompt nobody pilot-tested.',
            ],
            optimalComplexity: { time: 'O(number of questions)', space: 'O(1)' },
            tags: ['evals', 'prompt-changes', 'regression-audit', 'ai-track'],
        },
        {
            id: 'context-window-pack',
            title: 'Context Window Pack',
            difficulty: 'easy',
            description: 'A context window is a fixed budget, and a production assistant spends it in a fixed order: the system instructions always ride along on every call, then as much of the conversation as the budget can still hold. When a new message arrives, the practical question has an exact shape - how many recent turns fit, and what does the call cost. This challenge builds that trim step the way every chat client and agent harness implements it. Implement trim_history(turns, budget, system_tokens): turns is the token count of each conversation turn in chronological order, oldest first, and every turn counts, because what the model wrote is text in the window just as much as what the user typed; budget is the window size for one call, and system_tokens is the instruction prefix that is always kept. Keep the MOST RECENT turns, walking backward from the newest and keeping turns consecutively - no skipping a turn in the middle to squeeze in an older one, which would hand the model a conversation with a hole in it - and stop at the first turn that does not fit. Return [kept, used] where used equals system_tokens plus the sum of the kept turn tokens. If the budget cannot hold the system tokens alone, the call is under-provisioned and the honest answer is zero turns kept with the system tokens reported as used - never a truncated system prompt, because silently damaged instructions are worse than a loud failure. The boundary matters: a turn landing exactly on the remaining budget fits.',
            starterCode: `def trim_history(turns, budget, system_tokens):
    # turns: per-turn token counts, chronological order (oldest first).
    # budget: the window for one call. system_tokens: the instruction
    # prefix kept on every call.
    # Keep the MOST RECENT turns from the end, consecutively, stopping at
    # the first turn that does not fit. Return [kept, used] where
    # used = system_tokens + sum of kept turns.
    pass

# Test
print(trim_history([80, 120, 60, 100], 400, 90))   # [3, 370]
print(trim_history([80, 120, 60, 100], 240, 90))   # [1, 190]
print(trim_history([80, 120, 60, 100], 189, 90))   # [0, 90]
print(trim_history([80, 120, 60, 100], 190, 90))   # [1, 190]
print(trim_history([80, 120], 1000, 90))           # [2, 290]
print(trim_history([80], 60, 90))                  # [0, 90]
print(trim_history([], 300, 90))                   # [0, 90]
`,
            testCases: [
                { input: 'trim_history([80, 120, 60, 100], 400, 90)', expected: '[3, 370]' },
                { input: 'trim_history([80, 120, 60, 100], 240, 90)', expected: '[1, 190]' },
                { input: 'trim_history([80, 120, 60, 100], 189, 90)', expected: '[0, 90]' },
                { input: 'trim_history([80, 120, 60, 100], 190, 90)', expected: '[1, 190]' },
                { input: 'trim_history([80, 120], 1000, 90)', expected: '[2, 290]' },
                { input: 'trim_history([80], 60, 90)', expected: '[0, 90]' },
                { input: 'trim_history([], 300, 90)', expected: '[0, 90]' },
            ],
            hints: [
                'Walk from the newest turn backward, adding a turn only when system_tokens plus everything kept so far plus this turn stays within budget, and stop at the first miss - one strict overflow ends the walk rather than skipping that turn.',
                'Case 3 vs case 4 is the exact boundary: with system_tokens 90, budget 189 rejects a 100-token turn and budget 190 accepts it. Kept-and-used land on the boundary, not past it.',
                'Case 6 is the under-provisioned call: budget 60 cannot hold 90 tokens of instructions, so the answer is zero turns with the system tokens as the cost. The prefix is never the thing that gets cut.',
            ],
            optimalComplexity: { time: 'O(number of turns)', space: 'O(1)' },
            tags: ['context-window', 'token-budget', 'history-trim', 'ai-track'],
        },
        {
            id: 'few-shot-consistency',
            title: 'Few-Shot Format Consistency',
            difficulty: 'medium',
            description: 'A few-shot prompt anchors the reply format by showing it: worked question and answer pairs, not a description of the format. The anchor is real - but the contract routing code relies on is exact string matching, and models wobble. Across a hundred real calls the same answer arrives three ways - the exact label, the label capitalized and padded with spaces, and a full sentence that mentions the label nowhere near its first word - and only the first one parses without cleanup. This challenge measures that wobble on a real sample, which is the step teams skip when they assume the examples did their job. Implement parse_failures(answers, labels): answers are the raw reply strings the model produced across repeated calls, and labels are the exact label strings the few-shot examples demonstrate. Sort every answer into three buckets. exact: the answer equals a label exactly. loose: not exact, but answer.strip().lower() equals the lowercased label - case drift and padding, fixable with a one-line cleanup. wrong: everything else, sentences and rewordings no cleanup line will rescue. Return [exact, loose, wrong] in that order. The counts are the honest audit of the format contract: a few-shot block that anchors well sends most answers to exact, and every answer sitting in wrong is a question your routing code dropped on the floor - the number that justifies tightening the examples or moving to a structured output format outright.',
            starterCode: `def parse_failures(answers, labels):
    # answers: raw reply strings from repeated model calls.
    # labels: the exact label strings the few-shot examples demo.
    # Bucket each answer:
    #   exact: equals a label exactly
    #   loose: not exact, but answer.strip().lower() equals the
    #          lowercased label (case drift, padding)
    #   wrong: everything else
    # Return [exact, loose, wrong].
    pass

# Test
print(parse_failures(["refund", "no-refund", "refund"],
    ["refund", "no-refund"]))                                    # [3, 0, 0]
print(parse_failures(["Refund", " refund ", "REFUND"],
    ["refund", "no-refund"]))                                    # [0, 3, 0]
print(parse_failures(["Refund. I found no matching order.", "refund",
    "The refund takes 5 business days."], ["refund", "no-refund"]))  # [1, 0, 2]
print(parse_failures(["No-Refund", "no-refund", "cancel my order"],
    ["refund", "no-refund"]))                                    # [1, 1, 1]
print(parse_failures([], ["refund", "no-refund"]))               # [0, 0, 0]
`,
            testCases: [
                {
                    input: `parse_failures(['refund', 'no-refund', 'refund'], ['refund', 'no-refund'])`,
                    expected: '[3, 0, 0]',
                },
                {
                    input: `parse_failures(['Refund', ' refund ', 'REFUND'], ['refund', 'no-refund'])`,
                    expected: '[0, 3, 0]',
                },
                {
                    input: `parse_failures(['Refund. I found no matching order.', 'refund', 'The refund takes 5 business days.'], ['refund', 'no-refund'])`,
                    expected: '[1, 0, 2]',
                },
                {
                    input: `parse_failures(['No-Refund', 'no-refund', 'cancel my order'], ['refund', 'no-refund'])`,
                    expected: '[1, 1, 1]',
                },
                { input: `parse_failures([], ['refund', 'no-refund'])`, expected: '[0, 0, 0]' },
            ],
            hints: [
                'Two passes per answer, in order: exact string equality first, then the normalized compare with strip and lower. An answer can only land in one bucket, so short-circuit once it matches.',
                'Case 3 is the honest picture of a real sample: one exact hit, and two full sentences that no cleanup line rescues because the answer started somewhere other than the label. Those two are the dropped questions.',
                'Case 4 shows all three buckets from the same sample: No-Refund needs the strip-and-lower cleanup, no-refund parses cold, and cancel my order answers the question the model was never asked. Empty answers grade nothing - zeros, not an error.',
            ],
            optimalComplexity: { time: 'O(number of answers)', space: 'O(1)' },
            tags: ['few-shot', 'output-contract', 'format-drift', 'ai-track'],
        },
    ],
    visualizationType: 'chart',
};
export const promptingTopics = [PROMPTING_CONTEXT];
export function getPromptingTopicById(id) {
    return promptingTopics.find((t) => t.id === id);
}
