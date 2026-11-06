// AI track topic: LLM serving internals (continuous batching, KV cache
// economics, prefill vs decode). The interactive spine is the
// BatchingWalkthrough component running lib/ai/batchSim.ts; the Python side
// drills the byte math beneath it.
//
// Sourced constants behind the numbers (batchSim.ts header has the full
// list): KV bytes per token = 2 (K and V) x 2 bytes (bf16) x layers x
// kv_heads x head_dim, so an 8B-class model (32 layers, 8 kv heads, 128
// head dim) occupies 131,072 bytes per token and a 70B-class model 327,680;
// prefill costs about 2 FLOPs per parameter per prompt token, with the
// dense FLOPs rate of an H100 SXM at 989.5 TFLOPS.
const SERVING_INTERNALS = {
    id: 'serving-internals',
    title: 'LLM Serving Internals',
    category: 'concepts',
    icon: 'Server',
    difficulty: 4,
    track: 'ai',
    description: 'Before a streamed answer reaches the screen, a scheduler admits the request into a batch of others running on rented GPUs, decides when its prompt gets read, and keeps it fed token by token until the answer finishes. Serving is that layer, and it runs on arithmetic that is unforgiving. Decode, the steady writing of the answer one token at a time, is bandwidth bound: every step re-reads the model\'s weights from card memory whether the batch holds one request or sixty, so a pool serving one request at a time pays its most expensive constant for a single token. Batching is the fix, sharing that read across every request running at once, which is why aggregate throughput climbs almost free as the batch grows. The resource that bounds the batch is not compute but memory: the KV cache, the per-request scratch space the model keeps so it can continue each prompt, grows with every layer and with sequence length, and when it fills, the batch size dial quietly stops mattering while the rest of the traffic waits. Prefill, the reading of the prompt that produces that scratch space, is compute bound and costs about 2 FLOPs per parameter per prompt token, which is why two requests sharing a cached opening start dramatically faster than two strangers. Interviewers test this material because the numbers decide the architecture: whether to rent dedicated cards sized for a peak, paid by the hour whether busy or not, or pay per token on a shared pool; how many cards a model swallows for its weights alone before a single seat exists; and why the tail, the p95 wait experienced by the slowest request, is what the service level agreement actually measures. The coding version of this topic is real: an xAI onsite round asks candidates to implement a simplified inference engine, meaning request batching, per-batch inference, and token-level result collection, and other labs ask the design version, batching requests up to a fixed size or a wait cap, whichever comes first. The three challenges below work the core arithmetic: the bytes one cached token occupies, the seats a card\'s free memory can grant, and the seconds prefill spends before the first token exists.',
    keyPoints: [
        'Decode is bandwidth bound: every generated token requires re-reading the model\'s weights from card memory, so one request alone pays the entire read for one token. Aggregate decode throughput climbs nearly free as the batch grows, because the same read serves every seat in it. The ceiling follows from that read: a 70B model in bf16 keeps about 140 GB of weights on a card whose memory moves about 3.35 TB per second, so a single request streams no faster than about 24 tokens/s no matter how many FLOPs the card offers, and interviewers expect that derivation on the whiteboard',
        'KV cache bytes per token = 2 x bytes per number x layers x kv_heads x head_dim. For an 8B-class model (32 layers, 8 kv heads, 128 head dim, bf16) that is 131,072 bytes, 128 KiB, per token of every running sequence; a 70B-class model occupies 320 KiB per token, over twice as much',
        'Weights come first: a model of P parameters in bf16 takes 2 x P bytes split across the tensor-parallel cards, and the KV budget is whatever memory is left after the weights. A 70B model on two 80 GB cards leaves roughly 19 GB for all scratch space, and few long-context seats to show for it',
        'Prefill is compute bound and costs roughly 2 x parameters x prompt tokens in FLOPs; a shared cached prefix turns that work into a cheap KV read, which is why requests that reuse each other start so much faster and why one fresh value stamped into a shared preamble destroys the discount',
        'The node count, not the request count, prices dedicated serving: cards are rented by the hour and sized for the peak-minute arrival rate, so the monthly bill is roughly peak arrival rate x request duration divided by granted seats, rounded up to whole nodes whether the pool runs hot or idle',
        'Static batching finishes a whole wave before admitting the next, so one long straggler idles every seat behind it; continuous batching retires and admits requests every step, keeping seats full while work remains queued. The vLLM launch post measured the gap on one 13B model: about 81 decode tokens/s under static batching, about 1,900 under continuous batching',
        'Production allocators name the memory problem, not the scheduler: PagedAttention splits each request\'s KV cache into blocks and pays essentially no overallocation waste, against the 60 to 80 percent fragmentation waste static reservation left; interviewers expect the term and the mechanism, one sentence each',
        'Speculative decoding is the batch-of-one trick that does not survive a crowded pool: a small draft model proposes the next few tokens, the big model verifies the whole proposal in one pass and keeps the matching prefix, so a lone request can stream two to three times faster, and the same trick pays nothing once the batch has saturated the weight read',
    ],
    keyTradeoffs: [
        {
            axis: 'Batch size vs tail latency',
            tension: 'A larger batch spreads the weight read over more seats and lifts aggregate throughput per dollar, but every request\'s wait absorbs the slowest work running beside it, so inter-token latency and queue tails grow. The right setting sits before the memory wall and before the latency knee, and only measurement finds it. The tail diagnosis is a standard follow-up: under static batching the p99 wait is set by whichever straggler holds the wave open, so a sudden p99 regression points at the convoy effect and queueing before it points at the cards.',
        },
        {
            axis: 'KV room vs batch size',
            tension: 'Every concurrent seat costs memory proportional to its context length, so long contexts shrink the seat budget and a scheduler that ignores the wall keeps asking for seats memory cannot grant, sending the excess to the queue with no error. Trimming context buys back concurrency directly, and so does shrinking the cache itself: halving the bytes each stored number occupies, which is what swapping the KV cache to FP8 does, doubles the seat budget.',
        },
        {
            axis: 'Bigger model vs serving economics',
            tension: 'A 70B model doubles the cards in a node, eats the memory headroom for its own weights, and more than doubles the scratch space per token, so the seat budget collapses. The quality premium is priced in concurrency and hardware, not just in rate, and the arithmetic decides whether the upgrade survives the budget.',
        },
    ],
    pythonExample: `# Static batching runs fixed-size waves: every seat waits for the slowest
# sequence in the wave before the next batch starts, so a single long
# straggler idles every seat that already finished. Continuous batching
# retires and admits requests every step instead, so seats stay full while
# work remains queued. Same hardware, same work, different bill.
def static_batched(lengths, seats):
    billed = 0
    for i in range(0, len(lengths), seats):
        wave = lengths[i : i + seats]
        billed += max(wave) * len(wave)
    return billed

def continuous(lengths, seats):
    queue = list(lengths)
    running = []
    billed = 0
    while queue or running:
        while queue and len(running) < seats:
            running.append(queue.pop(0))
        billed += len(running)
        running = [left - 1 for left in running if left > 1]
    return billed

lengths = [10, 10, 10, 10, 10, 90] + [10] * 12
work = sum(lengths)
print(max(lengths[0:6]))        # 90 - the wave runs as long as its straggler
print(static_batched(lengths, 6))  # 660 seat-turns billed
print(continuous(lengths, 6))      # 260 seat-turns billed
print(work)                        # 260 seat-turns of real decoding
`,
    challenges: [
        {
            id: 'kv-bytes-per-token',
            title: 'KV Cache Bytes per Token',
            difficulty: 'easy',
            description: 'Every running request holds a KV cache, the scratch memory a model uses to continue an answer from a prompt it has already read: after processing the prompt, the model has written a keyed summary of it, and each new token extends that summary instead of re-reading everything. That scratch space is the real resource being scheduled, so interviewers start here: how big is one token of it? The formula is 2 x bytes x layers x kv_heads x head_dim. The first 2 is because the cache stores both a key and a value per layer per token; bytes are 2 for bf16, the half-precision format models run in; kv_heads is the number of key-value attention heads, which modern models shrink below the query heads to save exactly this memory; head_dim is the width of each head. For an 8B-class model with 32 layers, 8 kv heads and 128 head_dim, one token of cache is 131,072 bytes. For a 70B-class model with 80 layers, also 8 kv heads and 128 head_dim, it is 327,680 bytes, and every seat in the batch pays that times its full sequence length (prompt plus answer so far) out of what remains after the weights. Implement kv_bytes_per_token(layers, kv_heads, head_dim): return the bytes one token of KV cache occupies for a bf16 model with that shape.',
            starterCode: `def kv_bytes_per_token(layers, kv_heads, head_dim):
    # One token of KV cache = (key + value) per layer per head, stored in
    # bf16, which is 2 bytes per number.
    pass

# Test
print(kv_bytes_per_token(32, 8, 128))   # 131072
print(kv_bytes_per_token(80, 8, 128))   # 327680
print(kv_bytes_per_token(24, 4, 96))    # 36864
`,
            testCases: [
                { input: 'kv_bytes_per_token(32, 8, 128)', expected: '131072' },
                { input: 'kv_bytes_per_token(80, 8, 128)', expected: '327680' },
                { input: 'kv_bytes_per_token(24, 4, 96)', expected: '36864' },
            ],
            hints: [
                'The first 2 counts the two tensors per layer, key and value. The second 2 is bytes per element in bf16.',
                'Nothing depends on the number of attention heads that produce queries: the cache only stores the key-value heads.',
                'The whole expression is one product: 2 x 2 x layers x kv_heads x head_dim. Watch the order of magnitude: it is bytes, not bits.',
            ],
            optimalComplexity: { time: 'O(1)', space: 'O(1)' },
            tags: ['kv-cache', 'memory', 'serving', 'ai-track'],
        },
        {
            id: 'max-concurrent-sequences',
            title: 'Seats a Card Can Grant',
            difficulty: 'medium',
            description: 'A serving node rents cards by the hour and promises the batch dial can spin, but the dial answers to memory, not to the scheduler. The card holds the model\'s weights first; what remains of its 80 GB is the KV budget, and each concurrent sequence, prompt plus answer so far, occupies kv_bytes_per_token x sequence_length bytes of it. When the budget runs out, the scheduler cannot grant another seat: the request waits in the queue with no error anywhere, which is why capacity planning means doing this division before the traffic arrives. Implement max_concurrent_sequences(gb_free, kv_bytes_per_token, seq_tokens): gb_free is the memory left for cache, given in GB (use 1 GB = 1,000,000,000 bytes), kv_bytes_per_token is the per-token cache size from the previous challenge, and seq_tokens is the average sequence length in tokens. Return the whole number of sequences that fit, rounded down, as a plain integer. If even one sequence does not fit in the free memory, return 0, because a seat that cannot hold its context cannot exist. Example arithmetic: a 70B-class model on two cards leaves about 19 GB for cache; at 320 KiB per token and 1,400 average tokens per sequence, 19,000,000,000 divided by 458,752,000 gives 41 seats.',
            starterCode: `def max_concurrent_sequences(gb_free, kv_bytes_per_token, seq_tokens):
    # gb_free is in GB: multiply by 1,000,000,000 for bytes. Each sequence
    # holds kv_bytes_per_token bytes for every token it keeps cached.
    # Floor the division: a partial seat cannot run. No room, no seat.
    pass

# Test
print(max_concurrent_sequences(19, 327680, 1400))   # 41
print(max_concurrent_sequences(0.5, 131072, 8000))  # 0
print(max_concurrent_sequences(1, 131072, 1000))    # 7
`,
            testCases: [
                { input: 'max_concurrent_sequences(19, 327680, 1400)', expected: '41' },
                { input: 'max_concurrent_sequences(0.5, 131072, 8000)', expected: '0' },
                { input: 'max_concurrent_sequences(1, 131072, 1000)', expected: '7' },
            ],
            hints: [
                'Convert the budget to bytes first: gb_free x 1,000,000,000. Mixing GB with GiB is the classic off-by-7% mistake here.',
                'Each sequence costs kv_bytes_per_token x seq_tokens bytes. Floor the division, because a partial seat cannot run.',
                'Compare before you divide: if one sequence costs more bytes than the whole budget, the answer is 0, not an error.',
            ],
            optimalComplexity: { time: 'O(1)', space: 'O(1)' },
            tags: ['kv-cache', 'capacity', 'memory', 'ai-track'],
        },
        {
            id: 'prefill-seconds',
            title: 'Prefill Seconds Before First Token',
            difficulty: 'medium',
            description: 'The time to first token, the wait a service level agreement actually measures, has a floor you can compute from the hardware spec sheet: reading the prompt, called prefill, bills in floating point operations at roughly 2 FLOPs per parameter per prompt token, and the card delivers a fixed number of TFLOPS, of which a realistic fraction, the MFU, or model FLOPs utilization, actually lands as useful work. Divide the work by the effective rate and you have the seconds of compute before a single output token exists. A cache hit on a shared prefix removes most of those prompt tokens from the bill entirely, which is how production pools serve 4,000-token prompts that start in tens of milliseconds while a cold, cache-missing 70B request with the same prompt takes most of a second before writing anything. Implement prefill_seconds(params_b, prompt_tokens, tflops, card_count, mfu_pct): params_b is the model size in billions of parameters, prompt_tokens the unprefilled prompt tokens to read, tflops the dense FLOPs rate of one card in trillions per second (an H100 SXM is 989.5), card_count the number of cards the weights are split across, and mfu_pct the utilization as a percentage (50 means only half the rated FLOPs are useful). Return the seconds, rounded to 3 decimal places.',
            starterCode: `def prefill_seconds(params_b, prompt_tokens, tflops, card_count, mfu_pct):
    # Work in FLOPs: 2 per parameter per prompt token.
    # Effective rate: card_count x tflops (a trillion is 1e12) x mfu/100.
    pass

# Test
print(prefill_seconds(70, 2000, 989.5, 1, 50))   # 0.566
print(prefill_seconds(70, 2000, 989.5, 2, 50))   # 0.283
print(prefill_seconds(8, 4000, 989.5, 1, 50))    # 0.129
print(prefill_seconds(70, 100, 989.5, 2, 50))    # 0.014
`,
            testCases: [
                { input: 'prefill_seconds(70, 2000, 989.5, 1, 50)', expected: '0.566' },
                { input: 'prefill_seconds(70, 2000, 989.5, 2, 50)', expected: '0.283' },
                { input: 'prefill_seconds(8, 4000, 989.5, 1, 50)', expected: '0.129' },
                { input: 'prefill_seconds(70, 100, 989.5, 2, 50)', expected: '0.014' },
            ],
            hints: [
                'Work first: 2 FLOPs per parameter times the parameter count (convert billions: 1 billion is 1e9) times the prompt tokens.',
                'Effective rate: card_count x tflops x 1e12 x (mfu_pct / 100). The MFU is the tax reality pays on the spec sheet.',
                'Seconds = work / rate, then round to 3 decimals. Sanity check the scale: a 70B model reading 2,000 tokens takes over half a second on one card at 50% MFU.',
            ],
            optimalComplexity: { time: 'O(1)', space: 'O(1)' },
            tags: ['prefill', 'latency', 'ttft', 'ai-track'],
        },
    ],
    visualizationType: 'chart',
};
// The second serving topic: the multi-tier serving pool from OpenAI's
// "Design ChatGPT" systems-design drill. Tier Rush (lib/ai/tierSim.ts) is
// the interactive spine. The traffic and queue arithmetic in tierSim.ts
// matches the numbers quoted in the description and keyPoints.
const SERVING_TIERS = {
    id: 'serving-tiers',
    title: 'Design ChatGPT: Tiers & Rate Limits',
    category: 'concepts',
    icon: 'Network',
    difficulty: 4,
    track: 'ai',
    description: 'Design ChatGPT is the most-cited systems design question at AI companies, and it is really one question: when everyone arrives at once, who gets served, who waits, and who is told no, all without the paying tier ever noticing. The answer interviewers grade against has three parts. First, three pools: a small provisioned pool whose cards exist for one tier only, a larger shared pool where paid requests carry priority over free ones, and the queue itself, which lives in card memory, not in a message broker. Second, a token-bucket rate limiter at the gateway, held in Redis for atomicity under concurrent writers, that admits free arrivals at a chosen share of demand and reconciles the token count after each grant, so a burst of arrivals is answered instantly without consulting a GPU. Third, shedding: a request refused at the gateway with a 429 costs nothing; the same request admitted into a saturated pool holds an expensive seat and lengthens every wait behind it, which is why the tail wait punishes utilization non-linearly, and why an incident that removes 30% of capacity can turn a 97 millisecond paid wait into an 850 millisecond one. Interviewers test this because every knob in the design is a money or trust decision: renting burst capacity for a launch day, tightening the bucket over a jammed pool, or letting the free tier shed so the subscribers do not notice an outage. The three challenges below work the mechanics: the admit count a token bucket grants, the queue wait the utilization formula quotes, and the shed arithmetic that keeps the shared pool from jamming.',
    keyPoints: [
        'The tier plan has three pools, not two: a small provisioned pool that exists for premium traffic alone, a larger shared pool where paid requests carry priority over free, and free arrivals admitted only up to what the gateway token bucket allows. The premium pool is sized for its own tier, so a free-tier surge cannot touch it',
        'A token bucket is reserve-then-reconcile: the reservation is granted instantly if a token exists, and the bucket reconciles its token count afterward at a steady refill rate, capped at a burst size. In Redis this is one atomic script so concurrent writers cannot double-spend, and the decision never consults a GPU',
        'A paid request in a priority queue waits a function of paid load alone, which is the property that makes the tier boundary real: shedding free traffic cannot rescue a saturated paid tier, and a free surge cannot jam the paid tier while priority holds. Verify the approximation in production numbers before repeating it, but the mechanism is what interviewers expect',
        'Queue wait under the M/M/1 approximation is service_time x utilization / (1 - utilization), and it explodes as utilization closes on 1: the tierSim default pool runs at 61% for a 97 ms paid wait, and the same pool at 100% utilization quotes a wait that never drains. A 30% capacity loss on a thin fleet turned 97 ms into 853 ms',
        'Shedding is the cheapest feature in the stack: a 429 at the gateway costs zero card time, while an over-admitted request holds a seat and lengthens every wait behind it. The bucket rate, not the fleet size, is the knob that fixes a launch-day surge',
        'Renting burst capacity is the fleet knob, and it exists because autoscaling lags: a model serving node takes minutes to come up while a spike can triple arrivals in 30 seconds, so the design pre-rents or sheds; the interview follow-up is what your system does in the gap between the two',
    ],
    keyTradeoffs: [
        {
            axis: 'Bucket generosity vs pool headroom',
            tension: 'A token bucket set near 100% of demand keeps the free tier happy until the pool closes on full utilization, where wait time explodes and the queue stops draining; tightening the bucket rejects more at the edge, which costs nothing and buys back a queue that drains. The bucket rate is the admission control interviewers want named, with its refill and burst numbers written down.',
        },
        {
            axis: 'Provisioned premium pool vs one big shared pool',
            tension: 'A dedicated premium pool isolates the paying tier from surges and incidents, and prices that isolation in idle cards. A single shared pool never idles but hands the paid tier queue risk from traffic it does not control. The compromise is a small provisioned share sized for the premium arrival rate plus priority on the shared pool.',
        },
        {
            axis: 'Shed early vs serve everyone eventually',
            tension: 'Refusing arrivals at the edge loses users for one request and keeps the pool healthy; admitting everything queues them into dead waits while paid rides above. The design question is where the bucket sits between those, and the honest answer is measured: shed share against paid SLO, recomputed on every incident review.',
        },
    ],
    pythonExample: `# A Redis token bucket in six lines: reconcile tops the bucket up at the
# refill rate, capped at the burst size, and reserve spends tokens to grant.
# The admission decision is one comparison; everything else is bookkeeping.
def reserve(bucket, burst, refill_rate, cost):
    bucket = min(burst, bucket + refill_rate)   # reconcile
    if bucket >= cost:
        return bucket - cost, True   # granted
    return bucket, False             # refused at the edge

bucket, burst = 10.0, 10.0
granted_count = 0
for request in range(12):
    bucket, granted = reserve(bucket, burst, 2.0, 3.0)
    granted_count += granted
print(granted_count)   # 10 of 12: refill of 2/s sustains 2 grants every 3 s
`,
    challenges: [
        {
            id: 'token-bucket-admits',
            title: 'Requests the Token Bucket Admits',
            difficulty: 'easy',
            description: 'The gateway token bucket is the first thing a request meets, and it is one comparison under the surface. The bucket starts holding burst tokens, refills at rate tokens per second, and admits a request by spending its cost. After elapsed seconds of refill, the tokens available are burst + rate x elapsed: the reservation is granted instantly against those tokens, and the count is reconciled after. The request total a burst lets through is exactly min(requested, burst + rate x elapsed), which is why a bucket absorbs a short burst completely and then admits at a steady rate when demand outlasts the cushion. Interviewers ask for this arithmetic plus the follow-up: where does the bucket live, and the answer to name is a shared in-memory store such as Redis, because limiter state must be atomic across concurrent gateway instances. Implement tokens_admitted(rate, burst, elapsed, requested): return the number of requests the bucket admits, with burst the starting tokens, rate the refill per second, elapsed the seconds that pass, and requested the arrivals. It is min(requested, burst + rate x elapsed), floored, because a request costs a whole token.',
            starterCode: `def tokens_admitted(rate, burst, elapsed, requested):
    # Tokens available = burst plus rate x elapsed of refill. Each request
    # spends one whole token, so the answer floors the minimum.
    pass

# Test
print(tokens_admitted(2, 10, 3, 8))    # 8
print(tokens_admitted(2, 10, 3, 20))   # 16
print(tokens_admitted(5, 10, 4, 100))  # 30
`,
            testCases: [
                { input: 'tokens_admitted(2, 10, 3, 8)', expected: '8' },
                { input: 'tokens_admitted(2, 10, 3, 20)', expected: '16' },
                { input: 'tokens_admitted(5, 10, 4, 100)', expected: '30' },
            ],
            hints: [
                'Tokens available = burst + rate x elapsed. A refill of 2/s over 3 s adds 6 tokens to the 10 already held.',
                'The answer is min(requested, tokens available), floored to a whole request: tokens are spent in whole costs.',
                'Watch which side the cap binds on: a small elapsed and small bucket means demand beats the cap; large elapsed means the min flips to requested.',
            ],
            optimalComplexity: { time: 'O(1)', space: 'O(1)' },
            tags: ['rate-limiting', 'token-bucket', 'admission', 'ai-track'],
        },
        {
            id: 'queue-wait-ms',
            title: 'Queue Wait from Utilization',
            difficulty: 'medium',
            description: 'Queueing delay is the number operations asks for and the one candidates fumble, because it is not a division but a curve: under the M/M/1 approximation, wait = service_time x utilization / (1 - utilization), a curve that stays flat, then bends, then goes vertical as utilization closes on 1. At 80% utilization the multiplier is 4; at 95% it is 19; at 100% the formula diverges, the queue grows without bound, and no wait can be quoted, which is why a capacity plan that leaves no headroom is not a plan. The service time is how long one request occupies the pool, and utilization is demand divided by capacity. One 30% loss of capacity on a pool running near the edge multiplies the wait by far more than 30%: that non-linearity is the whole incident-review conversation. It is an approximation (real arrival patterns vary, priorities interleave), but it is the shape interviewers expect you to reason about, along with the p95 percentile the service level agreement measures. Implement queue_wait_ms(rho_pct, service_ms): rho_pct is utilization as a percentage, service_ms the pool service time in milliseconds. Return the wait in milliseconds rounded to 2 decimals, or -1 when utilization reaches 100, because at full utilization the queue never drains.',
            starterCode: `def queue_wait_ms(rho_pct, service_ms):
    # M/M/1: wait = service_ms x rho/(1 - rho). At or above 100% the queue
    # never drains: return -1 instead of a number that would be a lie.
    pass

# Test
print(queue_wait_ms(80, 100))    # 400.0
print(queue_wait_ms(95, 100))    # 1900.0
print(queue_wait_ms(60, 250))    # 375.0
print(queue_wait_ms(100, 100))   # -1
`,
            testCases: [
                { input: 'queue_wait_ms(80, 100)', expected: '400.0' },
                { input: 'queue_wait_ms(95, 100)', expected: '1900.0' },
                { input: 'queue_wait_ms(60, 250)', expected: '375.0' },
                { input: 'queue_wait_ms(100, 100)', expected: '-1' },
            ],
            hints: [
                'Convert the percentage first: utilization 80 is rho 0.8, and 1 - rho is 0.2.',
                'The multiplier rho/(1 - rho) is 4 at 80% and 19 at 95%: the curve bends fast.',
                'Guard the boundary before dividing: rho_pct >= 100 means -1, and at rho_pct 99 the answer is service_ms x 99.',
            ],
            optimalComplexity: { time: 'O(1)', space: 'O(1)' },
            tags: ['queueing', 'latency', 'p95', 'ai-track'],
        },
        {
            id: 'shed-and-serve',
            title: 'Free Requests the Pool Must Shed',
            difficulty: 'medium',
            description: 'Admission control is two clamps in sequence, and interviewers want both in one function. A token bucket admits free arrivals at bucket_pct percent of free demand; the shared pool then serves them out of what remains after the paid arrivals take their priority share. What the pool cannot catch is shed: served = min(free x bucket_pct / 100, max(0, capacity - paid)), and shed = free - served. Read the two clamps apart, because they fail differently: tightening the bucket fixes a surge (the first clamp) but cannot fix a saturated pool (the second), where every admitted request waits anyway and only added cards or added shedding change the outcome. That is the design insight behind ChatGPT-style serving plans: the gateway refuses what the cards cannot catch, and the refusing costs nothing. Implement shed_requests(capacity, paid, free, bucket_pct): capacity is the shared pool rate in requests per second, paid the paid arrivals it must serve first, free the free arrivals knocking, bucket_pct the token-bucket admit percentage of free demand. Return the requests per second the pool sheds, rounded to 2 decimals.',
            starterCode: `def shed_requests(capacity, paid, free, bucket_pct):
    # Two clamps: the bucket admits a share of demand, the pool serves what
    # remains after paid. What neither catches is shed.
    pass

# Test
print(shed_requests(45, 12, 26, 60))    # 10.4
print(shed_requests(33, 12, 130, 20))   # 109
print(shed_requests(40, 10, 10, 100))   # 0.0
`,
            testCases: [
                { input: 'shed_requests(45, 12, 26, 60)', expected: '10.4' },
                { input: 'shed_requests(33, 12, 130, 20)', expected: '109' },
                { input: 'shed_requests(40, 10, 10, 100)', expected: '0.0' },
            ],
            hints: [
                'Clamp one: admitted = free x bucket_pct / 100. The bucket is a rate, not a queue.',
                'Clamp two: served = min(admitted, max(0, capacity - paid)). Paid goes first; free is served from the residual.',
                'Shed = free - served, rounded to 2 decimals. The case with capacity 33 shows the pool clamp binding: the bucket admitted 26 but the residual held only 21.',
            ],
            optimalComplexity: { time: 'O(1)', space: 'O(1)' },
            tags: ['rate-limiting', 'shedding', 'capacity', 'ai-track'],
        },
    ],
    visualizationType: 'chart',
};
const SERVING_CACHE_ROUTING = {
    id: 'cache-routing',
    title: 'Cache-Aware Routing & Affinity',
    category: 'concepts',
    icon: 'Route',
    difficulty: 4,
    track: 'ai',
    description: 'The next hidden cost in a serving fleet is where each request lands. Every arrival carries a shared opening - a system line, a tool spec, a project brief - about 1200 tokens of it, and the fleet pays to prefill that opening on whatever card the request lands on unless the opening is already resident there. This is what makes the cached-input discounts on frontier model pricing real: the preamble is resident on the one card that prefilled it, so the discount is not a memory feature, it is a routing guarantee. Cache-blind round-robin destroys the guarantee politely: an arrival meets the card holding its family one time in n, so a 16-card fleet re-prefills the same openings dozens of times a second no matter how large the scratch space is. The fix is one line of arithmetic - hash the prefix family, land on that family card - and its costs show up elsewhere: a hot prompt template now concentrates every arrival of its family on one card and strands the rest, which is why the busiest-card metric (decode headroom, capped near 60%) is a first-class check, and why sharding the hot family across two cards is the follow-up interviewers wait for: it halves the hot card load and costs one duplicate preamble copy. Budget closes the loop, because preambles are big - 1200 tokens of 70B-class KV at 320 KB per token is about 384 MB a copy, so an 8 GB prefix cache holds 20 families - and cards that run short evict silently, turning hashed arrivals back into prefills. The three challenges below size the mechanics: the hit share round-robin throws away, the copies a scratch of a given size holds, and the busiest-card share the hash leaves behind.',
    keyPoints: [
        'The cached-input discount is a routing guarantee, not a memory feature: a prefix is resident on the one card that prefilled it, so the 90% discount survives only while the router sends each family back to that card. Cache-blind round-robin gives an arrival a one-in-n chance of meeting it',
        'The preamble arithmetic is short: 1200 tokens of 70B-class KV at 320 KB per token is about 384 MB per resident copy, so an 8 GB prefix cache holds 20 families, and a family-hashed fleet of 8 cards needs 8 resident families per card at most',
        'Concentration is the price of affinity: a hot prompt template owns a share of traffic and the hash sends every arrival of that family to one card, so the busiest-card metric, a decode-headroom guard near 60%, is the check that catches a routing plan that is quietly winning the hit rate and losing the balance column',
        'Sharding the hot family across two cards halves its card load and costs one duplicate preamble copy: the honest trade between hit rate and balance, and the follow-up interviewers wait for after the hash answer',
        'Budget closes the loop: cards evict resident prefixes when the scratch runs short, and eviction turns hashed arrivals back into tensor-time prefills, so fitting the cache is part of routing it. Under eviction the hit rate scales with the share of required copies the budget holds',
        'The same arithmetic prices self-hosted fleets too: whether the fleet bills for prefill GPU-seconds or skips them is decided by routing before it is decided by hardware, and a frontier API cached-input discount the fleet cannot reproduce is often a router it did not build',
    ],
    keyTradeoffs: [
        {
            axis: 'Cache affinity vs fleet balance',
            tension: 'Hashing each prefix family to its card holds hit rates near 100% and concentrates load exactly where traffic already concentrates; round-robin spreads load perfectly and throws the cache away. Sharding the hot family across two cards is the compromise that buys back balance with one duplicate copy, and the right answer names all three numbers: hit rate, busiest card, and copies paid.',
        },
        {
            axis: 'Cache scratch space vs weight and activation space',
            tension: 'Prefix cache competes with weights and KV for the same 80 GB of card memory, and an undersized scratch undoes the router silently: 2 GB holds 5 preamble copies where an 8-card hash needs 8, so hits fall to 62.5% with the routing code untouched. The design answer is a minimum-scratch floor in the capacity plan, not a resize after the hit-rate graph breaks.',
        },
        {
            axis: 'Blind simplicity vs cache-aware operations',
            tension: 'Round-robin has no stickiness to manage: nodes restart, drain, and join without state. A cache-aware hash owns a second lifecycle, because growing the fleet reassigns families and dumps warm prefixes across the whole fleet at once, so production deployments keep a consistent hash ring and rebalance gradually. Interviewers score the answer that admits the ops cost.',
        },
    ],
    pythonExample: `# One line separates a cache-blind router from a cache-aware one. The hash
# keeps a family's arrivals on the card that prefilled its preamble.
FAMILIES = 64
COPY_MB = 384   # 1200 tokens at 320 KB/token of 70B-class KV

def copies_that_fit(cache_gb):
    return cache_gb * 1000 // COPY_MB

def route(family, cards, cache_aware):
    return family % cards if cache_aware else None

need_per_card = -(-FAMILIES // 8)   # ceiling division
print(need_per_card)        # 8 resident families on an 8-card hash fleet
print(copies_that_fit(8))   # 20 copies fit in an 8 GB scratch
print(copies_that_fit(2))   # 5: 3 copies short, so eviction undoes the hash
print(route(41, 8, True))   # 1: family 41 always lands on card 1
`,
    challenges: [
        {
            id: 'round-robin-hit-rate',
            title: 'The Round-Robin Hit Rate',
            difficulty: 'easy',
            description: 'Before any cache-aware design is on the table, quantify what cache-blind routing costs. A shared preamble is resident on the one card that prefilled it - in the drill, a fleet where every card eventually holds every family is not assumed, so the first-order hit rate is exactly the chance a round-robin rotation lands back on the resident card: one in the number of cards. Doubling the fleet does not help, it halves the chance, which is the counterintuitive direction candidates get wrong under pressure: more replicas spread load and, at the same time, spread the cache. Interviewers want the number stated plainly, then the fix named in one line - point the hash at the prefix family, and the same hardware moves from a one-in-n hit rate to a hit rate bounded only by cache capacity. Implement hit_share(cards): return the percent of arrivals that land on the card holding their preamble under perfect round-robin, rounded to 2 decimals. It is 100.0 divided by cards, and the decimal-cast matters: with 8 cards the answer is 12.5, not 12.',
            starterCode: `def hit_share(cards):
    # A preamble is resident on the one card that prefilled it.
    # Round-robin walks the fleet, so the chance of meeting that card
    # is one in cards. Return the hit percent, 2 decimals.
    pass

# Test
print(hit_share(8))    # 12.5
print(hit_share(16))   # 6.25
print(hit_share(2))    # 50.0
`,
            testCases: [
                { input: 'hit_share(8)', expected: '12.5' },
                { input: 'hit_share(16)', expected: '6.25' },
                { input: 'hit_share(2)', expected: '50.0' },
            ],
            hints: [
                'The rotation visits each card once before repeating, so the resident card is met exactly once every cards visits.',
                'Cast to float before dividing: 100 / cards in Python 3 is already a float, so round(100.0 / cards, 2) is the whole body.',
                'Say the counterintuitive direction out loud in the interview: more replicas spread the load and, at the same time, spread the cache, so the hit share only falls.',
            ],
            optimalComplexity: { time: 'O(1)', space: 'O(1)' },
            tags: ['caching', 'routing', 'hit-rate', 'ai-track'],
        },
        {
            id: 'prefix-copies-fit',
            title: 'Copies a Prefix Cache Holds',
            difficulty: 'easy',
            description: 'Cache capacity decides whether the hash delivers, because evicted prefixes are re-prefilled no matter how good the routing is. A resident preamble copy of a 1200-token opening on a 70B-class model at 8 KV heads and 128 head dimension, bf16, costs 2 x 2 x 80 x 8 x 128 = 320 KB per token, so one copy is about 384 MB. A prefix scratch of cache_gb GB holds cache_gb x 1000 MB of it, and a card can afford the floor of that division - a partially resident preamble is not a hit. The numbers interviewers check: an 8 GB scratch holds 20 families, a 2 GB scratch holds 5, and a 40 GB scratch holds 104, which is the number to compare against the copies a routing plan demands - 8 resident families on an 8-card hash fleet, 64 on a cache-blind fleet of any size. Implement prefix_copies(cache_gb): return the number of whole 384 MB preamble copies a prefix cache of cache_gb GB holds.',
            starterCode: `def prefix_copies(cache_gb):
    # One preamble copy is 1200 tokens of 70B-class KV: about 384 MB.
    # A scratch of cache_gb GB holds cache_gb x 1000 MB of copies,
    # and a partially resident preamble is not a hit, so floor it.
    pass

# Test
print(prefix_copies(8))    # 20
print(prefix_copies(2))    # 5
print(prefix_copies(40))   # 104
`,
            testCases: [
                { input: 'prefix_copies(8)', expected: '20' },
                { input: 'prefix_copies(2)', expected: '5' },
                { input: 'prefix_copies(40)', expected: '104' },
            ],
            hints: [
                'One gigabyte is 1000 MB here, so the copy count is cache_gb x 1000 // 384.',
                'Floor division with // returns the whole copies; 8000 // 384 is 20, not 20.8, because the 0.8 copy evicts nothing it never held.',
                'Compare the answer against what the router demands: 8 resident families on an 8-card hash fleet, 64 on a cache-blind fleet of any size.',
            ],
            optimalComplexity: { time: 'O(1)', space: 'O(1)' },
            tags: ['caching', 'memory', 'kv-cache', 'ai-track'],
        },
        {
            id: 'busiest-card-share',
            title: 'The Busiest Card Under the Hash',
            difficulty: 'medium',
            description: 'The hash fixes the hit rate and creates a concentration problem in the same stroke. One prompt template owns hot_pct percent of all arrivals, the family hash sends every one of them to the same card, and at worst one cold family of the remaining 63 collides onto that card too. The busiest-card share is hot_pct + (100 - hot_pct) / 63 - and its size is why decode headroom is a first-class check: a card near 80% of all arrivals leaves no headroom for the decode tokens it also owes on every request it serves. This is the number that justifies sharding the hot family across two cards, which doubles one preamble copy to halve the concentration. Implement busiest(hot_pct): return the busiest card share in percent under family hashing with one colliding cold family, rounded to 2 decimals.',
            starterCode: `def busiest(hot_pct):
    # One prompt template owns hot_pct percent of arrivals. The family
    # hash lands its card every one of them, and at worst one of the
    # other 63 families collides onto it too.
    pass

# Test
print(busiest(80))   # 80.32
print(busiest(20))   # 21.27
print(busiest(50))   # 50.79
`,
            testCases: [
                { input: 'busiest(80)', expected: '80.32' },
                { input: 'busiest(20)', expected: '21.27' },
                { input: 'busiest(50)', expected: '50.79' },
            ],
            hints: [
                'The hot family takes hot_pct of arrivals whole; the cold families split 100 - hot_pct across 63 cards, and one of them can land on the hot card fully.',
                'The answer is round(hot_pct + (100 - hot_pct) / 63, 2). Watch the operator precedence: the cold-family term multiplies the remainder, not the sum.',
                'Carry the follow-up answer with the number: sharding the hot family across two cards doubles one preamble copy to halve this concentration.',
            ],
            optimalComplexity: { time: 'O(1)', space: 'O(1)' },
            tags: ['routing', 'load-balancing', 'concentration', 'ai-track'],
        },
    ],
    visualizationType: 'chart',
};
const QUANT_STACK = {
    id: 'quant-stack',
    title: 'Quantization & the Startup Stack',
    category: 'concepts',
    icon: 'Cpu',
    difficulty: 4,
    track: 'ai',
    description: 'The second serving job is not the fleet; it is the one card, when the budget is what a startup can put on the balance sheet instead of a Vercel bill. Open weights changed the question: the model can be downloaded, and the job becomes making it fit and making it fast on hardware a 24 GB card describes. Three compression decisions run in a fixed order. Weight precision comes first: a model of P parameters takes 2 x P bytes at bf16, 1 x P at INT8, and 0.5 x P at 4-bit, and because decode is bandwidth bound - the card re-reads every weight byte for each token - cutting the bytes in half doubles tokens/sec per stream exactly. An 8B brain goes from 16 GB to 4 GB, and a card re-reading 4 GB through a 1008 GB/s bus decodes 252 tokens a second per stream. KV precision comes second and is the cheaper knob: the per-seat rent of 128 KB a token at bf16 for an 8B-class model collapses quarter-price at 4-bit, which is what llama.cpp KV quantization and vLLM FP8 KV do, while costing about a quality point. Model size, the third knob, is the expensive one - but distillation is how startups move it: train a smaller student on the outputs of a bigger teacher and keep most of the quality at a fraction of the arithmetic. The follow-up interviewers run at startups is the trap answer: quantization is never one decision. Weights, KV, and context length are three separate dial groups, and the 4-bit-weights-on-4-bit-KV stack is the combination that lives just under the quality floor, which is why the quality regression has to be measured, not assumed - bad quantization scales have produced long-context regressions that dropped retrieval recall from 91 to 13 percent before a recalibration put it back. The three challenges below work the stack: the bytes of weights a precision choice buys, the seats a card grants after the per-seat KV rent, and the tokens/sec the memory bus lets through.',
    keyPoints: [
        'Decode is bandwidth bound at batch 1: tokens/sec per stream is card bandwidth divided by weight bytes, so precision is speed. Halving the bytes per parameter doubles the decode rate - 70B at bf16 reads 140 GB and streams 7.2 tokens/s on a 4090, at INT8 14.4, at 4-bit 28.8',
        'Weight precision buys everything else: 4-bit quantization (GPTQ/AWQ style) quarters the weights, which is what lets a 70B-class model sit at all - 35 GB fits a Mac Studio or a 48 GB card where bf16 (140 GB) fits nothing on the menu',
        'KV precision is the cheap knob: it quarters the per-seat rent at 4-bit while costing around a quality point, and it is the dial that saves long-context pods, because per-seat rent is context tokens times KV bytes, and context is what renters promise',
        'Compression decisions are separate and stack: weights, KV, and context length are three dials, and the quality regression has to be measured per stack - bad quantization scales have caused long-context recall collapses from 91 to 13 percent, while a good recalibration restored it to 89, so "4-bit barely changes quality" is the trap answer',
        'Distillation moves the model-size knob: a smaller student trained on a bigger teacher\'s outputs keeps most of the domain quality at a fraction of the arithmetic, and it is why startups ship a 14B instead of licensing a 70B - the student decodes 5x faster on the same card',
        'VRAM buys seats, bandwidth buys tokens: a Mac Studio holds 43 seats of a quantized 70B and streams 11 tokens/sec per seat, while a 4090 holds none and would stream 28.8 per stream if it fit. The card choice is two separate checks, and interviewers score answers that name both',
    ],
    keyTradeoffs: [
        {
            axis: 'Precision vs quality',
            tension: '4-bit weights cut the memory bill 4x and double-pair decode speed, but the quality bill is real and stack-specific: INT8 costs about a point, 4-bit about three, and stacking 4-bit KV on 4-bit weights is the combination that crosses the floor. The professional answer is to pick a target metric, measure the stack against it, and keep a fallback config on disk - not to assume "quantized models are fine now".',
        },
        {
            axis: 'VRAM vs bandwidth in card choice',
            tension: 'A 96 GB unified-memory machine and a 24 GB consumer card both hold seats, but they decode differently: the unified-memory machine trades bandwidth (400 GB/s) for room, the consumer card trades room for bandwidth (1008 GB/s). Long-context pods need the VRAM, interactive pods need the bus, and a fleet plan that mixes both cards by workload is stronger than a fleet plan that buys one size.',
        },
        {
            axis: 'Distill down vs serve up',
            tension: 'Serving the 70B keeps full quality and pays in cards, concurrency, and speed; distilling to a 14B pays a one-time training bill and rents that back every request as faster decode and more seats. The breakeven is usage-weighted, and startups that measure it choose the student; the interview answer names the student\'s real failure mode - quality on inputs the teacher never generated.',
        },
    ],
    pythonExample: `# The startup stack on one card: 4-bit weights, 4-bit KV, one 24 GB card.
# Every seat rents context tokens of KV; the card seats floor(what is left).
KV_TOKEN_BYTES = {3: 114688, 8: 131072, 14: 196608, 32: 262144, 70: 327680}

def seats(free_gb, params_b, kv_ratio, ctx_tokens, bytes_per_param=0.5):
    model_gb = params_b * bytes_per_param
    kv_gb = ctx_tokens * KV_TOKEN_BYTES[params_b] * kv_ratio / 1e9
    return max(0, int((free_gb - model_gb) // kv_gb))

def decode_rate(bandwidth_gb_s, params_b, bytes_per_param=0.5):
    return bandwidth_gb_s / (params_b * bytes_per_param)

print(seats(22, 8, 0.5, 8192))     # 33 seats of 4-bit 8B on a 4090
print(seats(94, 70, 0.5, 8192))    # 43 seats of 4-bit 70B on 96 GB
print(decode_rate(1008, 70))       # 28.8 tokens/s: the same bus, quarter of the read
print(decode_rate(400, 70))        # 11.4: the Mac fits wide and decodes slow
`,
    challenges: [
        {
            id: 'weight-budget-bytes',
            title: 'Bytes of Weights a Precision Buys',
            difficulty: 'easy',
            description: 'The first scaling decision on a consumer card is weight precision, because the model\'s weights are the memory bill that pays for everything else before a single seat exists. The arithmetic is one line: a model of P parameters at bf16 takes 2 x P bytes, at INT8 or FP8 1 x P, and at 4-bit (GPTQ or AWQ quantization) 0.5 x P. The numbers interviewers check: an 8B brain is 16 GB bf16 - too big to leave KV room on a 24 GB card - and 4 GB at 4-bit, leaving 18 GB for seats; a 70B brain is 140 GB bf16 and fits no card a startup can afford, while at 4-bit it is 35 GB and fits a 48 GB card with room for eight seats. Since decode re-reads every weight byte per token, each precision step also exactly doubles the decode rate, so this one knob is the whole budget story: memory, speed, and about one to three quality points. Implement weight_gb(params_b, bytes_per_param): return the GB of weights a model of params_b billions of parameters needs at that precision.',
            starterCode: `def weight_gb(params_b, bytes_per_param):
    # params_b is in billions; bytes_per_param is 2 (bf16), 1 (INT8/FP8),
    # or 0.5 (4-bit GPTQ/AWQ).
    pass

# Test
print(weight_gb(8, 2))     # 16
print(weight_gb(70, 0.5))  # 35.0
print(weight_gb(32, 1))    # 32
`,
            testCases: [
                { input: 'weight_gb(8, 2)', expected: '16' },
                { input: 'weight_gb(70, 0.5)', expected: '35.0' },
                { input: 'weight_gb(32, 1)', expected: '32' },
            ],
            hints: [
                'The body is params_b * bytes_per_param; the billions cancel exactly into GB at bytes granularity.',
                'Note the float: 70 * 0.5 is 35.0 in Python, and the graders compare against 35.0. Integer inputs give integers, 0.5 gives a float.',
                'Carry the follow-up: because decode reads every weight byte per token, going bf16 to 4-bit doubles tokens/sec per stream - precision is also the speed answer.',
            ],
            optimalComplexity: { time: 'O(1)', space: 'O(1)' },
            tags: ['quantization', 'memory', 'serving', 'ai-track'],
        },
        {
            id: 'concurrent-seats',
            title: 'Seats After the Per-Seat KV Rent',
            difficulty: 'medium',
            description: 'Weights come off the card first; what remains is the seat budget, and every concurrent seat rents context_tokens x kv_bytes_per_token bytes of it, prompt and answer alike. The division is the whole capacity plan: free GB minus model GB, floored, over the per-seat rent - because a partial seat cannot run, and a card holding the model alone serves one viewer at a time (return 0 when even one seat does not fit). The numbers that matter at 24 GB, after about 2 GB the runtime keeps: an 8B brain at bf16 (16 GB) leaves 2 seats of 16k context at BF16 KV, which is why the precision steps exist; a quantized 70B on a 48 GB card (11 GB left) holds 8 seats of 8k at 8-bit KV; and the same free GB at 24k context and bf16 KV holds fewer seats than the pod needs. This is the follow-up to "what fits" and the number the batch dial cannot override. Implement max_seats(free_gb, model_gb, kv_bytes_per_token, seq_tokens): return the whole number of concurrent seats, 0 when none fit; 1 GB is 1,000,000,000 bytes and kv_bytes_per_token is the effective per-token size at whatever KV precision the stack chose.',
            starterCode: `def max_seats(free_gb, model_gb, kv_bytes_per_token, seq_tokens):
    # free_gb and model_gb are in GB (use 1e9 bytes). Each seat holds
    # kv_bytes_per_token * seq_tokens bytes. Floor it; a partial seat
    # cannot run. Weights too big for the card: 0 seats.
    pass

# Test
print(max_seats(22, 16, 131072, 16384))  # 2
print(max_seats(46, 35, 163840, 8192))   # 8
print(max_seats(22, 14, 196608, 24576))  # 1
`,
            testCases: [
                { input: 'max_seats(22, 16, 131072, 16384)', expected: '2' },
                { input: 'max_seats(46, 35, 163840, 8192)', expected: '8' },
                { input: 'max_seats(22, 14, 196608, 24576)', expected: '1' },
            ],
            hints: [
                'Per-seat bytes are kv_bytes_per_token x seq_tokens; free bytes are (free_gb - model_gb) x 1e9. Floor division // returns the whole seats.',
                'Return 0 when the subtraction goes negative - that covers weights too big for the card, the case the floor alone would round to a positive.',
                'The knob that moves this number most at long contexts is KV precision, not weight precision: halving the per-token bytes doubles the seats.',
            ],
            optimalComplexity: { time: 'O(1)', space: 'O(1)' },
            tags: ['quantization', 'kv-cache', 'capacity', 'ai-track'],
        },
        {
            id: 'decode-token-rate',
            title: 'Tokens/sec the Memory Bus Lets Through',
            difficulty: 'easy',
            description: 'Decode at batch 1 is bandwidth bound: every generated token re-reads every weight byte from card memory, whether the model is served to one stream or many. So the per-stream decode rate has an exact ceiling: bandwidth divided by weight bytes. A 4090 moves about 1008 GB/s; a 70B brain at bf16 is 140 GB, which is 7.2 tokens/sec per stream. Quantize to 4-bit (35 GB) and the same bus carries 28.8. A used 3090 moves 936 GB/s - nearly the same read for a fifth of the price, and the reason used 3090s sell out. A Mac Studio\'s unified memory moves 400 GB/s: it holds seats nothing else can, and decodes slowly everywhere - a 70B streams 11.4 tokens/sec no matter how much memory is free. This is the number that answers "will it feel fast" before any demo is built, and the follow-up (batch size) raises aggregate tokens/sec but never this per-stream ceiling. Implement decode_rate(bandwidth_gb_s, params_b, bytes_per_param): return tokens/sec per stream, rounded to 2 decimals.',
            starterCode: `def decode_rate(bandwidth_gb_s, params_b, bytes_per_param):
    # Decode re-reads every weight byte per token: the bus is the
    # ceiling. bandwidth_gb_s is the card's memory bandwidth in GB/s.
    pass

# Test
print(decode_rate(1008, 70, 2))    # 7.2
print(decode_rate(1008, 70, 0.5))  # 28.8
print(decode_rate(400, 8, 2))      # 25.0
`,
            testCases: [
                { input: 'decode_rate(1008, 70, 2)', expected: '7.2' },
                { input: 'decode_rate(1008, 70, 0.5)', expected: '28.8' },
                { input: 'decode_rate(400, 8, 2)', expected: '25.0' },
            ],
            hints: [
                'The body is round(bandwidth_gb_s / (params_b * bytes_per_param), 2): one division after the weight bytes multiply.',
                'Say why batching does not lift this number in the interview: the bus is already saturated by the weights at batch 1, so batching multiplies useful work at the same read, which is where aggregate throughput comes from.',
                'The precision step is the speed step: each halving of bytes_per_param exactly doubles the rate, which is why 4-bit is the startup default.',
            ],
            optimalComplexity: { time: 'O(1)', space: 'O(1)' },
            tags: ['quantization', 'throughput', 'roofline', 'ai-track'],
        },
    ],
    visualizationType: 'chart',
};
const FLEET_DECISION = {
    id: 'fleet-decision',
    title: 'Buying the Fleet',
    category: 'concepts',
    icon: 'Warehouse',
    difficulty: 4,
    track: 'ai',
    description: 'The third serving job is the balance sheet: the product found users, the token demand no longer fits on a demo pod, and the interview question becomes procurement. Do you buy the fleet, rent it month to month, or route the overflow through a frontier API\'s meter? The model is one month. Demand is stated in terabytes of tokens (10T a month is a serious product, 1000T is frontier traffic), a month is 730 hours, and each card contributes an aggregate tokens/sec rate a well-fed, batched steady state sustains: an H100 carries about 10,000 tokens/sec on an 8B chat and 700 on a 70B premium, a B200 is 2.4x either, and a used A100 is 0.45x an H100. Three dollar lines then price the month. Owned cards bill their card-month no matter what flows - about $2,100 to $2,900 for the modern chips once the capex is amortized over 36 months and power, colo, network, and staff are added - rented cards bill the cloud\'s roughly 1.35x premium on the same floor, and the API bills per token at retail: $0.20 per 1M for the 8B chat, $2.50 for the 70B premium. Notice what that ordering says: ownership beats renting on the per-token rate everywhere, because the cloud premium is the margin it takes for owning. So the question is never "own or rent on rate" - it is utilization. An owned GPU idling is a mortgage payment, and the idle check lets at most 15% of owned capacity sit unused; sizing the fleet to a story about growth instead of the demand curve is how a $441M bet runs 71% idle. The margin check says self-hosting must beat the API by a real quarter - blended cost at most 75% of the API\'s price - because owning takes financing risk a rental does not: a failed chip generation or a slower model year erases a thin saving. The overflow check caps the API\'s share at 10% of needed tokens, because the API is metered per token at retail while rented cards bill wholesale: at sustained volumes, 40% of a big month\'s shortfall bills more than the whole rented cloud would. The sim\'s three stories are the used-chip bargain that was cheap per card and expensive per token, the shiny chip bet that bought for a demand curve that had not arrived, and the API tax where the overflow meant to catch the spike swallowed the month. The three challenges below work the model: the tokens a fleet carries, the whole rented cards that fill the shortfall, and the dollars the API meter bills on its share.',
    keyPoints: [
        'Ownership beats renting on the per-token rate everywhere - the cloud\'s ~1.35x card-month premium is the margin it charges for owning - so nobody buys because of the rate. People buy to capture utilization at scale over a horizon, and the interview answer names utilization, not unit cost',
        'Idle is the mortgage: owned cards bill their card-month whether tokens flow or not, and the idle check allows at most 15% of owned capacity unused. Sizing to a growth story is how a $441M fleet runs 71% idle, and renting the same capacity month to month costs nothing when it does nothing',
        'The margin rule: blended cost at most 75% of the API price for the same tokens. Owning carries financing risk a rental never does (obsolescence, chip-generation failures), so a thin saving over the API is not a business. This check is what the blend math measures',
        'The burst buffer is policy, not padding: owned capacity sized to average demand strands the peak, and a card rented at the peak costs more than one rented all month. The buffer (0 to 30% here) is what turns demand into the needed tokens the plan must carry',
        'The API overflow caps at 10% of needed tokens: the API meters per token at retail while rented cards bill a card-month, so 40% of a big shortfall bills more than the whole rented cloud would. The API is for the first week of a spike, not the whole month',
        'The chip\'s token rate, not its sticker, prices the tokens: a used A100 at $12k delivers 315 premium tokens/sec ($1.57/1M owned) while an H100 delivers $1.16/1M and a B200 $0.66/1M. Buy chips against the workload they will serve - and chip step is 2.4x on both workloads, which is why fleet plans do not mix chips casually',
    ],
    keyTradeoffs: [
        {
            axis: 'Buy the base load vs rent it',
            tension: 'Owning wins the monthly per-token race (H100 8B chat at $0.08/1M owned vs $0.10 rented) but takes the idle risk and a 36-month commitment to hardware that depreciates toward a chip transition; renting runs ~1.35x the same bill with zero commitment and zero idle risk. The professional answer sizes the buffer of owned capacity from measured demand, not from a fundraise deck.',
        },
        {
            axis: 'Own the peak vs route the peak',
            tension: 'The burst buffer either sits on your balance sheet (bigger owned fleet, higher idle floor exposure) or on rented cards (available in hours, expensive per month) or on the API (instant, retail per token). Each rung up costs more per token and is easier to unwind, and startups usually die holding the wrong end of this: too much owned buffer at small demand, too much API at big demand.',
        },
        {
            axis: 'Slow cheap chips vs fast chips at the margin',
            tension: 'A used A100 is $12k against the H100\'s $30k, but it carries 0.45x the tokens, so the per-token rate is what it prices - and on premium workloads its rented rate sits $0.81 under the API, leaving no margin for the buffer. The B200\'s 2.4x rate is what buys the margin room; the used A100\'s discount is what buys the capex story. An interviewer scores the answer that prices the bargain in tokens, not cards.',
        },
    ],
    pythonExample: `# One month of fleet math: 730 hours, three dollar lines.
import math

MONTH_S = 730 * 3600  # 2,628,000 seconds

def owned_tokens_tb(fleet, tok_s):
    return round(fleet * tok_s * MONTH_S / 1e12, 3)

def rent_cards(needed_tb, carried_tb, tok_s):
    per_card_tb = tok_s * MONTH_S / 1e12
    shortfall = max(0.0, needed_tb - carried_tb)
    return 0 if shortfall == 0 else math.ceil(shortfall / per_card_tb)

def api_overflow_bill(api_share, needed_tb, carried_tb, price_per_1m):
    shortfall_tb = max(0.0, needed_tb - carried_tb)
    return round(shortfall_tb * api_share / 100 * 1e6 * price_per_1m)

print(owned_tokens_tb(700, 10000))        # 18.396T carried by 700 H100s
print(rent_cards(31.25, 18.396, 10000))   # 490 rented H100s fill the gap
print(rent_cards(125, 1.28772, 700))      # 67250: demand outruns ownership
print(api_overflow_bill(40, 125, 1.28772, 2.5))  # 123712280: the API tax
`,
    challenges: [
        {
            id: 'fleet-carried-tokens',
            title: 'Tokens the Fleet Carries',
            difficulty: 'easy',
            description: 'The first number in any fleet plan is monthly owned capacity, and it is owned tokens equal to cards times tokens/sec per card times the seconds in a month. A month is 730 hours, or 2,628,000 seconds. The numbers interviewers check: 700 H100s carrying an 8B chat at the batched steady state (10,000 aggregate tokens/sec per card) carry 18.396 terabytes of tokens a month; 9,800 B200s on a 70B premium (1,680 tokens/sec) carry 43.267T - and against a 10T demand curve that same fleet is 71% idle, which is where the balance sheet lesson lives. Everything downstream (the carry, the idle fraction, the blend) starts from this line. Implement owned_tokens_tb(fleet, tok_s): return the monthly owned capacity in terabytes of tokens, rounded to 3 decimals.',
            starterCode: `def owned_tokens_tb(fleet, tok_s):
    # fleet is card count; tok_s is aggregate sustained tokens/sec per card.
    # One month is 730 hours = 2,628,000 seconds. 1 T = 1e12 tokens.
    pass

# Test
print(owned_tokens_tb(700, 10000))  # 18.396
print(owned_tokens_tb(9800, 1680))  # 43.267
print(owned_tokens_tb(1400, 700))   # 2.575
`,
            testCases: [
                { input: 'owned_tokens_tb(700, 10000)', expected: '18.396' },
                { input: 'owned_tokens_tb(9800, 1680)', expected: '43.267' },
                { input: 'owned_tokens_tb(1400, 700)', expected: '2.575' },
            ],
            hints: [
                'fleet * tok_s * 2628000 / 1e12 is the whole answer; round(..., 3) shapes the decimals. Watch the exponent: 1 T is 1e12 tokens, so the result is in terabytes, not billions.',
                'Say in the interview why the steady-state rate is aggregate, not per-stream: batched serving multiplies useful work per card-month, and a capacity plan built on batch-1 numbers buys a fleet several times too big.',
                'Sanity check the unit flow: tokens/sec x seconds = tokens; divide by 1e12 to get terabytes. Getting 18,396 instead of 18.396 means a factor of 1,000 walked off somewhere.',
            ],
            optimalComplexity: { time: 'O(1)', space: 'O(1)' },
            tags: ['fleet', 'capacity', 'procurement', 'ai-track'],
        },
        {
            id: 'overflow-rent-cards',
            title: 'Whole Rented Cards That Fill the Gap',
            difficulty: 'easy',
            description: 'Whatever owned capacity does not carry is the shortfall, and the shortfall is filled by rented whole cards - you cannot rent 0.7 of a GPU, so the bill rounds up. The per-card monthly capacity is the same arithmetic as the owned line: tokens/sec times 2,628,000 seconds, in terabytes. The numbers interviewers check: 25T of 8B demand plus a 25% buffer needs 31.25T; owned 700 H100s carry 18.396T; the 12.854T shortfall ÷ 0.02628T per rented card is 489.1, so 490 cards rent and 490 x $2,600 is the month\'s rent line. At the other extreme, a 125T premium demand against 1.28772T of owned capacity rents 67,250 H100s - the number that should make any fleet plan check its demand curve before its purchase order. Implement rent_cards(needed_tb, carried_tb, tok_s): return the whole rented cards, 0 when nothing is short.',
            starterCode: `import math

def rent_cards(needed_tb, carried_tb, tok_s):
    # per_card_tb is tok_s * 2628000 / 1e12. Shortfall is needed - carried,
    # floored at 0. You cannot rent a fraction of a card: round up.
    pass

# Test
print(rent_cards(31.25, 18.396, 10000))  # 490
print(rent_cards(125, 1.28772, 700))     # 67250
print(rent_cards(10.0, 10.0, 700))       # 0
`,
            testCases: [
                { input: 'rent_cards(31.25, 18.396, 10000)', expected: '490' },
                { input: 'rent_cards(125, 1.28772, 700)', expected: '67250' },
                { input: 'rent_cards(10.0, 10.0, 700)', expected: '0' },
            ],
            hints: [
                'Guard the shortfall at 0 first and return 0 - then ceil(shortfall / per_card_tb) is one line. Forgetting the guard breaks the balanced-fleet case, which is the case the demo shows.',
                'The rounding is ceil, not round: 489.1 cards means one extra card at full billing. Interviewers probe exactly this - "the rented card idles the 0.9 you did not use, and its bill is whole."',
                'Watch the units once more: per_card in terabytes is a small number (0.0018 for a 70B H100), and a small denominator is why the shortfall turns into tens of thousands of cards.',
            ],
            optimalComplexity: { time: 'O(1)', space: 'O(1)' },
            tags: ['fleet', 'capacity', 'renting', 'ai-track'],
        },
        {
            id: 'api-overflow-bill',
            title: 'What the API Meters the Overflow',
            difficulty: 'medium',
            description: 'The overflow can also route through a frontier API, metered per token at retail: api_tokens x price per 1M. The unit chain is the interview gotcha - terra-tokens times 1e6 converts to millions, because a 49.48T API share is 49.48 million million-token units and at $2.50 each that is $123.7M for one month. The numbers interviewers check: 40% of a 123.71228T shortfall at $2.50 per 1M bills $123,712,280 - more than the whole rented cloud would charge for the same tokens ($104.9M) - while 10% of a 12.854T 8B shortfall at $0.20 bills just $257,080. The check, the reason the overflow stays niche: at 10% of needed tokens the premium is affordable insurance, past it the API meter swallows the margin owning was supposed to capture. Implement api_overflow_bill(api_share, needed_tb, carried_tb, price_per_1m): return dollars billed through the API for that share of the shortfall, rounded to whole dollars.',
            starterCode: `import math

def api_overflow_bill(api_share, needed_tb, carried_tb, price_per_1m):
    # Shortfall in terra-tokens floored at 0. The API share is a percent.
    # Terra-tokens convert to 1M-token units with x 1e6.
    pass

# Test
print(api_overflow_bill(40, 125, 1.28772, 2.5))  # 123712280
print(api_overflow_bill(10, 31.25, 18.396, 0.2)) # 257080
print(api_overflow_bill(0, 125, 1.28772, 2.5))   # 0
`,
            testCases: [
                { input: 'api_overflow_bill(40, 125, 1.28772, 2.5)', expected: '123712280' },
                { input: 'api_overflow_bill(10, 31.25, 18.396, 0.2)', expected: '257080' },
                { input: 'api_overflow_bill(0, 125, 1.28772, 2.5)', expected: '0' },
            ],
            hints: [
                'Return round(shortfall_tb * api_share / 100 * 1e6 * price_per_1m): one conversion (x 1e6), one meter. Writing x 1e12 anywhere is the off-by-a-thousand bug this challenge exists to catch.',
                'Guard the shortfall at 0 before sharing: a surplus month must bill the API nothing, and the 0-share case exercises the same guard from the other side.',
                'Say in the interview why the cap is 10%: per-token retail is multiples of the card-month wholesale rate, so the API is affordable insurance at 10% and a second infrastructure bill at 40%.',
            ],
            optimalComplexity: { time: 'O(1)', space: 'O(1)' },
            tags: ['fleet', 'procurement', 'api-pricing', 'ai-track'],
        },
    ],
    visualizationType: 'chart',
};
// The token meter: one month of one product's bill, the same model the
// TokenMeteringWalkthrough component drives through lib/ai/meterSim.ts.
// Anchors: a chat turn costs $0.00184 on the fast tier; the 6M-run research
// agent on flagship bills $523,152 a month; the copilot's flagship bill at
// 5% retries and 50% tagged is $128,596 with $64,298 of it untagged.
const METER_BILL = {
    id: 'cost-metering',
    title: 'Metering & Cost Attribution',
    category: 'concepts',
    icon: 'Gauge',
    difficulty: 4,
    track: 'ai',
    description: 'The fourth serving job is the meter: the model serves traffic, the fleet is paid for, and the dollars land on an invoice that says per 1M, in and out, so the interview question becomes who spent what and on whose behalf. The model is one month of one product. Tokens per request are stated per side - a chat assistant sends 800 prompt tokens and writes 300 out, a coding copilot 2,400 and 600, and a research agent 12,000 and 4,000, because an agentic loop re-sends its context after every tool call and produces tool chatter of its own, so the same "request" moves 15x the tokens. Rates are per 1M tokens, priced separately for prompt and output: the fast tier is $0.80 in and $4.00 out, the flagship $3 and $15, the frontier $15 and $75 - and the out-rate is always the 5x side, because output is generated token by token against a weight read that a prompt prefix caches but an answer never does. Three policy lines decide whether the ledger can be trusted. The prefix cache sells the repeated prompt at a tenth of the fresh rate, so the cached share of prompt tokens is the cheapest dollar on the bill and the saved line meters the discount forgone. Retries re-bill the whole request at full price - both sides - so a 20% retry rate is a 17% tax that product analytics never sees, because from the code\'s point of view nothing changed. Attribution, tagging the bill by named spender, adds no dollars at all, but a bill with no owner is invisible to the chargeback, the margin check, and the anomaly alert, and the sim lets at most 10% of the bill go untagged before it stops being a ledger. The output numbers compound: the blended rate - bill over every token moved - is the one-line answer to "what does this product cost us per use," and the raw bill against the budget line is the one finance reads. Interviewers test this because the meter is where engineering meets accounting: the xAE-style system-design round asks how you would bill two teams sharing one serving pool, and cost-per-request arithmetic shows up under the scaling follow-ups of nearly every AI design question. The three challenges below work the meter: the dollars one request bills, the bill the cached prefix discounts, and the ghost dollars a half-tagged bill leaks.',
    keyPoints: [
        'Tokens per request decide the bill before the model does: the same 6M requests bill $523,152 as the research agent on flagship, $85,730 as the copilot, and $38,027 as the chat assistant - a 15x spread from nothing but the request profile, which is why the interview answer prices a product in tokens per request, not requests',
        'The out-rate is the 5x side of every tier, and output never caches: on the agent profile the output line is $360k of a $498k clean bill, so a 90% prompt-cache discount cannot rescue a bill whose weight sits on the generated side',
        'The cache line bills the repeated prefix at 10% of the fresh rate: at a 40% hit share the prompt line bills at a 0.64 factor (0.6 fresh + 0.4 x 0.1), and the saved line - the discount forgone - is the first thing to meter when the bill surprises you',
        'A retry is a second workload you never planned for: it re-bills prompt and output at full price, a 20% rate taxes the bill 17%, and product analytics still report the traffic did not change - only the meter saw the re-billed requests',
        'Attribution adds no dollars, it names them: the untagged share is real spend with no owner, invisible to chargeback, margin math, and alerts, and past 10% of the bill the ledger stops being a ledger - the fix is a required tag on every metered call, not a hunt for the missing dollars',
        'The blended rate - bill over every token moved, cached and fresh - is the scale-free price of the product, and the raw bill against the budget line is the accounting check; the two answers disagree on purpose, because rate per use and dollars per month measure different failures',
    ],
    keyTradeoffs: [
        {
            axis: 'Token-rich features vs the meter',
            tension: 'The research agent answers better because it re-reads context and streams tool turns, and every one of those tokens bills: 15x the tokens per request turns a rounding-error feature into the budget line. The design answer is not "use less model" but "price the profile first" - tokens per request, the cached share, and the retry rate decide what a feature costs before the tier does.',
        },
        {
            axis: 'Cache hit share vs profile shape',
            tension: 'A high prefix-cache hit share is the cheapest dollar on an agent bill, because agent context is mostly re-sent system prompts and prior turns - exactly what a prefix cache sells at a tenth of the rate. But the discount lands only on the prompt side: a profile that writes long answers bills the output line at full price no matter how perfect the cache is, so the cache strategy follows the in/out ratio, not the hype.',
        },
        {
            axis: 'Metering discipline vs shipping speed',
            tension: 'Attribution is infrastructure: a required tag on every metered call costs a code-review rule and a failing test, while retrofitting tags after the fact means untangling a bill that has already taught finance nothing. Ten unowned percent this month is how a chargeback becomes an argument, and the teams that meter leaks as separate lines (retries, untagged share) catch the anomaly the month it starts.',
        },
    ],
    pythonExample: `# One month, one product, one meter: the three lines that decide the bill.
def request_cost(prompt_tokens, output_tokens, in_rate, out_rate):
    return (prompt_tokens * in_rate + output_tokens * out_rate) / 1e6

def month_bill(requests, prompt_tokens, output_tokens, in_rate,
               out_rate, cache_pct, retry_pct):
    prompt = requests * prompt_tokens / 1e6    # millions of prompt tokens
    output = requests * output_tokens / 1e6
    cached = prompt * cache_pct / 100
    clean = cached * 0.1 * in_rate + (prompt - cached) * in_rate + output * out_rate
    return round(clean * (1 + retry_pct / 100), 2)

def unattributed_usd(gross_usd, retry_pct, tagged_pct):
    billed = gross_usd * (1 + retry_pct / 100)
    return round(billed * (100 - tagged_pct) / 100, 2)

print(request_cost(800, 300, 0.8, 4))          # 0.00184 - one chat turn
print(month_bill(6000000, 12000, 4000, 3, 15, 40, 5))  # 523152.0 - the agent shock
print(unattributed_usd(122472.0, 5, 50))       # 64297.8 - the ghost bill, unowned
`,
    challenges: [
        {
            id: 'meter-request-cost',
            title: 'Dollars One Request Bills',
            difficulty: 'easy',
            description: 'Every metering question starts with one number: what does a single request cost? The meter prices the two sides separately because they measure differently - prompt tokens are read and cacheable, output tokens are generated one at a time and never cache - so the request bill is prompt_tokens x in_rate + output_tokens x out_rate, all over 1e6 because rates are per 1M tokens. The numbers interviewers check: a chat turn (800 in, 300 out) on the fast tier ($0.80 in, $4.00 out) bills $0.00184 of which $0.0012 is output; the research agent (12,000 in, 4,000 out) on the flagship ($3, $15) bills $0.096, over 50x the chat turn; and the copilot profile on the frontier tier ($15, $75) bills $0.081 - the same copilot that costs $0.00432 on the fast tier, a nearly 19x step for the tier jump. Two sides, one product: before you argue about model choice or caching, you can say what one call actually costs. Implement request_cost(prompt_tokens, output_tokens, in_rate, out_rate): return dollars billed by one request, rounded to 6 decimals.',
            starterCode: `def request_cost(prompt_tokens, output_tokens, in_rate, out_rate):
    # Rates are dollars per 1M tokens, so divide the side-totals by 1e6.
    # Prompt and output price separately: the out-rate is the expensive side.
    pass

# Test
print(request_cost(800, 300, 0.8, 4))     # 0.00184
print(request_cost(12000, 4000, 3, 15))   # 0.096
print(request_cost(2400, 600, 15, 75))    # 0.081
`,
            testCases: [
                { input: 'request_cost(800, 300, 0.8, 4)', expected: '0.00184' },
                { input: 'request_cost(12000, 4000, 3, 15)', expected: '0.096' },
                { input: 'request_cost(2400, 600, 15, 75)', expected: '0.081' },
            ],
            hints: [
                'The whole answer is (prompt_tokens * in_rate + output_tokens * out_rate) / 1e6, rounded to 6 decimals. Getting 1840 instead of 0.00184 means a factor of a million walked off.',
                'Check which side dominates: the chat turn is $0.00064 in and $0.0012 out. Output pricing is the 5x lever on every rate card - that is the sentence interviewers listen for.',
                'Sanity-check scale: a bill of one request is fractions of a cent. Values in whole dollars mean the 1e6 conversion went missing.',
            ],
            optimalComplexity: { time: 'O(1)', space: 'O(1)' },
            tags: ['metering', 'cost', 'billing', 'ai-track'],
        },
        {
            id: 'cache-discount-bill',
            title: 'The Bill the Cached Prefix Discounts',
            difficulty: 'medium',
            description: 'The prefix cache is the meter\'s good news: the repeated share of the prompt bills at a tenth of the fresh rate, because the provider reads it once and keeps it, so the prompt line is (cached_share x 0.1 + fresh_share) x in_rate, with the cached share in percent. The output line is untouched - answers are generated fresh every time - so the full request bill is the discounted prompt line plus output_tokens x out_rate. The numbers interviewers check: the flagship agent at a 90% hit share (12M in, 4M out, $15 and $75) bills $334.20 where the fresh-rate bill would be $480.00 - the cache takes $145.80 off a $180.00 prompt line while $300.00 of output bills straight through; the same agent at a 40% hit share bills $415.20; and a chat turn at 40% costs $0.00161 instead of $0.00184. That asymmetry is the lesson: the cache saves the prompt side only, so the feature that writes long answers keeps bill weight the cache cannot reach. Implement cached_bill(prompt_tokens, output_tokens, in_rate, out_rate, cache_pct): return the discounted dollar bill of one request, rounded to 6 decimals.',
            starterCode: `def cached_bill(prompt_tokens, output_tokens, in_rate, out_rate, cache_pct):
    # The cached share of the prompt bills at 10% of the fresh rate; the
    # rest of the prompt and all of the output bill fresh.
    pass

# Test
print(cached_bill(1000000, 200000, 3, 15, 40))       # 4.92
print(cached_bill(800, 300, 0.8, 4, 40))             # 0.00161
print(cached_bill(12000000, 4000000, 15, 75, 90))    # 334.2
`,
            testCases: [
                { input: 'cached_bill(1000000, 200000, 3, 15, 40)', expected: '4.92' },
                { input: 'cached_bill(800, 300, 0.8, 4, 40)', expected: '0.00161' },
                { input: 'cached_bill(12000000, 4000000, 15, 75, 90)', expected: '334.2' },
            ],
            hints: [
                'Build the prompt line as prompt_tokens x (cache_pct/100 x 0.1 + (1 - cache_pct/100)) x in_rate, then add output_tokens x out_rate and divide by 1e6.',
                'The discount applies to the prompt only: touching output_tokens with cache_pct is the exact bug this challenge exists to catch - the output line is always full price.',
                'Say in the interview why the provider can sell cached input at a tenth: the prefix is read once and kept, so the meter charges reading, not re-billing. Cache hit share is the first knob to raise when a bill surprises you.',
            ],
            optimalComplexity: { time: 'O(1)', space: 'O(1)' },
            tags: ['metering', 'cost', 'caching', 'ai-track'],
        },
        {
            id: 'unattributed-bill',
            title: 'Ghost Dollars a Half-Tagged Bill Hides',
            difficulty: 'medium',
            description: 'Two policy lines stack into the ghost dollars. A retry re-bills the whole request in full, so a retry_pct rate multiplies the gross bill by (1 + retry_pct/100) - product analytics never register these calls, they are re-bills of calls it already counted. Tagging then names the spenders: the untagged share of the bill is (100 - tagged_pct)/100 of it, and that money has no owner, so no chargeback, no margin check, and no anomaly alert can see it. The numbers interviewers check: a $5M gross month at a 20% retry rate and 50% tagged becomes $6M billed with $3M of it unattributed - three million ghost dollars in one month; the flagship copilot\'s clean $122,472 at a 5% retry and 50% tagged is $128,595.60 billed with $64,297.80 unowned; and a perfectly tagged bill at zero retries hides nothing, $0. The interview answer names both multipliers and what they are for: the retry factor is a cost leak, the untagged factor is a visibility leak, and a bill with 50% of its dollars unnamed is not a ledger. Implement unattributed_usd(gross_usd, retry_pct, tagged_pct): return the unattributed dollars after the retry multiplier, rounded to 2 decimals.',
            starterCode: `def unattributed_usd(gross_usd, retry_pct, tagged_pct):
    # Step 1: retries re-bill the whole request, gross x (1 + retry_pct/100).
    # Step 2: what carries no tag is (100 - tagged_pct)/100 of the bill.
    pass

# Test
print(unattributed_usd(5000000, 20, 50))  # 3000000.0
print(unattributed_usd(4828.8, 5, 90))    # 507.02
print(unattributed_usd(10000, 0, 100))    # 0.0
`,
            testCases: [
                { input: 'unattributed_usd(5000000, 20, 50)', expected: '3000000.0' },
                { input: 'unattributed_usd(4828.8, 5, 90)', expected: '507.02' },
                { input: 'unattributed_usd(10000, 0, 100)', expected: '0.0' },
            ],
            hints: [
                'Two factors in sequence: billed = gross_usd * (1 + retry_pct / 100), then unattributed = billed * (100 - tagged_pct) / 100, rounded to 2 decimals.',
                'Keep the multipliers separate in your head: the retry factor bills more dollars, the tag factor only decides who the dollars belong to. Halving the tag gap costs nothing in dollars and fixes the ledger.',
                'Say in the interview why this is a metering job and not an analytics job: product analytics dedupe retries - they never happened - so only the meter counts them, and only the tag names them.',
            ],
            optimalComplexity: { time: 'O(1)', space: 'O(1)' },
            tags: ['metering', 'attribution', 'billing', 'ai-track'],
        },
    ],
    visualizationType: 'chart',
};
// AI track topic 16: the fleet-efficiency layer (fleet scoring, eviction,
// convergence on the ideal bill). The interactive spine is the
// FleetEfficiencyWalkthrough component running lib/ai/fleetEfficiencySim.ts;
// every bill, idle line, score, and check signature quoted below was verified
// against the sim oracle before publishing.
const FLEET_EFFICIENCY = {
    id: 'fleet-efficiency',
    title: 'Fleet Efficiency & Eviction',
    category: 'concepts',
    icon: 'Fan',
    difficulty: 4,
    track: 'ai',
    description: 'When a serving pool grows past a handful of cards, someone has to judge the cards, and that job is a real interview subject: a senior inference-gateway role lists it as fleet-efficiency work, autoscaling and scoring a rented fleet, evicting underperformers, all aimed at peak tokens per dollar. The model in this topic is one month of one rented pool. Every card in the pool is the same class, but not the same card: each draws a quality lottery ticket at boot, a true serving rate for the rated number, and rides silent dips, rate blips that cost part of the window while they last. The autoscaler never sees the truth. It sees a measured score read through a measurement window, and the window is a lever: over one hour a card can look 25% better or worse than it is, over a day 5%, over a week 2%. The month\'s bill has three parts: the cards the run set keeps warm bill their rent in full, the cards the score evicts bill 15% of a node-month on the way out (a churned card holds reserved capacity while it drains), and the cards outside the run set never bill at all. Three checks judge the month, and the interview version of this topic is knowing which failure each check can see. The capacity check reads the delivered tokens against demand, because no eviction policy repairs a rate shortage; the convergence check reads the real bill against the ideal operator\'s bill, the perfect selection with no churn fees sized to the demand shape, because that is what an autoscaler is actually judged on; and the eviction check counts wrong evictions, the cards whose true rate sat at or above the fleet median when the score threw them out, because a wrong eviction is the one failure that refunds nothing. The three presets are the month\'s three verdicts, and all three pass at least one check, which is why each is dangerous as an incident report: the golden idler bills $69,940 keeping 26 flagship cards warm for a 60,000 tok/s average and burns $44,348 of it on capacity that moved no tokens, yet shows zero unmet demand and zero wrong evictions; the noise evictor scores through the hour window and evicts 12 of 32 cards on a 25% error, 4 of them healthy, 33% wrong; the bargain shortfall bills a tempting $28,840 and covers only 61,015 of 90,000 tok/s, a 32% shortage the bill never could buy back. The fixes carry verified numbers too: the idler on steady mode bills $25,740 for the same demand and converges at 90.9%; the evictor moving to the day window at a 10% eviction share converges at 97.9% with no wrong evictions, and the shortfall swap to flagships covers 90,000 tok/s for $35,360 at 95.6% convergence. The three challenges below work the arithmetic the autoscaler acts on: the tokens-per-dollar score of one card, the whole-card greedy that sizes a run set, and the eviction policy that decides who leaves.',
    keyPoints: [
        'Rate per dollar, not price per card, is the pool currency: one card scores true_tok_s x 2,628,000 s per month over rent, in millions of tokens per dollar, so the flagship rates 10.108 at $2,600 a month, the bargain card 8.447 at $1,400, and a flagship having a bad month at 2,400 tok/s rates 2.426, a 4x spread on the same invoice line',
        'The score is a window, not a truth: noise lets a card misread by up to 25% of its true rate through an hour, 5% through a day, and 2% through a week, and the eviction policy acts on the misread - which is why a short measurement window evicts healthy cards',
        'A wrong eviction is the only loss that refunds nothing: the card leaves for good and a churn fee of 15% of a node-month still bills (a $2,600 card costs $210 to say goodbye to), which is why the eviction check is not about cost, it is about the 20% wrong-eviction cap',
        'The run set is a policy, not physics: jumpy keeps every survivor warm against a burst that peaks near 1.8x average, steady covers average demand plus headroom, lazy trims to the average - the golden idler (26 cards on jumpy) burns $44,348 of idle bill while the same pool on steady burns $3,595 for identical unmet demand of zero',
        'The bill is the wrong first question: the bargain shortfall shows $28,840 and reads cheap for one second, then the delivered line shows 61,015 tok/s against 90,000 demanded. Capacity fails a 5% unmet cap on delivered tokens; the bill cannot say what the tokens never existed to prove',
        'Convergence is what the autoscaler is graded on: the ideal operator picks by true net efficiency, evicts nobody, and sizes to the demand shape, so it bills $29,400 where the noise evictor bills $30,520 (96.3% converged) and $39,000 where the golden idler bills $69,940 (55.8%)',
        'The three checks stack into one signature month after month: capacity (unmet under 5%), convergence (at least 80% of the ideal bill), evictions (at most 20% wrong) - a month that reads 101, 110, or 011 has exactly one incident, and the interview answer names which knob repairs it',
    ],
    keyTradeoffs: [
        {
            axis: 'Burst insurance vs the idle bill',
            tension: 'Keeping every survivor warm covers the peak that lands, and bills the peak that never does: the golden idler pays $44,348 idle for capacity that moved no tokens, while the same demand on a trimmed run set pays the whole bill for cards carrying the buffer. The design answer is sizing the burst on the count knob (12 jumpy cards bill $26,780 and converge) instead of parking the whole fleet on the policy knob.',
        },
        {
            axis: 'Fast scoring vs wrong evictions',
            tension: 'An hourly score reacts to a card degrading the same hour it degrades, and the same hour evicts a healthy card on a blip: 33% of the hour-window evictions in the noise evictor are cards at or above the fleet median. A week window is near-free of error and misses a degrading card for days. The eviction check (at most 20% wrong) is the contract that decides which window is acceptable.',
        },
        {
            axis: 'Cheap cards vs lottery variance',
            tension: 'The bargain class rates 4,500 tok/s at $1,400 a month and scores 8.447 tokens per dollar, near the flagship\'s 10.108, which is the argument used to buy it. The lottery is priced in: a bargain card that draws a bad ticket still carries 45% of its rated rate, and a pool built on cheap cards needs a deeper margin to stay covered when the tickets run cold - the shortfall preset is what the uncovered version looks like.',
        },
    ],
    pythonExample: `# One rented card: rate per dollar, not price per card, is the pool currency.
# 2,628,000 is one month, in seconds (730 hours x 3600).
def node_efficiency_score(true_tok_s, rent_usd):
    return round(true_tok_s * (730 * 3600) / rent_usd / 1e6, 3)

def evict_order(measured):
    return sorted(range(len(measured)), key=lambda i: (measured[i], i))

print(node_efficiency_score(10000, 2600))  # 10.108 - flagship at full rate
print(node_efficiency_score(4500, 1400))   # 8.447 - the bargain card
print(node_efficiency_score(2400, 2600))   # 2.426 - a flagship having a bad month
print(evict_order([5, 4, 3, 2, 1]))        # [4, 3, 2, 1, 0] - eviction starts here
`,
    challenges: [
        {
            id: 'node-efficiency-score',
            title: 'Tokens per Dollar One Node Bills',
            difficulty: 'easy',
            description: 'Before an autoscaler can score a fleet, it needs the unit the fleet is scored in: millions of tokens delivered per dollar of card rent. One card delivers its true rate for a whole month, and one month is 730 hours x 3600 s = 2,628,000 s, so the score is true_tok_s x 2,628,000 over rent_usd over 1,000,000, rounded to 3 decimals. The numbers interviewers check: a flagship card at 10,000 tok/s renting for $2,600 a month scores 10.108; a bargain card at 4,500 tok/s for $1,400 scores 8.447, which is the argument used to build a pool on used cards; and a flagship delivering only 2,400 tok/s at $2,600 scores 2.426, a 4x drop from two days of rate blips, which is the evidence an eviction policy exists to find. The score is why the autoscaler acts at all: every decision downstream keeps it. Implement node_efficiency_score(true_tok_s, rent_usd): return the card\'s million-tokens-per-dollar month, rounded to 3 decimal places.',
            starterCode: `def node_efficiency_score(true_tok_s, rent_usd):
    # One month is 730 x 3600 seconds. Rate times seconds is tokens; the
    # bill is the rent. Express in millions, rounded to 3 decimals.
    pass

# Test
print(node_efficiency_score(10000, 2600))  # 10.108
print(node_efficiency_score(4500, 1400))   # 8.447
print(node_efficiency_score(2400, 2600))   # 2.426
print(node_efficiency_score(700, 1400))    # 1.314
`,
            testCases: [
                { input: 'node_efficiency_score(10000, 2600)', expected: '10.108' },
                { input: 'node_efficiency_score(4500, 1400)', expected: '8.447' },
                { input: 'node_efficiency_score(2400, 2600)', expected: '2.426' },
                { input: 'node_efficiency_score(700, 1400)', expected: '1.314' },
            ],
            hints: [
                'The whole formula is true_tok_s * 2_628_000 / rent_usd / 1_000_000, rounded to 3 decimals. Forgetting the seconds per month makes the answer thousands of times too small.',
                'Sanity-check the units: tokens divided by dollars. A bigger rent should score LOWER at the same rate - if doubling rent doubles the score, look at which side is the divisor.',
                'The interview point: this is a rate the pool can print and compare across classes. 8.447 versus 10.108 is why a bargain pool gets built at all - and the lottery is why it needs this exact score to police it.',
            ],
            optimalComplexity: { time: 'O(1)', space: 'O(1)' },
            tags: ['fleet', 'efficiency', 'cost', 'ai-track'],
        },
        {
            id: 'count-nodes-to-run',
            title: 'Cards the Run Set Actually Sizes',
            difficulty: 'medium',
            description: 'A pool has whole cards, not fractional ones, so the run set must be sized by a greedy: sort the cards by their true rate, best first, keep adding whole cards until the running rate covers the target, and stop - the extra buffer the target carries is headroom (a percentage over average demand) or the peak sizing under jumpy demand. The cost of one card too many is an entire month of rent; the cost of one card too few is an unmet target. The numbers interviewers check: rates [10000, 700, 4500, 2400] covering a 12,000 tok/s demand at 10% headroom (target 13,200) needs 2 cards (10,000 + 4,500 = 14,500, and 10,000 alone is not enough); [500, 500, 500] at a 500 target needs exactly 1 (one card meets 500 precisely); and [4,500, 3,000, 2,400] cannot reach a 13,200 target at any size, which returns -1, the number an autoscaler must decide what to do with - the bargain shortfall preset is the month where the answer was ignored. Implement count_nodes_to_run(rated, demand, headroom_pct): rated is the list of card rates, return the whole-card count that covers demand x (1 + headroom_pct/100), or -1 if the pool cannot cover it.',
            starterCode: `def count_nodes_to_run(rated, demand, headroom_pct):
    # Target = demand x (1 + headroom_pct/100). Sort rates best first, add
    # whole cards until the running total covers the target. If the pool
    # runs out first, return -1.
    pass

# Test
print(count_nodes_to_run([10000, 700, 4500, 2400], 12000, 10))  # 2
print(count_nodes_to_run([500, 500, 500], 500, 0))              # 1
print(count_nodes_to_run([4500, 3000, 2400], 12000, 10))        # -1
print(count_nodes_to_run([7000, 7000, 7000], 21000, 0))         # 3
`,
            testCases: [
                { input: 'count_nodes_to_run([10000, 700, 4500, 2400], 12000, 10)', expected: '2' },
                { input: 'count_nodes_to_run([500, 500, 500], 500, 0)', expected: '1' },
                { input: 'count_nodes_to_run([4500, 3000, 2400], 12000, 10)', expected: '-1' },
                { input: 'count_nodes_to_run([7000, 7000, 7000], 21000, 0)', expected: '3' },
            ],
            hints: [
                'The order matters more than the list: sort a copy descending, greed is over rates, not input order. The 700-rate card sits in the list for a reason - greedy over input order picks 10,000 then 700 and never reaches 14,500 in two cards.',
                'The comparison is at-or-above, not strictly above: one card of 500 exactly meets a 500 target, and three cards of 7,000 exactly meet 21,000.',
                'The -1 case is the capacity check failing at sizing time: the sim reports it as unmet-demand percent, and interviewers expect the -1 (or equivalent) rather than returning a count that does not exist.',
            ],
            optimalComplexity: { time: 'O(n log n)', space: 'O(n)' },
            tags: ['autoscaling', 'greedy', 'fleet', 'ai-track'],
        },
        {
            id: 'score-evictions',
            title: 'Wrong Evictions Under the Cap',
            difficulty: 'hard',
            description: 'The eviction policy is where the measured score and the true rate can disagree at a cost. Given measured scores and true rates for a fleet, the policy evicts evict_pct of the fleet, the lowest measured scores first (ties broken by smaller index), which is int(len x evict_pct/100) cards. A card is a wrong eviction when its true rate sits at or above the fleet median true rate - the median defines what normal means, so a card at the middle of the fleet is not the problem card, however it measured. The count of wrong evictions is what the month is graded against: at most 20% of evictions may be wrong before the eviction check fails. The numbers interviewers check: scores [5,4,3,2,1] evicting 40% of true [5,4,3,2,1] evicts the two lowest true rates, 0 wrong; the same eviction share over scores [4,5,3,2,1] with true [1,2,3,4,5] evicts indexes 4 and 3, whose true rates 5 and 4 sit above the median 3, so 2 of 2 evictions are wrong (the measured order was exactly backwards from the truth); and evicting 50% of scores [1,1,10,10] with true [10,10,1,1] evicts both low-score cards, both wrong, a 100% wrong month. Implement score_evictions(evict_pct, measured, true_eff): return the number of wrong evictions.',
            starterCode: `def score_evictions(evict_pct, measured, true_eff):
    # evict_n = floor(len x evict_pct/100), lowest measured first, ties by
    # smaller index. A card is wrong when true_eff sits at or above the
    # fleet's median true rate.
    pass

# Test
print(score_evictions(40, [5, 4, 3, 2, 1], [5, 4, 3, 2, 1]))       # 0
print(score_evictions(40, [4, 5, 3, 2, 1], [1, 2, 3, 4, 5]))       # 2
print(score_evictions(50, [1, 1, 10, 10], [10, 10, 1, 1]))         # 2
print(score_evictions(40, [3.0, 9.0, 5.0, 7.0], [7.0, 1.0, 5.0, 3.0]))  # 1
`,
            testCases: [
                { input: 'score_evictions(40, [5, 4, 3, 2, 1], [5, 4, 3, 2, 1])', expected: '0' },
                { input: 'score_evictions(40, [4, 5, 3, 2, 1], [1, 2, 3, 4, 5])', expected: '2' },
                { input: 'score_evictions(50, [1, 1, 10, 10], [10, 10, 1, 1])', expected: '2' },
                { input: 'score_evictions(40, [3.0, 9.0, 5.0, 7.0], [7.0, 1.0, 5.0, 3.0])', expected: '1' },
            ],
            hints: [
                'Build three values before comparing: evict_n (floor of len x pct/100), the median of true_eff (average of the two middle values for an even count), and the eviction order (sorted indexes by (measured, index)).',
                'The tie rule decides cases like [1, 1, 10, 10]: the two first indexes carry the lowest scores, and ties go to the smaller index, not to the sort\'s mood. sorted(range(n), key=lambda i: (measured[i], i)) is the whole order.',
                'Say in the interview why the median is the wrong-bound: a score window that reads a card 25% off true looks harmless on a bell curve and expensive at the fleet middle - the median card measured slightly low IS a wrong eviction, and enough of them means the score is measuring the window, not the fleet.',
            ],
            optimalComplexity: { time: 'O(n log n)', space: 'O(n)' },
            tags: ['autoscaling', 'scoring', 'fleet', 'ai-track'],
        },
    ],
    visualizationType: 'chart',
};
export const aiServingTopics = [SERVING_INTERNALS, SERVING_TIERS, SERVING_CACHE_ROUTING, QUANT_STACK, FLEET_DECISION, METER_BILL, FLEET_EFFICIENCY];
export function getAiServingTopicById(id) {
    return aiServingTopics.find((topic) => topic.id === id);
}
