import { getAllTopics } from './topicRegistry.js';
export const curriculum = [
    // DATA STRUCTURES
    {
        id: 'arrays-strings',
        title: 'Arrays & Strings',
        category: 'data-structures',
        icon: 'Layers',
        difficulty: 1,
        description: 'The foundation of all interview problems. Master two-pointer techniques, sliding window patterns, and in-place manipulation to solve the majority of Google array questions.',
        bigO: { best: 'O(1)', average: 'O(n)', worst: 'O(n)', space: 'O(1)' },
        keyPoints: [
            'Two-pointer technique for sorted arrays and palindrome checks',
            'Sliding window for substring/subarray problems with a constraint',
            'Prefix sums for range query optimizations',
            'In-place reversal and rotation without extra space',
            "Kadane's algorithm for maximum subarray",
        ],
        pythonExample: `# --- Two Pointers: Container With Most Water ---
def max_water(height):
    left, right = 0, len(height) - 1
    best = 0
    while left < right:
        area = min(height[left], height[right]) * (right - left)
        best = max(best, area)
        if height[left] < height[right]:
            left += 1
        else:
            right -= 1
    return best

# --- Sliding Window: Longest substring without repeating chars ---
def length_of_longest_substring(s):
    char_index = {}
    left = 0
    best = 0
    for right, ch in enumerate(s):
        if ch in char_index and char_index[ch] >= left:
            left = char_index[ch] + 1
        char_index[ch] = right
        best = max(best, right - left + 1)
    return best

# --- Prefix Sum: Range sum queries ---
def range_sum_query(nums, queries):
    prefix = [0] * (len(nums) + 1)
    for i, n in enumerate(nums):
        prefix[i + 1] = prefix[i] + n
    return [prefix[r + 1] - prefix[l] for l, r in queries]

print(max_water([1, 8, 6, 2, 5, 4, 8, 3, 7]))   # 49
print(length_of_longest_substring("abcabcbb"))    # 3
print(range_sum_query([1, 2, 3, 4, 5], [(1, 3)]))  # [9]
`,
        challenges: [
            {
                id: 'two-sum',
                title: 'Two Sum',
                difficulty: 'easy',
                description: 'Given an array of integers `nums` and an integer `target`, return the indices of the two numbers that add up to `target`. Each input has exactly one solution. You may not use the same element twice.',
                starterCode: `def two_sum(nums, target):
    # Your solution here
    pass

# Test
print(two_sum([2, 7, 11, 15], 9))   # [0, 1]
print(two_sum([3, 2, 4], 6))        # [1, 2]
print(two_sum([3, 3], 6))           # [0, 1]
`,
                testCases: [
                    { input: 'two_sum([2, 7, 11, 15], 9)', expected: '[0, 1]' },
                    { input: 'two_sum([3, 2, 4], 6)', expected: '[1, 2]' },
                    { input: 'two_sum([3, 3], 6)', expected: '[0, 1]' },
                ],
                hints: [
                    'A brute-force O(n^2) solution checks every pair. Can you do better?',
                    "Store each number's index in a hash map as you iterate.",
                    'For each element x, check if (target - x) is already in the map.',
                ],
                optimalComplexity: { time: 'O(n)', space: 'O(n)' },
                tags: ['google-favorite', 'hash-map', 'common-pattern'],
            },
            {
                id: 'max-subarray',
                title: 'Maximum Subarray',
                difficulty: 'medium',
                description: 'Given an integer array `nums`, find the contiguous subarray (containing at least one element) which has the largest sum and return its sum.',
                starterCode: `def max_subarray(nums):
    # Implement Kadane's algorithm
    pass

print(max_subarray([-2, 1, -3, 4, -1, 2, 1, -5, 4]))  # 6
print(max_subarray([1]))                                  # 1
print(max_subarray([5, 4, -1, 7, 8]))                     # 23
`,
                testCases: [
                    { input: 'max_subarray([-2,1,-3,4,-1,2,1,-5,4])', expected: '6' },
                    { input: 'max_subarray([1])', expected: '1' },
                    { input: 'max_subarray([5,4,-1,7,8])', expected: '23' },
                ],
                hints: [
                    'Track the current running sum and the global maximum.',
                    'If adding the next element makes the sum smaller than starting fresh, reset.',
                    'current = max(nums[i], current + nums[i])',
                ],
                optimalComplexity: { time: 'O(n)', space: 'O(1)' },
                tags: ['kadanes', 'dynamic-programming', 'google-favorite'],
            },
            {
                id: 'min-window-substring',
                title: 'Minimum Window Substring',
                difficulty: 'hard',
                description: 'Given strings `s` and `t`, return the minimum window substring of `s` such that every character in `t` (including duplicates) is included. Return empty string if no such window exists.',
                starterCode: `from collections import Counter

def min_window(s, t):
    # Sliding window with character frequency tracking
    pass

print(min_window("ADOBECODEBANC", "ABC"))  # "BANC"
print(min_window("a", "a"))                # "a"
print(min_window("a", "aa"))               # ""
`,
                testCases: [
                    { input: 'min_window("ADOBECODEBANC", "ABC")', expected: '"BANC"' },
                    { input: 'min_window("a", "a")', expected: '"a"' },
                    { input: 'min_window("a", "aa")', expected: '""' },
                ],
                hints: [
                    'Use two pointers (left, right) to expand and contract the window.',
                    'Keep a frequency count of required characters vs. characters currently in window.',
                    'Track how many unique characters from t are satisfied in the current window.',
                    'Shrink from the left once all characters are satisfied to minimize window.',
                ],
                optimalComplexity: { time: 'O(|s| + |t|)', space: 'O(|s| + |t|)' },
                tags: ['sliding-window', 'hard-pattern', 'google-favorite'],
            },
        ],
        visualizationType: 'array',
    },
    {
        id: 'linked-lists',
        title: 'Linked Lists',
        category: 'data-structures',
        icon: 'Link',
        difficulty: 2,
        description: "Pointer manipulation mastery. Google loves linked list problems because they test careful thinking about references and edge cases. Learn reversal, cycle detection with Floyd's algorithm, and merge patterns.",
        bigO: { best: 'O(1)', average: 'O(n)', worst: 'O(n)', space: 'O(1)' },
        keyPoints: [
            'Dummy/sentinel head node eliminates edge case handling',
            "Floyd's two-pointer cycle detection (slow/fast pointers)",
            'Iterative reversal is O(1) space vs recursive O(n) stack space',
            'Merge two sorted lists with a dummy head pointer pattern',
            'Finding middle node: slow advances 1, fast advances 2',
        ],
        pythonExample: `class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

def make_list(values):
    dummy = ListNode(0)
    cur = dummy
    for v in values:
        cur.next = ListNode(v)
        cur = cur.next
    return dummy.next

def to_list(head):
    result = []
    while head:
        result.append(head.val)
        head = head.next
    return result

# --- Iterative reversal ---
def reverse_list(head):
    prev = None
    curr = head
    while curr:
        nxt = curr.next
        curr.next = prev
        prev = curr
        curr = nxt
    return prev

# --- Floyd's cycle detection ---
def has_cycle(head):
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow is fast:
            return True
    return False

# --- Merge two sorted lists ---
def merge_sorted(l1, l2):
    dummy = ListNode(0)
    cur = dummy
    while l1 and l2:
        if l1.val <= l2.val:
            cur.next, l1 = l1, l1.next
        else:
            cur.next, l2 = l2, l2.next
        cur = cur.next
    cur.next = l1 or l2
    return dummy.next

h = make_list([1, 2, 3, 4, 5])
print(to_list(reverse_list(h)))                             # [5,4,3,2,1]
print(to_list(merge_sorted(make_list([1,3,5]), make_list([2,4,6]))))  # [1,2,3,4,5,6]
`,
        challenges: [
            {
                id: 'reverse-linked-list',
                title: 'Reverse Linked List',
                difficulty: 'easy',
                description: 'Reverse a singly linked list iteratively. Given the head of a linked list, return the head of the reversed list.',
                starterCode: `class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

def reverse_list(head):
    # Iterative O(n) time, O(1) space
    pass

# Helper to build and print
def make_list(vals):
    dummy = ListNode(0)
    c = dummy
    for v in vals:
        c.next = ListNode(v); c = c.next
    return dummy.next

def to_list(h):
    res = []
    while h: res.append(h.val); h = h.next
    return res

print(to_list(reverse_list(make_list([1, 2, 3, 4, 5]))))  # [5,4,3,2,1]
print(to_list(reverse_list(make_list([1, 2]))))            # [2,1]
print(to_list(reverse_list(None)))                         # []
`,
                testCases: [
                    { input: 'reversed [1,2,3,4,5]', expected: '[5,4,3,2,1]' },
                    { input: 'reversed [1,2]', expected: '[2,1]' },
                ],
                hints: [
                    'You need three pointers: prev (starts None), curr, and next.',
                    'At each step: save curr.next, point curr.next to prev, advance both prev and curr.',
                    'After the loop, prev is the new head.',
                ],
                optimalComplexity: { time: 'O(n)', space: 'O(1)' },
                tags: ['pointer-manipulation', 'google-favorite'],
            },
            {
                id: 'detect-cycle',
                title: 'Linked List Cycle II',
                difficulty: 'medium',
                description: "Given a linked list, return the node where the cycle begins. If there is no cycle, return None. Floyd's algorithm can detect the cycle AND find the entry point.",
                starterCode: `class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

def detect_cycle(head):
    # Phase 1: detect cycle with slow/fast pointers
    # Phase 2: find entry point
    pass

# Build a list with cycle for testing
def make_cycle_list(vals, pos):
    nodes = [ListNode(v) for v in vals]
    for i in range(len(nodes) - 1):
        nodes[i].next = nodes[i + 1]
    if pos >= 0:
        nodes[-1].next = nodes[pos]
    return nodes[0] if nodes else None

head = make_cycle_list([3, 2, 0, -4], 1)
result = detect_cycle(head)
print(result.val if result else None)  # 2 (cycle at index 1)

head2 = make_cycle_list([1, 2], -1)
print(detect_cycle(head2))  # None
`,
                testCases: [
                    { input: 'cycle at index 1 in [3,2,0,-4]', expected: 'node with val 2' },
                    { input: 'no cycle in [1,2]', expected: 'None' },
                ],
                hints: [
                    'Phase 1: use slow (1 step) and fast (2 steps). If they meet, a cycle exists.',
                    'Phase 2: when they meet, reset one pointer to head.',
                    "Advance both one step at a time - they'll meet at the cycle entry.",
                    'Mathematical proof: distance from head to entry == distance from meeting point to entry.',
                ],
                optimalComplexity: { time: 'O(n)', space: 'O(1)' },
                tags: ['floyds-algorithm', 'two-pointers', 'google-favorite'],
            },
        ],
        visualizationType: 'linked-list',
    },
    {
        id: 'stacks-queues',
        title: 'Stacks & Queues',
        category: 'data-structures',
        icon: 'AlignJustify',
        difficulty: 2,
        description: 'Essential for parsing, BFS/DFS, and monotonic problems. The monotonic stack pattern solves a family of "next greater element" problems elegantly. Queues are the backbone of BFS.',
        bigO: { best: 'O(1)', average: 'O(1)', worst: 'O(n)', space: 'O(n)' },
        keyPoints: [
            'Monotonic stack maintains elements in sorted order by popping',
            'Use deque (collections.deque) for O(1) both ends in Python',
            'Stack for DFS, queue for BFS - the fundamental distinction',
            'Valid parentheses and nested structure problems are classic stack use cases',
            'Sliding window maximum uses a monotonic deque (O(n) total)',
        ],
        pythonExample: `from collections import deque

# --- Valid Parentheses ---
def is_valid(s):
    stack = []
    pairs = {')': '(', '}': '{', ']': '['}
    for ch in s:
        if ch in '({[':
            stack.append(ch)
        elif not stack or stack[-1] != pairs[ch]:
            return False
        else:
            stack.pop()
    return not stack

# --- Monotonic Stack: Next Greater Element ---
def next_greater(nums):
    result = [-1] * len(nums)
    stack = []  # stores indices
    for i, n in enumerate(nums):
        while stack and nums[stack[-1]] < n:
            result[stack.pop()] = n
        stack.append(i)
    return result

# --- Sliding Window Maximum (monotonic deque) ---
def max_sliding_window(nums, k):
    dq = deque()  # stores indices, front = max
    result = []
    for i, n in enumerate(nums):
        while dq and dq[0] < i - k + 1:
            dq.popleft()
        while dq and nums[dq[-1]] < n:
            dq.pop()
        dq.append(i)
        if i >= k - 1:
            result.append(nums[dq[0]])
    return result

print(is_valid("()[]{}"))             # True
print(is_valid("([)]"))               # False
print(next_greater([2, 1, 2, 4, 3]))  # [4, 2, 4, -1, -1]
print(max_sliding_window([1,3,-1,-3,5,3,6,7], 3))  # [3,3,5,5,6,7]
`,
        challenges: [
            {
                id: 'valid-parentheses',
                title: 'Valid Parentheses',
                difficulty: 'easy',
                description: 'Given a string containing just the characters `(`, `)`, `{`, `}`, `[`, `]`, determine if the input string is valid. Open brackets must be closed by the same type and in the correct order.',
                starterCode: `def is_valid(s):
    # Use a stack
    pass

print(is_valid("()"))        # True
print(is_valid("()[]{}"))    # True
print(is_valid("(]"))        # False
print(is_valid("([)]"))      # False
print(is_valid("{[]}"))      # True
`,
                testCases: [
                    { input: 'is_valid("()")', expected: 'True' },
                    { input: 'is_valid("()[]{}")', expected: 'True' },
                    { input: 'is_valid("(]")', expected: 'False' },
                    { input: 'is_valid("([)]")', expected: 'False' },
                ],
                hints: [
                    'Push opening brackets onto the stack.',
                    'For closing brackets, check if the top of the stack is the matching opener.',
                    'At the end, the stack should be empty for a valid string.',
                ],
                optimalComplexity: { time: 'O(n)', space: 'O(n)' },
                tags: ['stack', 'string', 'google-favorite'],
            },
            {
                id: 'daily-temperatures',
                title: 'Daily Temperatures',
                difficulty: 'medium',
                description: 'Given an array `temperatures`, return an array `answer` where `answer[i]` is the number of days you have to wait after the ith day to get a warmer temperature. If there is no future day with a warmer temperature, set `answer[i] = 0`.',
                starterCode: `def daily_temperatures(temperatures):
    # Monotonic decreasing stack stores indices
    pass

print(daily_temperatures([73,74,75,71,69,72,76,73]))  # [1,1,4,2,1,1,0,0]
print(daily_temperatures([30,40,50,60]))               # [1,1,1,0]
print(daily_temperatures([30,60,90]))                  # [1,1,0]
`,
                testCases: [
                    { input: 'daily_temperatures([73,74,75,71,69,72,76,73])', expected: '[1,1,4,2,1,1,0,0]' },
                    { input: 'daily_temperatures([30,40,50,60])', expected: '[1,1,1,0]' },
                ],
                hints: [
                    'Maintain a stack of indices where temperatures are decreasing.',
                    'When you find a warmer temp, pop indices from the stack and compute the wait.',
                    'answer[stack.pop()] = current_index - popped_index',
                ],
                optimalComplexity: { time: 'O(n)', space: 'O(n)' },
                tags: ['monotonic-stack', 'common-pattern'],
            },
        ],
        visualizationType: 'stack',
    },
    {
        id: 'hash-tables',
        title: 'Hash Tables',
        category: 'data-structures',
        icon: 'Hash',
        difficulty: 2,
        description: 'Hash tables trade space for time, turning O(n) searches into O(1). They appear in almost every interview problem. Master frequency counting, two-sum patterns, and grouping.',
        bigO: { best: 'O(1)', average: 'O(1)', worst: 'O(n)', space: 'O(n)' },
        keyPoints: [
            'collections.Counter and defaultdict are critical Python tools',
            'Anagram grouping: sort the word as the key',
            'Subarray sum equals k: prefix sum + hash map',
            'LRU cache: dict + doubly linked list (or use OrderedDict)',
            'Collision resolution: chaining vs. open addressing',
        ],
        pythonExample: `from collections import Counter, defaultdict

# --- Group Anagrams ---
def group_anagrams(strs):
    groups = defaultdict(list)
    for s in strs:
        key = tuple(sorted(s))
        groups[key].append(s)
    return list(groups.values())

# --- Subarray Sum Equals K ---
def subarray_sum(nums, k):
    count = 0
    prefix = 0
    seen = defaultdict(int)
    seen[0] = 1
    for n in nums:
        prefix += n
        count += seen[prefix - k]
        seen[prefix] += 1
    return count

# --- Top K Frequent Elements ---
def top_k_frequent(nums, k):
    count = Counter(nums)
    # Bucket sort by frequency for O(n)
    buckets = [[] for _ in range(len(nums) + 1)]
    for num, freq in count.items():
        buckets[freq].append(num)
    result = []
    for freq in range(len(buckets) - 1, 0, -1):
        result.extend(buckets[freq])
        if len(result) >= k:
            return result[:k]
    return result

print(group_anagrams(["eat","tea","tan","ate","nat","bat"]))
print(subarray_sum([1, 1, 1], 2))   # 2
print(top_k_frequent([1,1,1,2,2,3], 2))  # [1, 2]
`,
        challenges: [
            {
                id: 'group-anagrams',
                title: 'Group Anagrams',
                difficulty: 'medium',
                description: 'Given an array of strings, group the anagrams together. You can return the answer in any order. An anagram is a word formed by rearranging the letters of another word.',
                starterCode: `from collections import defaultdict

def group_anagrams(strs):
    # Key insight: anagrams have the same sorted characters
    pass

print(group_anagrams(["eat","tea","tan","ate","nat","bat"]))
print(group_anagrams([""]))   # [[""]]
print(group_anagrams(["a"]))  # [["a"]]
`,
                testCases: [
                    { input: 'group_anagrams(["eat","tea","tan","ate","nat","bat"])', expected: '3 groups' },
                    { input: 'group_anagrams([""])', expected: '[[""]]' },
                ],
                hints: [
                    'Two strings are anagrams if and only if their sorted characters are identical.',
                    'Use sorted(word) as a dictionary key (convert to tuple for hashability).',
                    'defaultdict(list) makes grouping clean.',
                ],
                optimalComplexity: { time: 'O(n * k log k)', space: 'O(n * k)' },
                tags: ['hash-map', 'string', 'google-favorite'],
            },
            {
                id: 'subarray-sum-k',
                title: 'Subarray Sum Equals K',
                difficulty: 'medium',
                description: 'Given an array of integers `nums` and an integer `k`, return the total number of continuous subarrays whose sum equals `k`.',
                starterCode: `from collections import defaultdict

def subarray_sum(nums, k):
    # Prefix sum + hash map approach
    pass

print(subarray_sum([1, 1, 1], 2))       # 2
print(subarray_sum([1, 2, 3], 3))       # 2
print(subarray_sum([-1, -1, 1], 0))     # 1
`,
                testCases: [
                    { input: 'subarray_sum([1,1,1], 2)', expected: '2' },
                    { input: 'subarray_sum([1,2,3], 3)', expected: '2' },
                ],
                hints: [
                    'Brute force is O(n^2). The trick is using prefix sums.',
                    'If prefix[j] - prefix[i] == k, then subarray (i,j] sums to k.',
                    'Store prefix sum counts in a map. For each position, check if (prefix - k) was seen.',
                    'Initialize map with {0: 1} to handle subarrays starting from index 0.',
                ],
                optimalComplexity: { time: 'O(n)', space: 'O(n)' },
                tags: ['prefix-sum', 'hash-map', 'google-favorite'],
            },
        ],
        visualizationType: 'hash-table',
    },
    {
        id: 'binary-trees',
        title: 'Binary Trees',
        category: 'data-structures',
        icon: 'GitFork',
        difficulty: 3,
        description: 'Trees underlie databases, file systems, and compilers. Google frequently tests tree traversals, LCA, serialization, and BST properties. Master both recursive and iterative approaches.',
        bigO: { best: 'O(log n)', average: 'O(log n)', worst: 'O(n)', space: 'O(h)' },
        keyPoints: [
            'Inorder traversal of BST yields sorted sequence',
            'DFS with recursion is elegant; iterative uses explicit stack',
            'LCA (Lowest Common Ancestor): recurse, look for two target nodes',
            'Tree height/depth: max(left, right) + 1',
            'Level-order (BFS) uses a queue, processes nodes layer by layer',
        ],
        pythonExample: `from collections import deque

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

# --- Build from list (LeetCode format) ---
def build(vals):
    if not vals:
        return None
    root = TreeNode(vals[0])
    q = deque([root])
    i = 1
    while q and i < len(vals):
        node = q.popleft()
        if i < len(vals) and vals[i] is not None:
            node.left = TreeNode(vals[i])
            q.append(node.left)
        i += 1
        if i < len(vals) and vals[i] is not None:
            node.right = TreeNode(vals[i])
            q.append(node.right)
        i += 1
    return root

# --- All four traversals ---
def inorder(root):
    return inorder(root.left) + [root.val] + inorder(root.right) if root else []

def level_order(root):
    if not root:
        return []
    result, q = [], deque([root])
    while q:
        level = []
        for _ in range(len(q)):
            node = q.popleft()
            level.append(node.val)
            if node.left: q.append(node.left)
            if node.right: q.append(node.right)
        result.append(level)
    return result

# --- Maximum depth ---
def max_depth(root):
    if not root:
        return 0
    return 1 + max(max_depth(root.left), max_depth(root.right))

# --- Lowest Common Ancestor (BST) ---
def lca_bst(root, p, q):
    while root:
        if p.val < root.val and q.val < root.val:
            root = root.left
        elif p.val > root.val and q.val > root.val:
            root = root.right
        else:
            return root

tree = build([3, 9, 20, None, None, 15, 7])
print(inorder(tree))        # [9, 3, 15, 20, 7]
print(level_order(tree))    # [[3], [9, 20], [15, 7]]
print(max_depth(tree))      # 3
`,
        challenges: [
            {
                id: 'max-depth-tree',
                title: 'Maximum Depth of Binary Tree',
                difficulty: 'easy',
                description: 'Given the root of a binary tree, return its maximum depth. The maximum depth is the number of nodes along the longest path from the root down to the farthest leaf.',
                starterCode: `class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def max_depth(root):
    # Recursive or iterative
    pass

# Build tree [3,9,20,None,None,15,7]
root = TreeNode(3)
root.left = TreeNode(9)
root.right = TreeNode(20)
root.right.left = TreeNode(15)
root.right.right = TreeNode(7)

print(max_depth(root))   # 3
print(max_depth(None))   # 0
`,
                testCases: [
                    { input: 'max_depth([3,9,20,null,null,15,7])', expected: '3' },
                    { input: 'max_depth([1,null,2])', expected: '2' },
                    { input: 'max_depth(None)', expected: '0' },
                ],
                hints: [
                    'Think recursively: the depth of a tree is 1 + max depth of its subtrees.',
                    'Base case: if root is None, return 0.',
                    'Alternatively, use BFS and count levels.',
                ],
                optimalComplexity: { time: 'O(n)', space: 'O(h)' },
                tags: ['recursion', 'dfs', 'google-favorite'],
            },
            {
                id: 'validate-bst',
                title: 'Validate Binary Search Tree',
                difficulty: 'medium',
                description: 'Given the root of a binary tree, determine if it is a valid binary search tree (BST). A BST requires that for every node, all left descendants are strictly less and all right descendants are strictly greater.',
                starterCode: `class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def is_valid_bst(root):
    # Pass min/max bounds through recursion
    pass

# Valid BST: [2,1,3]
r1 = TreeNode(2, TreeNode(1), TreeNode(3))
print(is_valid_bst(r1))   # True

# Invalid: [5,1,4,None,None,3,6]
r2 = TreeNode(5, TreeNode(1), TreeNode(4, TreeNode(3), TreeNode(6)))
print(is_valid_bst(r2))   # False
`,
                testCases: [
                    { input: 'is_valid_bst([2,1,3])', expected: 'True' },
                    { input: 'is_valid_bst([5,1,4,null,null,3,6])', expected: 'False' },
                ],
                hints: [
                    'A naive check (left.val < root.val) is insufficient - think about the full subtree.',
                    'Pass a valid range (min_val, max_val) down to each recursive call.',
                    'Left child must be < root.val AND within inherited upper bound.',
                    'Right child must be > root.val AND within inherited lower bound.',
                ],
                optimalComplexity: { time: 'O(n)', space: 'O(h)' },
                tags: ['bst', 'recursion', 'google-favorite'],
            },
        ],
        visualizationType: 'binary-tree',
    },
    {
        id: 'graphs',
        title: 'Graphs',
        category: 'data-structures',
        icon: 'Network',
        difficulty: 4,
        description: 'Graphs model networks, dependencies, and relationships. Google interviews heavily feature graph problems: BFS for shortest paths, DFS for connectivity, topological sort for dependencies, and union-find for components.',
        bigO: { best: 'O(1)', average: 'O(V + E)', worst: 'O(V + E)', space: 'O(V + E)' },
        keyPoints: [
            'Adjacency list is O(V+E) space; adjacency matrix is O(V^2)',
            'BFS finds shortest paths in unweighted graphs',
            'DFS identifies connected components and detects cycles',
            "Topological sort (Kahn's or DFS) for dependency ordering",
            'Union-Find (disjoint set) for dynamic connectivity queries',
        ],
        pythonExample: `from collections import deque, defaultdict

# --- Build adjacency list from edges ---
def build_graph(n, edges):
    graph = defaultdict(list)
    for u, v in edges:
        graph[u].append(v)
        graph[v].append(u)
    return graph

# --- BFS shortest path ---
def bfs_shortest(graph, start, end):
    visited = {start}
    queue = deque([(start, [start])])
    while queue:
        node, path = queue.popleft()
        if node == end:
            return path
        for neighbor in graph[node]:
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append((neighbor, path + [neighbor]))
    return []

# --- DFS: count connected components ---
def count_components(n, edges):
    graph = build_graph(n, edges)
    visited = set()
    count = 0
    def dfs(node):
        visited.add(node)
        for nb in graph[node]:
            if nb not in visited:
                dfs(nb)
    for i in range(n):
        if i not in visited:
            dfs(i)
            count += 1
    return count

# --- Topological sort (Kahn's BFS) ---
def topo_sort(n, prereqs):
    indegree = [0] * n
    graph = defaultdict(list)
    for course, pre in prereqs:
        graph[pre].append(course)
        indegree[course] += 1
    queue = deque(i for i in range(n) if indegree[i] == 0)
    order = []
    while queue:
        node = queue.popleft()
        order.append(node)
        for nb in graph[node]:
            indegree[nb] -= 1
            if indegree[nb] == 0:
                queue.append(nb)
    return order if len(order) == n else []

g = build_graph(5, [(0,1),(1,2),(2,3),(3,4)])
print(bfs_shortest(g, 0, 4))        # [0, 1, 2, 3, 4]
print(count_components(5, [(0,1),(1,2),(3,4)]))  # 2
print(topo_sort(4, [(1,0),(2,0),(3,1),(3,2)]))   # valid topological order
`,
        challenges: [
            {
                id: 'number-of-islands',
                title: 'Number of Islands',
                difficulty: 'medium',
                description: "Given a 2D grid of '1's (land) and '0's (water), count the number of islands. An island is surrounded by water and is formed by connecting adjacent lands horizontally or vertically.",
                starterCode: `def num_islands(grid):
    # DFS flood-fill approach
    pass

grid1 = [
    ["1","1","1","1","0"],
    ["1","1","0","1","0"],
    ["1","1","0","0","0"],
    ["0","0","0","0","0"]
]
print(num_islands(grid1))  # 1

grid2 = [
    ["1","1","0","0","0"],
    ["1","1","0","0","0"],
    ["0","0","1","0","0"],
    ["0","0","0","1","1"]
]
print(num_islands(grid2))  # 3
`,
                testCases: [
                    { input: 'grid with 1 connected island', expected: '1' },
                    { input: 'grid with 3 separate islands', expected: '3' },
                ],
                hints: [
                    "Iterate through every cell. When you find a '1', start a DFS/BFS.",
                    "Mark visited cells as '0' (or use a visited set) to avoid re-counting.",
                    "Each DFS/BFS call from an unvisited '1' counts as one island.",
                    'The 4 directions are up, down, left, right.',
                ],
                optimalComplexity: { time: 'O(m*n)', space: 'O(m*n)' },
                tags: ['dfs', 'bfs', 'grid', 'google-favorite'],
            },
            {
                id: 'course-schedule',
                title: 'Course Schedule',
                difficulty: 'medium',
                description: 'There are `n` courses labeled 0 to n-1. Given `prerequisites` pairs [a,b] meaning you must take b before a, return true if you can finish all courses (i.e., no cycle exists).',
                starterCode: `from collections import deque

def can_finish(num_courses, prerequisites):
    # Topological sort / cycle detection
    pass

print(can_finish(2, [[1, 0]]))           # True
print(can_finish(2, [[1, 0], [0, 1]]))  # False
print(can_finish(4, [[1,0],[2,0],[3,1],[3,2]]))  # True
`,
                testCases: [
                    { input: 'can_finish(2, [[1,0]])', expected: 'True' },
                    { input: 'can_finish(2, [[1,0],[0,1]])', expected: 'False' },
                ],
                hints: [
                    'This is a cycle detection problem in a directed graph.',
                    "Use Kahn's algorithm: compute in-degrees, BFS from zero-indegree nodes.",
                    'If the topological order includes all n nodes, no cycle exists.',
                    'Alternatively, DFS with coloring: white (unvisited), gray (in-progress), black (done).',
                ],
                optimalComplexity: { time: 'O(V + E)', space: 'O(V + E)' },
                tags: ['topological-sort', 'cycle-detection', 'google-favorite'],
            },
        ],
        visualizationType: 'graph',
    },
    {
        id: 'heaps',
        title: 'Heaps / Priority Queues',
        category: 'data-structures',
        icon: 'Triangle',
        difficulty: 3,
        description: "Heaps efficiently maintain the max or min element. Python's heapq is a min-heap. The top-K pattern and merge-K-sorted-lists are classic Google questions.",
        bigO: { best: 'O(1)', average: 'O(log n)', worst: 'O(log n)', space: 'O(n)' },
        keyPoints: [
            'Python heapq is min-heap; negate values for max-heap behavior',
            'Top-K elements: maintain heap of size K, O(n log k)',
            'heapq.heapify() builds heap from list in O(n)',
            'heapq.nlargest/nsmallest for one-off queries',
            'Merge K sorted lists: push (val, list_idx, element_idx) tuples',
        ],
        pythonExample: `import heapq
from collections import Counter

# --- Top K Frequent Elements using heap ---
def top_k_frequent(nums, k):
    count = Counter(nums)
    heap = []
    for num, freq in count.items():
        heapq.heappush(heap, (freq, num))
        if len(heap) > k:
            heapq.heappop(heap)
    return [num for freq, num in heap]

# --- Kth Largest Element ---
def find_kth_largest(nums, k):
    heap = nums[:k]
    heapq.heapify(heap)
    for n in nums[k:]:
        if n > heap[0]:
            heapq.heapreplace(heap, n)
    return heap[0]

# --- Merge K Sorted Lists ---
def merge_k_sorted(lists):
    heap = []
    result = []
    for i, lst in enumerate(lists):
        if lst:
            heapq.heappush(heap, (lst[0], i, 0))
    while heap:
        val, li, idx = heapq.heappop(heap)
        result.append(val)
        if idx + 1 < len(lists[li]):
            heapq.heappush(heap, (lists[li][idx + 1], li, idx + 1))
    return result

print(top_k_frequent([1,1,1,2,2,3], 2))       # [1, 2]
print(find_kth_largest([3,2,1,5,6,4], 2))      # 5
print(merge_k_sorted([[1,4,5],[1,3,4],[2,6]])) # [1,1,2,3,4,4,5,6]
`,
        challenges: [
            {
                id: 'kth-largest',
                title: 'Kth Largest Element in Array',
                difficulty: 'medium',
                description: 'Given an integer array `nums` and an integer `k`, return the kth largest element. Note that it is the kth largest in sorted order, not the kth distinct element.',
                starterCode: `import heapq

def find_kth_largest(nums, k):
    # Use a min-heap of size k
    pass

print(find_kth_largest([3, 2, 1, 5, 6, 4], 2))  # 5
print(find_kth_largest([3, 2, 3, 1, 2, 4, 5, 5, 6], 4))  # 4
`,
                testCases: [
                    { input: 'find_kth_largest([3,2,1,5,6,4], 2)', expected: '5' },
                    { input: 'find_kth_largest([3,2,3,1,2,4,5,5,6], 4)', expected: '4' },
                ],
                hints: [
                    'Sorting is O(n log n). Can you do O(n log k)?',
                    'Maintain a min-heap of exactly k elements.',
                    "If a new element is larger than the heap's minimum, replace it.",
                    'The heap minimum at the end is the kth largest.',
                ],
                optimalComplexity: { time: 'O(n log k)', space: 'O(k)' },
                tags: ['heap', 'top-k', 'google-favorite'],
            },
        ],
        visualizationType: 'heap',
    },
    {
        id: 'tries',
        title: 'Tries',
        category: 'data-structures',
        icon: 'FolderTree',
        difficulty: 4,
        description: 'Tries (prefix trees) are the go-to structure for autocomplete, spell checking, and IP routing. Google uses them extensively in search. Master insertion, search, and prefix matching.',
        bigO: { best: 'O(m)', average: 'O(m)', worst: 'O(m)', space: 'O(n * m)' },
        keyPoints: [
            'm is the length of the word being inserted/searched',
            'Each node stores children dict and is_end_of_word flag',
            'Prefix search is O(m) - just traverse without requiring is_end',
            'Can store additional data at terminal nodes (frequency, definition)',
            'Compressed trie (radix tree) reduces space for sparse tries',
        ],
        pythonExample: `class TrieNode:
    def __init__(self):
        self.children = {}
        self.is_end = False

class Trie:
    def __init__(self):
        self.root = TrieNode()

    def insert(self, word):
        node = self.root
        for ch in word:
            if ch not in node.children:
                node.children[ch] = TrieNode()
            node = node.children[ch]
        node.is_end = True

    def search(self, word):
        node = self._traverse(word)
        return node is not None and node.is_end

    def starts_with(self, prefix):
        return self._traverse(prefix) is not None

    def _traverse(self, s):
        node = self.root
        for ch in s:
            if ch not in node.children:
                return None
            node = node.children[ch]
        return node

    def autocomplete(self, prefix):
        node = self._traverse(prefix)
        if not node:
            return []
        results = []
        def dfs(n, path):
            if n.is_end:
                results.append(prefix + path)
            for ch, child in n.children.items():
                dfs(child, path + ch)
        dfs(node, "")
        return results

trie = Trie()
for word in ["apple", "app", "application", "apply", "banana"]:
    trie.insert(word)

print(trie.search("app"))           # True
print(trie.search("ap"))            # False
print(trie.starts_with("ap"))       # True
print(trie.autocomplete("app"))     # ['app', 'apple', 'application', 'apply']
`,
        challenges: [
            {
                id: 'implement-trie',
                title: 'Implement Trie (Prefix Tree)',
                difficulty: 'medium',
                description: 'Implement a Trie with `insert(word)`, `search(word)` (returns true if word exists), and `startsWith(prefix)` (returns true if any word has this prefix) methods.',
                starterCode: `class TrieNode:
    def __init__(self):
        self.children = {}
        self.is_end = False

class Trie:
    def __init__(self):
        self.root = TrieNode()

    def insert(self, word):
        pass

    def search(self, word):
        pass

    def starts_with(self, prefix):
        pass

trie = Trie()
trie.insert("apple")
print(trie.search("apple"))    # True
print(trie.search("app"))      # False
print(trie.starts_with("app")) # True
trie.insert("app")
print(trie.search("app"))      # True
`,
                testCases: [
                    { input: 'search after insert("apple")', expected: 'True' },
                    { input: 'search("app") before insert("app")', expected: 'False' },
                    { input: 'starts_with("app")', expected: 'True' },
                ],
                hints: [
                    'Each TrieNode needs a children dict mapping char -> TrieNode.',
                    'Mark the last node of each inserted word with is_end = True.',
                    'search requires is_end == True at the end; starts_with just needs the path to exist.',
                ],
                optimalComplexity: { time: 'O(m) per op', space: 'O(n * m)' },
                tags: ['trie', 'design', 'google-favorite'],
            },
        ],
        visualizationType: 'trie',
    },
    // ALGORITHMS
    {
        id: 'sorting',
        title: 'Sorting',
        category: 'algorithms',
        icon: 'ArrowUpDown',
        difficulty: 2,
        description: 'Sorting underpins many algorithmic techniques. Beyond knowing the standard algorithms, interviewers want you to recognize when counting sort beats comparison sort and when merge sort is preferable to quicksort.',
        bigO: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n^2)', space: 'O(log n)' },
        keyPoints: [
            'Quicksort: O(n log n) average, O(n^2) worst, O(log n) space - fast in practice',
            'Mergesort: O(n log n) guaranteed, O(n) space - stable sort',
            'Heapsort: O(n log n) guaranteed, O(1) space - not cache-friendly',
            'Counting/Radix sort: O(n+k) for bounded integers - beats comparison lower bound',
            'Python sorted() uses Timsort: O(n log n) worst, exploits natural runs',
        ],
        pythonExample: `# --- Quicksort (Lomuto partition) ---
def quicksort(arr, lo=0, hi=None):
    if hi is None:
        hi = len(arr) - 1
    if lo < hi:
        pivot_idx = partition(arr, lo, hi)
        quicksort(arr, lo, pivot_idx - 1)
        quicksort(arr, pivot_idx + 1, hi)
    return arr

def partition(arr, lo, hi):
    pivot = arr[hi]
    i = lo - 1
    for j in range(lo, hi):
        if arr[j] <= pivot:
            i += 1
            arr[i], arr[j] = arr[j], arr[i]
    arr[i + 1], arr[hi] = arr[hi], arr[i + 1]
    return i + 1

# --- Merge Sort ---
def mergesort(arr):
    if len(arr) <= 1:
        return arr
    mid = len(arr) // 2
    left = mergesort(arr[:mid])
    right = mergesort(arr[mid:])
    return merge(left, right)

def merge(left, right):
    result = []
    i = j = 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            result.append(left[i]); i += 1
        else:
            result.append(right[j]); j += 1
    return result + left[i:] + right[j:]

# --- Counting Sort (for bounded non-negative integers) ---
def counting_sort(arr, max_val):
    counts = [0] * (max_val + 1)
    for n in arr:
        counts[n] += 1
    result = []
    for val, cnt in enumerate(counts):
        result.extend([val] * cnt)
    return result

data = [3, 6, 8, 10, 1, 2, 1]
print(quicksort(data[:]))          # [1,1,2,3,6,8,10]
print(mergesort(data[:]))          # [1,1,2,3,6,8,10]
print(counting_sort(data[:], 10))  # [1,1,2,3,6,8,10]
`,
        challenges: [
            {
                id: 'sort-colors',
                title: 'Sort Colors (Dutch National Flag)',
                difficulty: 'medium',
                description: "Given an array with values 0, 1, and 2 (representing red, white, blue), sort them in-place in a single pass without using Python's built-in sort.",
                starterCode: `def sort_colors(nums):
    # Dutch National Flag algorithm
    # Three pointers: low, mid, high
    pass

nums1 = [2, 0, 2, 1, 1, 0]
sort_colors(nums1)
print(nums1)  # [0, 0, 1, 1, 2, 2]

nums2 = [2, 0, 1]
sort_colors(nums2)
print(nums2)  # [0, 1, 2]
`,
                testCases: [
                    { input: 'sort_colors([2,0,2,1,1,0])', expected: '[0,0,1,1,2,2]' },
                    { input: 'sort_colors([2,0,1])', expected: '[0,1,2]' },
                ],
                hints: [
                    'Maintain three pointers: low (boundary of 0s), mid (current), high (boundary of 2s).',
                    'If nums[mid] == 0: swap with nums[low], advance both.',
                    'If nums[mid] == 1: just advance mid.',
                    "If nums[mid] == 2: swap with nums[high], decrement high (don't advance mid).",
                ],
                optimalComplexity: { time: 'O(n)', space: 'O(1)' },
                tags: ['three-pointers', 'in-place', 'google-favorite'],
            },
        ],
        visualizationType: 'sorting',
    },
    {
        id: 'binary-search',
        title: 'Binary Search',
        category: 'algorithms',
        icon: 'SplitSquareHorizontal',
        difficulty: 2,
        description: 'Binary search is deceptively tricky: off-by-one errors are everywhere. Beyond sorted array search, master the generalized template for searching over a monotonic answer space.',
        bigO: { best: 'O(1)', average: 'O(log n)', worst: 'O(log n)', space: 'O(1)' },
        keyPoints: [
            'Template: lo=0, hi=len-1, while lo<=hi, mid=(lo+hi)//2',
            'Rotated array: determine which half is sorted, then check target',
            'Search space reduction: binary search works on any monotonic predicate',
            "Find first/last occurrence: don't return immediately, keep shrinking",
            '"Leftmost" vs "rightmost" insertion point changes the boundary update',
        ],
        pythonExample: `# --- Classic binary search ---
def binary_search(nums, target):
    lo, hi = 0, len(nums) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if nums[mid] == target:
            return mid
        elif nums[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1

# --- Search in Rotated Sorted Array ---
def search_rotated(nums, target):
    lo, hi = 0, len(nums) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if nums[mid] == target:
            return mid
        if nums[lo] <= nums[mid]:  # left half is sorted
            if nums[lo] <= target < nums[mid]:
                hi = mid - 1
            else:
                lo = mid + 1
        else:  # right half is sorted
            if nums[mid] < target <= nums[hi]:
                lo = mid + 1
            else:
                hi = mid - 1
    return -1

# --- Binary search on answer space: Minimum eating speed ---
def min_eating_speed(piles, h):
    def can_eat(speed):
        return sum((p + speed - 1) // speed for p in piles) <= h
    lo, hi = 1, max(piles)
    while lo < hi:
        mid = (lo + hi) // 2
        if can_eat(mid):
            hi = mid
        else:
            lo = mid + 1
    return lo

print(binary_search([1, 3, 5, 7, 9, 11], 7))            # 3
print(search_rotated([4, 5, 6, 7, 0, 1, 2], 0))         # 4
print(min_eating_speed([3, 6, 7, 11], 8))                # 4
`,
        challenges: [
            {
                id: 'search-rotated',
                title: 'Search in Rotated Sorted Array',
                difficulty: 'medium',
                description: 'An integer array of unique elements was sorted then rotated at an unknown pivot. Given the array and a target, return the index of the target or -1 if not present. Must be O(log n).',
                starterCode: `def search(nums, target):
    # Determine which half is sorted, then decide where to search
    pass

print(search([4, 5, 6, 7, 0, 1, 2], 0))  # 4
print(search([4, 5, 6, 7, 0, 1, 2], 3))  # -1
print(search([1], 0))                      # -1
`,
                testCases: [
                    { input: 'search([4,5,6,7,0,1,2], 0)', expected: '4' },
                    { input: 'search([4,5,6,7,0,1,2], 3)', expected: '-1' },
                    { input: 'search([1], 0)', expected: '-1' },
                ],
                hints: [
                    'At least one half of the array is always fully sorted after rotation.',
                    'Compare nums[lo] with nums[mid] to determine which half is sorted.',
                    'If the left half is sorted and target is in [nums[lo], nums[mid]), search left.',
                    'Otherwise search right. Symmetric logic for right half sorted case.',
                ],
                optimalComplexity: { time: 'O(log n)', space: 'O(1)' },
                tags: ['binary-search', 'google-favorite', 'common-pattern'],
            },
            {
                id: 'find-min-rotated',
                title: 'Find Minimum in Rotated Sorted Array',
                difficulty: 'medium',
                description: 'Given a rotated sorted array of unique elements, find the minimum element in O(log n) time.',
                starterCode: `def find_min(nums):
    # Binary search for the pivot/inflection point
    pass

print(find_min([3, 4, 5, 1, 2]))        # 1
print(find_min([4, 5, 6, 7, 0, 1, 2]))  # 0
print(find_min([11, 13, 15, 17]))        # 11
`,
                testCases: [
                    { input: 'find_min([3,4,5,1,2])', expected: '1' },
                    { input: 'find_min([4,5,6,7,0,1,2])', expected: '0' },
                    { input: 'find_min([11,13,15,17])', expected: '11' },
                ],
                hints: [
                    'The minimum is at the rotation point.',
                    'If nums[mid] > nums[hi], the minimum is in the right half.',
                    'If nums[mid] <= nums[hi], the minimum is in the left half (including mid).',
                    'Loop condition: lo < hi (not lo <= hi).',
                ],
                optimalComplexity: { time: 'O(log n)', space: 'O(1)' },
                tags: ['binary-search', 'common-pattern'],
            },
        ],
        visualizationType: 'binary-search',
    },
    {
        id: 'recursion-backtracking',
        title: 'Recursion & Backtracking',
        category: 'algorithms',
        icon: 'RefreshCw',
        difficulty: 3,
        description: 'Backtracking systematically explores all possibilities by building candidates incrementally and abandoning (pruning) paths that cannot lead to a solution. Essential for permutations, subsets, and constraint satisfaction.',
        bigO: { best: 'O(n!)', average: 'O(2^n)', worst: 'O(n!)', space: 'O(n)' },
        keyPoints: [
            'Backtracking template: choose, explore, unchoose',
            'Subsets: at each element, decide to include or exclude',
            'Permutations: swap elements with remaining positions',
            'Pruning early is critical for performance',
            'State must be fully restored after each recursive call',
        ],
        pythonExample: `# --- Subsets (power set) ---
def subsets(nums):
    result = []
    def backtrack(start, current):
        result.append(current[:])
        for i in range(start, len(nums)):
            current.append(nums[i])
            backtrack(i + 1, current)
            current.pop()
    backtrack(0, [])
    return result

# --- Permutations ---
def permutations(nums):
    result = []
    def backtrack(path, remaining):
        if not remaining:
            result.append(path[:])
            return
        for i, n in enumerate(remaining):
            path.append(n)
            backtrack(path, remaining[:i] + remaining[i+1:])
            path.pop()
    backtrack([], nums)
    return result

# --- N-Queens ---
def solve_n_queens(n):
    results = []
    cols = set()
    diag1 = set()  # row - col
    diag2 = set()  # row + col

    def backtrack(row, board):
        if row == n:
            results.append(["".join(r) for r in board])
            return
        for col in range(n):
            if col in cols or (row - col) in diag1 or (row + col) in diag2:
                continue
            cols.add(col); diag1.add(row - col); diag2.add(row + col)
            board[row][col] = 'Q'
            backtrack(row + 1, board)
            board[row][col] = '.'
            cols.discard(col); diag1.discard(row - col); diag2.discard(row + col)

    backtrack(0, [['.' for _ in range(n)] for _ in range(n)])
    return results

print(subsets([1, 2, 3]))
print(len(permutations([1, 2, 3])))  # 6
print(len(solve_n_queens(4)))        # 2
`,
        challenges: [
            {
                id: 'combination-sum',
                title: 'Combination Sum',
                difficulty: 'medium',
                description: 'Given an array of distinct integers `candidates` and a target integer `target`, return all unique combinations of candidates where the chosen numbers sum to target. The same number may be used multiple times.',
                starterCode: `def combination_sum(candidates, target):
    result = []
    def backtrack(start, path, remaining):
        if remaining == 0:
            result.append(path[:])
            return
        for i in range(start, len(candidates)):
            if candidates[i] > remaining:
                continue
            path.append(candidates[i])
            # pass i (not i+1) to allow reuse
            backtrack(i, path, remaining - candidates[i])
            path.pop()
    backtrack(0, [], target)
    return result

print(combination_sum([2, 3, 6, 7], 7))  # [[2,2,3],[7]]
print(combination_sum([2, 3, 5], 8))     # [[2,2,2,2],[2,3,3],[3,5]]
`,
                testCases: [
                    { input: 'combination_sum([2,3,6,7], 7)', expected: '[[2,2,3],[7]]' },
                    { input: 'combination_sum([2,3,5], 8)', expected: '[[2,2,2,2],[2,3,3],[3,5]]' },
                ],
                hints: [
                    'Use backtracking with a remaining sum.',
                    'Pass the current index (not index+1) to allow reuse of the same element.',
                    'Sort candidates first to enable early termination when candidates[i] > remaining.',
                ],
                optimalComplexity: { time: 'O(n^(t/m))', space: 'O(t/m)' },
                tags: ['backtracking', 'recursion', 'google-favorite'],
            },
        ],
        visualizationType: 'tree',
    },
    {
        id: 'dynamic-programming',
        title: 'Dynamic Programming',
        category: 'algorithms',
        icon: 'Grid',
        difficulty: 5,
        description: 'DP is the hardest category but appears in ~30% of Google hard problems. The key insight: optimal substructure + overlapping subproblems. Master the pattern recognition across 1D, 2D, and interval DP.',
        bigO: { best: 'O(n)', average: 'O(n^2)', worst: 'O(n^2)', space: 'O(n)' },
        keyPoints: [
            '1D DP: Fibonacci, climbing stairs, house robber, longest increasing subsequence',
            '2D DP: Unique paths, edit distance, longest common subsequence',
            'State definition is 80% of solving a DP problem',
            'Top-down (memoization) is easier to write; bottom-up avoids recursion overhead',
            'Space optimization: many 2D DPs can use O(n) space with rolling array',
        ],
        pythonExample: `import bisect

# --- Longest Increasing Subsequence (LIS) - O(n log n) ---
def lis_length(nums):
    tails = []
    for n in nums:
        pos = bisect.bisect_left(tails, n)
        if pos == len(tails):
            tails.append(n)
        else:
            tails[pos] = n
    return len(tails)

# --- Edit Distance (Levenshtein) ---
def edit_distance(word1, word2):
    m, n = len(word1), len(word2)
    dp = list(range(n + 1))
    for i in range(1, m + 1):
        prev = dp[:]
        dp[0] = i
        for j in range(1, n + 1):
            if word1[i-1] == word2[j-1]:
                dp[j] = prev[j-1]
            else:
                dp[j] = 1 + min(prev[j-1], prev[j], dp[j-1])
    return dp[n]

# --- Coin Change (unbounded knapsack pattern) ---
def coin_change(coins, amount):
    dp = [float('inf')] * (amount + 1)
    dp[0] = 0
    for coin in coins:
        for amt in range(coin, amount + 1):
            dp[amt] = min(dp[amt], dp[amt - coin] + 1)
    return dp[amount] if dp[amount] != float('inf') else -1

# --- Longest Common Subsequence ---
def lcs(text1, text2):
    m, n = len(text1), len(text2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if text1[i-1] == text2[j-1]:
                dp[i][j] = dp[i-1][j-1] + 1
            else:
                dp[i][j] = max(dp[i-1][j], dp[i][j-1])
    return dp[m][n]

print(lis_length([10, 9, 2, 5, 3, 7, 101, 18]))  # 4
print(edit_distance("horse", "ros"))               # 3
print(coin_change([1, 5, 11], 15))                 # 3
print(lcs("abcde", "ace"))                         # 3
`,
        challenges: [
            {
                id: 'coin-change',
                title: 'Coin Change',
                difficulty: 'medium',
                description: 'Given an integer array `coins` representing coin denominations and an integer `amount`, return the fewest number of coins needed to make up that amount. If not possible, return -1.',
                starterCode: `def coin_change(coins, amount):
    # Bottom-up DP
    pass

print(coin_change([1, 5, 11], 15))  # 3
print(coin_change([1, 5, 11], 11))  # 1
print(coin_change([2], 3))          # -1
print(coin_change([1], 0))          # 0
`,
                testCases: [
                    { input: 'coin_change([1,5,11], 15)', expected: '3' },
                    { input: 'coin_change([1,5,11], 11)', expected: '1' },
                    { input: 'coin_change([2], 3)', expected: '-1' },
                ],
                hints: [
                    'dp[i] = minimum coins to make amount i.',
                    'dp[0] = 0 (base case), dp[i] = infinity initially.',
                    'For each amount, try each coin: dp[amt] = min(dp[amt], dp[amt-coin] + 1).',
                    'The bottom-up approach processes amounts from 1 to target.',
                ],
                optimalComplexity: { time: 'O(n * amount)', space: 'O(amount)' },
                tags: ['dp', 'unbounded-knapsack', 'google-favorite'],
            },
            {
                id: 'longest-common-subsequence',
                title: 'Longest Common Subsequence',
                difficulty: 'medium',
                description: 'Given two strings `text1` and `text2`, return the length of their longest common subsequence. A subsequence is a sequence derived by deleting some characters without changing the relative order.',
                starterCode: `def lcs(text1, text2):
    # 2D DP table
    pass

print(lcs("abcde", "ace"))     # 3 ("ace")
print(lcs("abc", "abc"))       # 3 ("abc")
print(lcs("abc", "def"))       # 0
`,
                testCases: [
                    { input: 'lcs("abcde", "ace")', expected: '3' },
                    { input: 'lcs("abc", "abc")', expected: '3' },
                    { input: 'lcs("abc", "def")', expected: '0' },
                ],
                hints: [
                    'dp[i][j] = LCS of text1[:i] and text2[:j].',
                    'If text1[i-1] == text2[j-1]: dp[i][j] = dp[i-1][j-1] + 1',
                    'Otherwise: dp[i][j] = max(dp[i-1][j], dp[i][j-1])',
                    'Build the table iterating both strings.',
                ],
                optimalComplexity: { time: 'O(m*n)', space: 'O(m*n)' },
                tags: ['dp', '2d-dp', 'google-favorite'],
            },
        ],
        visualizationType: 'dp-table',
    },
    {
        id: 'bfs-dfs',
        title: 'BFS & DFS',
        category: 'algorithms',
        icon: 'Waves',
        difficulty: 3,
        description: 'The two fundamental graph traversal strategies. BFS explores level by level (shortest path in unweighted graphs). DFS dives deep first (connectivity, cycle detection, topological sort).',
        bigO: { best: 'O(V + E)', average: 'O(V + E)', worst: 'O(V + E)', space: 'O(V)' },
        keyPoints: [
            'BFS uses a queue (FIFO); DFS uses a stack (LIFO) or recursion',
            'BFS guarantees shortest path in unweighted graphs',
            'Multi-source BFS: start from all sources simultaneously',
            'Bidirectional BFS halves the search space for shortest path',
            'DFS tree/back/cross edges reveal graph structure',
        ],
        pythonExample: `from collections import deque

# --- BFS: Shortest path in grid ---
def shortest_path_grid(grid):
    rows, cols = len(grid), len(grid[0])
    if grid[0][0] == 1 or grid[rows-1][cols-1] == 1:
        return -1
    queue = deque([(0, 0, 1)])
    visited = {(0, 0)}
    dirs = [(-1,-1),(-1,0),(-1,1),(0,-1),(0,1),(1,-1),(1,0),(1,1)]
    while queue:
        r, c, dist = queue.popleft()
        if r == rows - 1 and c == cols - 1:
            return dist
        for dr, dc in dirs:
            nr, nc = r + dr, c + dc
            if 0 <= nr < rows and 0 <= nc < cols and (nr,nc) not in visited and grid[nr][nc] == 0:
                visited.add((nr, nc))
                queue.append((nr, nc, dist + 1))
    return -1

# --- Multi-source BFS: Rotting Oranges ---
def oranges_rotting(grid):
    rows, cols = len(grid), len(grid[0])
    queue = deque()
    fresh = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == 2:
                queue.append((r, c, 0))
            elif grid[r][c] == 1:
                fresh += 1
    if fresh == 0:
        return 0
    dirs = [(0,1),(0,-1),(1,0),(-1,0)]
    minutes = 0
    while queue:
        r, c, t = queue.popleft()
        for dr, dc in dirs:
            nr, nc = r + dr, c + dc
            if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 1:
                grid[nr][nc] = 2
                fresh -= 1
                minutes = t + 1
                queue.append((nr, nc, t + 1))
    return minutes if fresh == 0 else -1

print(shortest_path_grid([[0,0,0],[1,1,0],[1,1,0]]))  # 4
print(oranges_rotting([[2,1,1],[1,1,0],[0,1,1]]))      # 4
`,
        challenges: [
            {
                id: 'word-ladder',
                title: 'Word Ladder',
                difficulty: 'hard',
                description: 'Given two words `beginWord` and `endWord` and a word list, return the length of the shortest transformation sequence from beginWord to endWord where each step changes exactly one letter and all intermediate words are in the word list.',
                starterCode: `from collections import deque

def ladder_length(beginWord, endWord, wordList):
    word_set = set(wordList)
    if endWord not in word_set:
        return 0
    queue = deque([(beginWord, 1)])
    visited = {beginWord}
    while queue:
        word, length = queue.popleft()
        for i in range(len(word)):
            for c in 'abcdefghijklmnopqrstuvwxyz':
                new_word = word[:i] + c + word[i+1:]
                if new_word == endWord:
                    return length + 1
                if new_word in word_set and new_word not in visited:
                    visited.add(new_word)
                    queue.append((new_word, length + 1))
    return 0

print(ladder_length("hit", "cog", ["hot","dot","dog","lot","log","cog"]))  # 5
print(ladder_length("hit", "cog", ["hot","dot","dog","lot","log"]))         # 0
`,
                testCases: [
                    { input: 'ladder_length("hit","cog",["hot","dot","dog","lot","log","cog"])', expected: '5' },
                    { input: 'ladder_length("hit","cog",["hot","dot","dog","lot","log"])', expected: '0' },
                ],
                hints: [
                    'BFS from beginWord, each level = one transformation.',
                    'For each word position, try all 26 letters to generate neighbors.',
                    'Store neighbors in a set for O(1) lookup.',
                    'Mark words as visited when added to the queue, not when dequeued.',
                ],
                optimalComplexity: { time: 'O(m^2 * n)', space: 'O(m^2 * n)' },
                tags: ['bfs', 'hard-pattern', 'google-favorite'],
            },
        ],
        visualizationType: 'graph',
    },
    {
        id: 'greedy',
        title: 'Greedy Algorithms',
        category: 'algorithms',
        icon: 'Zap',
        difficulty: 3,
        description: 'Greedy algorithms make the locally optimal choice at each step. Proving a greedy works requires showing the greedy choice property and optimal substructure. Interval problems are the classic greedy domain.',
        bigO: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n log n)', space: 'O(1)' },
        keyPoints: [
            'Interval scheduling: sort by end time, always pick earliest-ending compatible interval',
            'Activity selection: greedy works because delayed choices cannot improve the solution',
            'Jump game: track the farthest position reachable',
            'Gas station: if total gas >= total cost, a solution exists (proof by invariant)',
            'Proof technique: exchange argument - show swapping to greedy choice never worsens result',
        ],
        pythonExample: `# --- Interval Scheduling (Maximum Non-Overlapping Intervals) ---
def erase_overlap_intervals(intervals):
    if not intervals:
        return 0
    intervals.sort(key=lambda x: x[1])  # sort by end time
    count = 0
    last_end = intervals[0][1]
    for start, end in intervals[1:]:
        if start < last_end:
            count += 1  # remove this overlapping interval
        else:
            last_end = end
    return count

# --- Jump Game II (minimum jumps) ---
def jump(nums):
    jumps = 0
    current_end = 0
    farthest = 0
    for i in range(len(nums) - 1):
        farthest = max(farthest, i + nums[i])
        if i == current_end:
            jumps += 1
            current_end = farthest
    return jumps

# --- Meeting Rooms II (minimum meeting rooms) ---
import heapq

def min_meeting_rooms(intervals):
    if not intervals:
        return 0
    intervals.sort()
    heap = []  # stores end times of ongoing meetings
    for start, end in intervals:
        if heap and heap[0] <= start:
            heapq.heapreplace(heap, end)
        else:
            heapq.heappush(heap, end)
    return len(heap)

print(erase_overlap_intervals([[1,2],[2,3],[3,4],[1,3]]))  # 1
print(jump([2, 3, 1, 1, 4]))                                # 2
print(min_meeting_rooms([[0,30],[5,10],[15,20]]))           # 2
`,
        challenges: [
            {
                id: 'jump-game',
                title: 'Jump Game',
                difficulty: 'medium',
                description: 'Given an integer array `nums` where `nums[i]` is the maximum jump length from position i, return true if you can reach the last index from index 0.',
                starterCode: `def can_jump(nums):
    # Track the farthest index reachable
    pass

print(can_jump([2, 3, 1, 1, 4]))  # True
print(can_jump([3, 2, 1, 0, 4]))  # False
print(can_jump([0]))              # True
`,
                testCases: [
                    { input: 'can_jump([2,3,1,1,4])', expected: 'True' },
                    { input: 'can_jump([3,2,1,0,4])', expected: 'False' },
                ],
                hints: [
                    'Iterate forward, tracking the farthest index reachable so far.',
                    'If your current index exceeds the farthest reachable, you are stuck.',
                    'max_reach = max(max_reach, i + nums[i])',
                    'If i <= max_reach at every step and max_reach >= last_index, return True.',
                ],
                optimalComplexity: { time: 'O(n)', space: 'O(1)' },
                tags: ['greedy', 'google-favorite'],
            },
        ],
        visualizationType: 'array',
    },
    // CONCEPTS
    {
        id: 'big-o-notation',
        title: 'Big-O Notation',
        category: 'concepts',
        icon: 'BarChart2',
        difficulty: 1,
        description: 'Big-O is the language of algorithm analysis. Every Google solution you present must come with a complexity analysis. This is non-negotiable. Understand how to derive it, not just memorize it.',
        bigO: { best: 'N/A', average: 'N/A', worst: 'N/A', space: 'N/A' },
        keyPoints: [
            'Drop constants and lower-order terms: O(2n + 5) = O(n)',
            'Nested loops multiply: two nested O(n) loops = O(n^2)',
            'Recursive calls: T(n) = aT(n/b) + f(n) - Master Theorem',
            'Space complexity counts both explicit storage AND call stack depth',
            'Amortized analysis: dynamic array append is O(1) amortized despite O(n) resizes',
        ],
        pythonExample: `import time

def time_fn(fn, *args):
    start = time.perf_counter()
    result = fn(*args)
    elapsed = (time.perf_counter() - start) * 1000
    return result, elapsed

# O(1) - constant
def get_first(lst):
    return lst[0] if lst else None

# O(log n) - binary search
def binary_search(arr, target):
    lo, hi = 0, len(arr) - 1
    steps = 0
    while lo <= hi:
        steps += 1
        mid = (lo + hi) // 2
        if arr[mid] == target:
            return steps
        elif arr[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return steps

# O(n) - linear scan
def linear_search(arr, target):
    for i, x in enumerate(arr):
        if x == target:
            return i
    return -1

# O(n^2) - bubble sort
def bubble_sort(arr):
    arr = arr[:]
    n = len(arr)
    for i in range(n):
        for j in range(n - i - 1):
            if arr[j] > arr[j+1]:
                arr[j], arr[j+1] = arr[j+1], arr[j]
    return arr

n = 1000000
arr = list(range(n))
bs_steps = binary_search(arr, n - 1)
print(f"Binary search steps for n={n}: {bs_steps}")
print(f"Linear search would need: {n} steps")
print(f"Ratio: {n // bs_steps}x faster")
`,
        challenges: [
            {
                id: 'analyze-complexity',
                title: 'Complexity Analysis Practice',
                difficulty: 'easy',
                description: 'Implement three functions with specific complexity targets, then verify by counting operations. Goal: understand why complexity classes matter in practice.',
                starterCode: `# Part 1: Implement a function that is O(n log n)
def find_duplicates_n_log_n(nums):
    # Sort first, then scan for adjacent duplicates
    pass

# Part 2: Improve it to O(n) using a hash set
def find_duplicates_linear(nums):
    pass

# Part 3: O(n) time and O(1) space
# if nums contains values in range [1, n]
def find_duplicates_constant_space(nums):
    # Use the array itself as a hash map by negating visited indices
    pass

test = [4, 3, 2, 7, 8, 2, 3, 1]
print(find_duplicates_n_log_n(test))
print(find_duplicates_linear(test))
print(find_duplicates_constant_space(test))
`,
                testCases: [
                    { input: 'find_duplicates_linear([4,3,2,7,8,2,3,1])', expected: '[2,3]' },
                    { input: 'find_duplicates_constant_space([4,3,2,7,8,2,3,1])', expected: '[2,3]' },
                ],
                hints: [
                    'O(n log n): sort the array, then scan for adjacent equal elements.',
                    'O(n): use a set to track seen numbers. If num already in set, it is a duplicate.',
                    "O(1) space trick: for each num, negate nums[abs(num)-1]. If it's already negative, it's a duplicate.",
                ],
                optimalComplexity: { time: 'O(n)', space: 'O(1)' },
                tags: ['complexity-analysis', 'google-favorite'],
            },
        ],
        visualizationType: 'chart',
    },
    {
        id: 'system-design-basics',
        title: 'System Design Basics',
        category: 'concepts',
        icon: 'Server',
        difficulty: 4,
        description: 'Google senior interviews always include system design. You need to design scalable distributed systems covering load balancing, caching, databases, and consistency tradeoffs. Know how Google-scale systems work.',
        bigO: { best: 'O(1)', average: 'O(1)', worst: 'O(n)', space: 'O(n)' },
        keyPoints: [
            'Start with requirements: QPS, data size, read/write ratio, latency SLAs',
            'CAP theorem: Consistency, Availability, Partition tolerance - pick 2',
            'Horizontal scaling + load balancing for stateless services',
            'Caching layers: CDN, application cache (Redis), database query cache',
            'Database sharding strategies: range-based, hash-based, directory-based',
        ],
        pythonExample: `# Simulating key system design concepts in Python

# --- LRU Cache (OrderedDict implementation) ---
from collections import OrderedDict

class LRUCache:
    def __init__(self, capacity):
        self.cap = capacity
        self.cache = OrderedDict()

    def get(self, key):
        if key not in self.cache:
            return -1
        self.cache.move_to_end(key)
        return self.cache[key]

    def put(self, key, value):
        if key in self.cache:
            self.cache.move_to_end(key)
        self.cache[key] = value
        if len(self.cache) > self.cap:
            self.cache.popitem(last=False)

# --- Consistent Hashing simulation ---
import hashlib
import bisect

class ConsistentHash:
    def __init__(self, nodes, replicas=100):
        self.replicas = replicas
        self.ring = {}
        self.sorted_keys = []
        for node in nodes:
            self.add_node(node)

    def add_node(self, node):
        for i in range(self.replicas):
            key = int(hashlib.md5(f"{node}:{i}".encode()).hexdigest(), 16)
            self.ring[key] = node
            bisect.insort(self.sorted_keys, key)

    def get_node(self, data_key):
        key = int(hashlib.md5(data_key.encode()).hexdigest(), 16)
        idx = bisect.bisect_right(self.sorted_keys, key) % len(self.sorted_keys)
        return self.ring[self.sorted_keys[idx]]

# --- Rate Limiter (Token Bucket) ---
import time

class TokenBucket:
    def __init__(self, capacity, refill_rate):
        self.capacity = capacity
        self.tokens = capacity
        self.refill_rate = refill_rate
        self.last_refill = time.time()

    def allow_request(self):
        now = time.time()
        elapsed = now - self.last_refill
        self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_rate)
        self.last_refill = now
        if self.tokens >= 1:
            self.tokens -= 1
            return True
        return False

lru = LRUCache(2)
lru.put(1, 1); lru.put(2, 2)
print(lru.get(1))    # 1
lru.put(3, 3)
print(lru.get(2))    # -1 (evicted)

ch = ConsistentHash(["server1", "server2", "server3"])
for key in ["user_123", "user_456", "user_789", "user_abc"]:
    print(f"{key} -> {ch.get_node(key)}")
`,
        challenges: [
            {
                id: 'lru-cache',
                title: 'LRU Cache',
                difficulty: 'hard',
                description: 'Design a data structure that follows the LRU (Least Recently Used) cache constraint. Implement `get(key)` and `put(key, value)` both in O(1) time. When capacity is exceeded, evict the least recently used key.',
                starterCode: `class LRUCache:
    def __init__(self, capacity):
        # Need O(1) get and put with LRU eviction
        # Hint: combine a hash map with a doubly linked list
        pass

    def get(self, key):
        pass

    def put(self, key, value):
        pass

cache = LRUCache(2)
cache.put(1, 1)
cache.put(2, 2)
print(cache.get(1))    # 1
cache.put(3, 3)        # evicts key 2
print(cache.get(2))    # -1 (not found)
cache.put(4, 4)        # evicts key 1
print(cache.get(1))    # -1 (not found)
print(cache.get(3))    # 3
print(cache.get(4))    # 4
`,
                testCases: [
                    { input: 'get(1) after put(1,1),put(2,2)', expected: '1' },
                    { input: 'get(2) after put(3,3) evicts 2', expected: '-1' },
                    { input: 'get(3) after put(4,4)', expected: '3' },
                ],
                hints: [
                    'Hash map gives O(1) key lookup. Doubly linked list gives O(1) insertions and deletions.',
                    'Combine them: map stores key -> node, linked list maintains usage order.',
                    'On access: remove node from its position, re-insert at the front (most recent).',
                    'On eviction: remove node from the back (least recent), delete from map.',
                    "Python's OrderedDict wraps this pattern cleanly.",
                ],
                optimalComplexity: { time: 'O(1)', space: 'O(capacity)' },
                tags: ['design', 'hash-map', 'linked-list', 'google-favorite'],
            },
        ],
        visualizationType: 'system-diagram',
    },
];
// Category metadata
export const categories = {
    'data-structures': {
        label: 'Data Structures',
        color: '#06b6d4',
        description: 'The building blocks of efficient computation',
    },
    algorithms: {
        label: 'Algorithms',
        color: '#8b5cf6',
        description: 'Systematic problem-solving strategies',
    },
    concepts: {
        label: 'Concepts',
        color: '#10b981',
        description: 'Foundational computer science knowledge',
    },
};
// Alias for backwards compatibility
export const topics = curriculum;
// Topic lookup helpers. Reads the shared registry so track topic files
// (aiTopics.ts) are reachable from LearnPage/PracticePage, not just the SWE
// curriculum array.
export function getTopicById(id) {
    return getAllTopics().find((t) => t.id === id);
}
export function getTopicsByCategory(category) {
    return curriculum.filter((t) => t.category === category);
}
export const difficultyLabels = {
    1: 'Beginner',
    2: 'Easy',
    3: 'Intermediate',
    4: 'Advanced',
    5: 'Expert',
};
export const challengeDifficultyColors = {
    easy: '#10b981',
    medium: '#f59e0b',
    hard: '#ef4444',
};
