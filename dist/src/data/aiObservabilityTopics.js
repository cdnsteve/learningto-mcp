// Unit 8 topic: Serving AI Reliably. The AI feature shipped and works; this
// topic is about the third week, when the model dependency misbehaves on its
// own schedule. Companion unit in style to aiTopics.ts (units 1-6): one
// AiTopic with three pure-Python challenges, no packages, graded through the
// Pyodide runner. The topicRegistry glob picks it up - this file exports the
// topic object only and stays out of every shared file.
const AI_OBSERVABILITY = {
    id: 'ai-observability',
    title: 'Serving AI Reliably',
    category: 'concepts',
    icon: 'Activity',
    difficulty: 3,
    track: 'ai',
    visualizationType: 'chart',
    description: 'The AI feature launched ten days ago and is the quietest thing you operate: the dashboard is a strip of green graphs, no complaints, nothing shipped this week. Then at 3am something changes, and running this feature is different because the dependency is a model you neither wrote nor can restart: a provider answers your users, and the provider can change its capacity, its pricing, or the model itself without telling you. So the board grows meters that watch the call rather than your code. p95 latency, the wait that 95 of every 100 requests stay under, catches a capacity squeeze that the median wait, p50, smooths right over. The error share catches a rate limit, a provider ceiling on how many calls fit in a minute that a launch surge can trip with zero code changes. Daily spend catches a prompt edit that quietly broke the prefix cache, the discount a provider grants while your requests resend the same opening text. And an eval set, a small fixed list of prompts with expected answers that your code reruns on a schedule, catches the scariest one: a silent quality drop after the provider swapped the model, the failure users notice and no latency meter ever blinks. What you do about it is the fallback ladder, an ordered list of answers to serve while the model misbehaves: retries with backoff first, then a smaller or older model, then a cached reply, ordered so the user meets slow long before they ever meet gone. Pinning, writing the exact model version into your config instead of floating on the provider default, is what turns a swap back into a rollback. Interviewers ask what you watch and what you do at 3am: a specific ladder is the answer of someone who ran a live AI feature, and we would monitor things is the answer of someone who has not. The three challenges below grade exactly that: the order you triage a crowded alert board in, the p95 and eval math that tells you to roll a model version back, and the share counters that say whether the ladder is holding.',
    keyPoints: [
        'p50 and p95 are read together: the median describes the typical request, and p95 describes the wait the slowest handful of users get. A flat p50 beside a doubled p95 is the signature of a provider tail problem, and it is a shape nothing in your own code can explain',
        'A rate limit is a ceiling on the minute, not a per-user allowance: when your traffic doubles, the provider refuses the excess with rate-limit wording and everything else about the feature is fine. No rollback of your own code helps, because nothing on your side broke',
        'The fallback ladder is ordered slow before gone: retry with backoff first, because the same call may succeed a minute later; then a smaller or older model, which answers slower but answers; then a cached reply, which is stale but keeps the page up. Each rung trades a little quality for a lot of availability, in that order',
        'An eval set is the quality meter for a model you do not control: rerun the same prompts on any version and compare pass rates, and a slide with no deploys on your side is evidence the provider changed something. The pin, the exact version string your code names, is the one-line rollback that turns that evidence into recovery',
        'Cost without traffic is a diagnosis: spend up 40x with flat traffic and a cached-token invoice line at zero means something fresh near the head of your prompt voided the cache discount for every request. The fix is usually a prompt diff, not a tier change',
    ],
    keyTradeoffs: [
        {
            axis: 'Pinned version vs floating on latest',
            tension: 'A pin freezes behavior, makes eval pass rates comparable week over week, and turns a provider upgrade into a decision you schedule. Floating on latest gets improvements with no work and re-prices them the day a swap lands: every number on the board quietly stops comparing to last week. A pin makes upgrades your work; floating makes surprises your incidents.',
        },
        {
            axis: 'Ladder depth vs answer honesty',
            tension: 'A deeper ladder keeps more failures invisible to users, and the bottom rungs serve stale or thinner answers without saying so. A short ladder fails honestly but converts small provider hiccups into visible downtime. Cached replies belong in the ladder, and the team should know exactly what share of real traffic met a cache instead of a model today.',
        },
        {
            axis: 'Alert sensitivity vs alert trust',
            tension: 'Page on every p95 wiggle and the on-call stops answering by week two. Set thresholds so quiet that only total loss pages and the silent quality slide becomes invisible until a customer writes in. The balance is per meter: page on errors and spend, warn on latency, and let the eval run be the quality alarm.',
        },
    ],
    pythonExample: `# Reading the board: three one-line meters and the verdict they drive.
# All plain standard library, which is roughly how the real ones work.

import math

def p95(latency_ms):
    # Nearest-rank rule: sort, then take the value standing at position
    # math.ceil(0.95 * n), counting from 1. Ten samples pick the 9th
    # smallest, so one wild outlier cannot claim the position.
    ordered = sorted(latency_ms)
    return ordered[math.ceil(0.95 * len(ordered)) - 1]

def shares(served_as):
    # served_as names how each call got answered: "primary" is the model
    # you chose; anything else rode a rung of the fallback ladder.
    total = len(served_as)
    canned = sum(1 for r in served_as if r == "canned")
    fallback = sum(1 for r in served_as if not (r == "primary"))
    label = "healthy"
    if fallback / total >= 0.2:
        label = "degraded"
    return [round(fallback / total, 4), round(canned / total, 4), label]

def rollback(p95_ms, slo_ms, passes, floor):
    # The eval verdict: rate under floor means quality lost, and quality
    # beats latency, so the pin goes back before anything else is measured.
    rate = round(sum(1 for p in passes if p) / len(passes), 4)
    if not (rate >= floor):
        return "rollback"
    if p95_ms > slo_ms:
        return "slowdown"
    return "hold"

latencies = [910, 980, 1020, 950, 4100, 970, 990, 1000, 960, 1010]
print(p95(latencies))   # 4100 - and p50 of the same list is 980
served = ["primary", "retry", "primary", "canned", "alt-model", "primary"]
print(shares(served))   # [0.5, 0.1667, 'degraded'] - half the traffic missed
passes = [True, True, False, True, True, False]
print(rollback(4100, 2000, passes, 0.9))  # 'rollback', no debate
print(rollback(1030, 2000, [True] * 6, 0.9))  # 'hold'
`,
    challenges: [
        {
            id: 'incident-triage-order',
            title: 'Incident Triage Order',
            difficulty: 'medium',
            description: 'You are the on-call at 3am and four alerts are lit at once: model error share, p95 latency, model spend, and an eval pass rate, and you can work exactly one before the sun is up. Triage is the discipline of that choice, and the rule that produces it is severity by what the user loses, not by which graph moved the most: users who receive nothing beat users who wait, and money with no user impact beats a quality slide that burns slowly over days. Implement triage_order(alerts): each alert is a dict like {"id": "a-err", "signal": "error-rate", "minutes_ongoing": 12}. signal is one of four strings, error-rate, latency-p95, cost-surge, eval-score, and minutes_ongoing is how long the alert has been standing. Return the alert ids in the order you should work them. Signal severity comes first, in the order error-rate, then latency-p95, then cost-surge, then eval-score, because a page-down incident always outranks slow, slow outranks expensive, and expensive outranks a quality slide nobody can see yet. Within one signal, the alert wrong the longest goes first, because it has had the most time to spread. An empty board returns [], which is the correct response to an empty board.',
            starterCode: `def triage_order(alerts):
    # Each alert is a dict like:
    # {"id": "a-err", "signal": "error-rate", "minutes_ongoing": 12}
    # Severity by signal: 'error-rate' (0, users get nothing),
    # 'latency-p95' (1, users wait), 'cost-surge' (2, money only),
    # 'eval-score' (3, slowest burn). Within one signal, the alert that
    # has been wrong the longest goes first, because it has spread furthest.
    pass

# Test
print(triage_order([
    {"id": "a-err", "signal": "error-rate", "minutes_ongoing": 12},
    {"id": "a-lat", "signal": "latency-p95", "minutes_ongoing": 40},
]))  # ['a-err', 'a-lat']
print(triage_order([
    {"id": "cost-1", "signal": "cost-surge", "minutes_ongoing": 90},
    {"id": "lat-1", "signal": "latency-p95", "minutes_ongoing": 90},
    {"id": "err-1", "signal": "error-rate", "minutes_ongoing": 4},
]))  # ['err-1', 'lat-1', 'cost-1']
print(triage_order([
    {"id": "e2", "signal": "error-rate", "minutes_ongoing": 5},
    {"id": "e1", "signal": "error-rate", "minutes_ongoing": 45},
]))  # ['e1', 'e2']
print(triage_order([
    {"id": "q1", "signal": "eval-score", "minutes_ongoing": 600},
    {"id": "c1", "signal": "cost-surge", "minutes_ongoing": 10},
    {"id": "c2", "signal": "cost-surge", "minutes_ongoing": 30},
]))  # ['c2', 'c1', 'q1']
print(triage_order([]))  # []
`,
            // Inputs carry the alert dicts inline: the runner grades case
            // arguments with ast.literal_eval, which accepts pure literals only.
            testCases: [
                {
                    input: "triage_order([{'id': 'a-err', 'signal': 'error-rate', 'minutes_ongoing': 12}, {'id': 'a-lat', 'signal': 'latency-p95', 'minutes_ongoing': 40}])",
                    expected: "['a-err', 'a-lat']",
                },
                {
                    input: "triage_order([{'id': 'cost-1', 'signal': 'cost-surge', 'minutes_ongoing': 90}, {'id': 'lat-1', 'signal': 'latency-p95', 'minutes_ongoing': 90}, {'id': 'err-1', 'signal': 'error-rate', 'minutes_ongoing': 4}])",
                    expected: "['err-1', 'lat-1', 'cost-1']",
                },
                {
                    input: "triage_order([{'id': 'e2', 'signal': 'error-rate', 'minutes_ongoing': 5}, {'id': 'e1', 'signal': 'error-rate', 'minutes_ongoing': 45}])",
                    expected: "['e1', 'e2']",
                },
                {
                    input: "triage_order([{'id': 'q1', 'signal': 'eval-score', 'minutes_ongoing': 600}, {'id': 'c1', 'signal': 'cost-surge', 'minutes_ongoing': 10}, {'id': 'c2', 'signal': 'cost-surge', 'minutes_ongoing': 30}])",
                    expected: "['c2', 'c1', 'q1']",
                },
                {
                    input: "triage_order([{'id': 'only', 'signal': 'eval-score', 'minutes_ongoing': 1}])",
                    expected: "['only']",
                },
                { input: 'triage_order([])', expected: '[]' },
            ],
            hints: [
                'One sort with a two-part key does it: (severity rank of the signal, negative minutes_ongoing) sorts severity first and oldest-within-severity first without a second pass.',
                'Severity is a fixed lookup, not a judgment call: error-rate 0, latency-p95 1, cost-surge 2, eval-score 3. Case 3 is the tie rule doing the work: two error-rate alerts sort by minutes_ongoing alone.',
                'Case 4 is why severity first matters: an eval alert six hundred minutes old loses to a cost alert ten minutes old, because the cost alert is where the user-visible bleeding starts. Negative minutes_ongoing turns long-standing into first-in-order.',
            ],
            optimalComplexity: { time: 'O(alert count log alert count)', space: 'O(alert count)' },
            tags: ['incident-triage', 'on-call', 'severity-order', 'ai-track'],
        },
        {
            id: 'p95-rollback-math',
            title: 'p95 Rollback Math',
            difficulty: 'hard',
            description: 'Two meters disagree at once: the p95 latency doubled, the eval pass rate slid under its floor, and nothing on your side changed. This is what a provider swapping the model version under a floating pin looks like, and the decision in front of you is absorb versus roll back, made in one read of the numbers. The math is small and checkable, which is the point: implement p95_rollback(samples_ms, slo_ms, passes, floor). samples_ms is latency for recent requests in milliseconds; compute the p95 with the nearest-rank rule, sort the list and take the value standing at position math.ceil(0.95 times n), counting from 1, so with 20 samples the p95 is the 19th smallest and one wild outlier cannot claim the position. slo_ms is the service level objective, the wait the feature promised to keep the p95 under. passes is the per-case result of rerunning the eval set on the current model version, True when the answer passed; floor is the pass-rate line below which quality counts as lost. Return a three-item list [p95, rate, verdict]: p95 as computed, rate as the share of True values in passes rounded to 4 decimal places, and verdict deciding the next move. Quality wins every tie: a rate under floor returns rollback, switch to the previous version, in preference to every slower or cheaper reason. Otherwise, a p95 over the SLO returns slowdown, absorb this with the ladder and verify a pin, and anything else returns hold. A p95 exactly on the SLO is a hold: the promise includes the boundary.',
            starterCode: `import math

def p95_rollback(samples_ms, slo_ms, passes, floor):
    # samples_ms: recent request latencies in ms. slo_ms: the p95 promise.
    # passes: the eval set rerun on the current model version, True per
    # passing case. floor: the pass rate below which quality is lost.
    # Nearest-rank rule for the p95: sort, take position
    # math.ceil(0.95 * n) counting from 1. Quality decides first, then
    # the latency promise. Return [p95, rate, verdict].
    pass

# Test
print(p95_rollback([940, 1010, 980, 1050, 1020, 4100, 990, 1000, 1030, 970],
                   2000, [True, True, True, True, True, True, True, True, True, False], 0.9))
# [4100, 0.9, 'slowdown']
print(p95_rollback([1010, 980, 950, 1000, 990, 1030, 970, 1000, 960, 1010],
                   2000, [True, False, False, True, True, False, True, True, False, True], 0.9))
# [1030, 0.6, 'rollback']
print(p95_rollback([940, 990, 970, 1000, 950, 980, 960, 930, 920, 910],
                   1000, [True, True, True, True, True, True, True, True, True, True], 0.9))
# [1000, 1.0, 'hold']
print(p95_rollback([500, 600, 700, 3000], 2500,
                   [True, True, True, True, True, True, True, True, True, True,
                    False, False, False, False, False], 0.8))
# [3000, 0.6667, 'rollback']
`,
            // Inputs are pure literals: no list comprehensions, since the runner
            // grades case arguments with ast.literal_eval.
            testCases: [
                {
                    input: 'p95_rollback([940, 1010, 980, 1050, 1020, 4100, 990, 1000, 1030, 970], 2000, [True, True, True, True, True, True, True, True, True, False], 0.9)',
                    expected: "[4100, 0.9, 'slowdown']",
                },
                {
                    input: 'p95_rollback([1010, 980, 950, 1000, 990, 1030, 970, 1000, 960, 1010], 2000, [True, False, False, True, True, False, True, True, False, True], 0.9)',
                    expected: "[1030, 0.6, 'rollback']",
                },
                {
                    input: 'p95_rollback([940, 990, 970, 1000, 950, 980, 960, 930, 920, 910], 1000, [True, True, True, True, True, True, True, True, True, True], 0.9)',
                    expected: "[1000, 1.0, 'hold']",
                },
                {
                    input: 'p95_rollback([800, 810, 820, 830, 840, 850, 860, 870, 880, 890, 900, 910, 920, 930, 940, 950, 960, 970, 980, 9000], 3000, [True, True, True, True, True, True, True, True, True, True, True, True, True, True, True, True, True, True, True, True], 0.9)',
                    expected: "[980, 1.0, 'hold']",
                },
                {
                    input: 'p95_rollback([500, 600, 700, 3000], 2500, [True, True, True, True, True, True, True, True, True, True, False, False, False, False, False], 0.8)',
                    expected: "[3000, 0.6667, 'rollback']",
                },
            ],
            hints: [
                'Nearest-rank p95 is one line: sorted(samples_ms)[math.ceil(0.95 * n) - 1]. Case 4 is the rule teaching its own point: with 20 samples the position is the 19th smallest, 980, and the 9000 outlier never makes the cut even though it is the highest number in the list.',
                'The verdict order is fixed and it is the interview answer: quality first, so a rate under floor is rollback regardless of the p95; then latency, so a passing rate with a p95 over the SLO is slowdown. Case 1 is the slowdown shape: rate 0.9 clears a floor of 0.9 exactly, so the latency check runs.',
                'Case 4 also checks the boundary of the promise: with a p95 of exactly the SLO, hold wins, because the SLO is keep-at-or-under. Rounding the rate happens once, to 4 places, before any comparison; 10 quality pass of 15 is 0.6667, under the 0.8 floor, so rollback.',
            ],
            optimalComplexity: { time: 'O(n log n)', space: 'O(n)' },
            tags: ['p95', 'nearest-rank', 'rollback', 'eval-set', 'ai-track'],
        },
        {
            id: 'fallback-chain-planner',
            title: 'Fallback Chain Planner',
            difficulty: 'medium',
            description: 'The fallback ladder is the runbook you write the week before the 3am happens: when the provider degrades, the feature keeps serving by stepping down through rungs ordered so users meet slow before they ever meet gone. Running it is only half the job; proving it held is the other half, because an outage you cannot measure is an outage you re-run next quarter. Implement ladder_report(served_as, threshold): served_as is one entry per call naming what served it, with primary the model you chose, retry the primary answering after a backoff wait, alt-model the smaller or older model, canned a cached reply, and lost a call that gave up outright. Return a three-item list [fallback_share, canned_share, status]. fallback_share is the share of calls not served by the primary model, canned_share the share served by cached answers, both rounded to 4 decimal places. status is decided in one priority order: down when any call was lost, because keeping the page up is the one job and a lost call fails it; then degraded when fallback_share has reached the threshold, meaning the ladder carried real traffic even while the page rendered; then healthy, the ladder being a spare part today. An empty report returns the no-traffic line, 0.0, 0.0, and the status healthy: no calls ran, and a ladder that never engaged is a healthy ladder.',
            starterCode: `def ladder_report(served_as, threshold):
    # served_as: how each call got served - 'primary' (the model you
    # chose), 'retry' (primary after a backoff wait), 'alt-model' (the
    # smaller or older model), 'canned' (a cached reply), 'lost' (gave up).
    # Report [fallback_share, canned_share, status], shares rounded to 4
    # decimal places. Status priority: any lost call is 'down', else
    # fallback share at the threshold is 'degraded', else 'healthy'.
    pass

# Test
print(ladder_report(['primary', 'primary', 'primary', 'primary'], 0.2))  # [0.0, 0.0, 'healthy']
print(ladder_report(['primary', 'retry', 'alt-model', 'primary', 'retry'], 0.2))  # [0.6, 0.0, 'degraded']
print(ladder_report(['canned', 'canned', 'primary', 'primary', 'primary', 'canned'], 0.2))  # [0.5, 0.5, 'degraded']
print(ladder_report(['primary', 'retry', 'lost'], 0.1))  # [0.6667, 0.0, 'down']
print(ladder_report(['primary', 'retry', 'primary', 'primary', 'primary'], 0.2))  # [0.2, 0.0, 'degraded']
print(ladder_report([], 0.2))  # [0.0, 0.0, 'healthy']
`,
            // Inputs carry the served lists inline: the runner grades case
            // arguments with ast.literal_eval, which accepts pure literals only.
            testCases: [
                {
                    input: "ladder_report(['primary', 'primary', 'primary', 'primary'], 0.2)",
                    expected: "[0.0, 0.0, 'healthy']",
                },
                {
                    input: "ladder_report(['primary', 'retry', 'alt-model', 'primary', 'retry'], 0.2)",
                    expected: "[0.6, 0.0, 'degraded']",
                },
                {
                    input: "ladder_report(['canned', 'canned', 'primary', 'primary', 'primary', 'canned'], 0.2)",
                    expected: "[0.5, 0.5, 'degraded']",
                },
                {
                    input: "ladder_report(['primary', 'retry', 'lost'], 0.1)",
                    expected: "[0.6667, 0.0, 'down']",
                },
                {
                    input: "ladder_report(['primary', 'retry', 'primary', 'primary', 'primary'], 0.2)",
                    expected: "[0.2, 0.0, 'degraded']",
                },
                { input: 'ladder_report([], 0.2)', expected: "[0.0, 0.0, 'healthy']" },
                {
                    input: "ladder_report(['primary', 'canned', 'retry', 'canned', 'alt-model', 'primary', 'canned'], 0.5)",
                    expected: "[0.7143, 0.4286, 'degraded']",
                },
            ],
            hints: [
                'fallback_share never counts primary: it is (len(served_as) - number of primary) over the total. retry and alt-model count as fallback even when they answer perfectly - the meter watches the ladder, not the quality of the answer.',
                'The status checks read in priority order and short-circuit: any lost call is down before the threshold is ever read. Case 4 shows the rule - a third of calls lost is down, and the threshold of 0.1 never gets a vote.',
                'Case 5 is the threshold boundary: fallback share exactly 0.2 reaches a threshold of 0.2, and at-or-above is the rule because a ladder carrying exactly its budget of traffic is already telling you a story. Rounding happens before the comparison: 3 of 7 is 0.4286 for the canned share.',
            ],
            optimalComplexity: { time: 'O(number of calls)', space: 'O(1)' },
            tags: ['fallback-ladder', 'resilience', 'availability', 'ai-track'],
        },
    ],
};
export const observabilityTopics = [AI_OBSERVABILITY];
export function getObservabilityTopicById(id) {
    return observabilityTopics.find((topic) => topic.id === id);
}
