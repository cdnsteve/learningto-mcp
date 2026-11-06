/**
 * Learning path graph nodes: the single source of truth for skill-tree
 * prerequisites. Imported by app/src/components/LearningPath.tsx (client UI)
 * and by app/mcp-server/data.ts (MCP server) - pure data, no React imports.
 */
// P1.11 hygiene: every node now has a real curriculum topicId. Nodes without
// any backing topic content (variables, balanced-bst, dijkstra, advanced-dp,
// graph-advanced) are removed rather than linked to invented topics; the
// remaining three undefined-topicId nodes map to the topics that teach the
// matching challenges (two-sum, min-window-substring, course-schedule).
// NOTE: keep in sync with the rendered skill tree in
// app/src/components/LearningPath.tsx (which imports this array verbatim).
export const learningPathNodes = [
    // Row 0 - Foundations
    { id: 'big-o', label: 'Big-O Notation', category: 'foundation', description: 'Understand how to measure algorithm efficiency', prerequisites: [], topicId: 'big-o-notation', row: 0, col: 0 },
    // Row 1 - Core Data Structures
    { id: 'arrays', label: 'Arrays & Strings', category: 'data-structure', description: 'Sequential storage, indexing, iteration', prerequisites: ['big-o'], topicId: 'arrays-strings', row: 1, col: 0 },
    { id: 'hash-maps', label: 'Hash Tables', category: 'data-structure', description: 'Key-value storage, O(1) lookups', prerequisites: ['big-o'], topicId: 'hash-tables', row: 1, col: 1 },
    // Row 2 - Linear Structures
    { id: 'linked-lists', label: 'Linked Lists', category: 'data-structure', description: 'Node-pointer chains, dynamic size', prerequisites: ['arrays'], topicId: 'linked-lists', row: 2, col: 0 },
    { id: 'stacks', label: 'Stacks', category: 'data-structure', description: 'LIFO: last in, first out', prerequisites: ['arrays'], topicId: 'stacks-queues', row: 2, col: 1 },
    { id: 'queues', label: 'Queues', category: 'data-structure', description: 'FIFO: first in, first out', prerequisites: ['arrays'], topicId: 'stacks-queues', row: 2, col: 2 },
    { id: 'two-pointers', label: 'Two Pointers', category: 'algorithm', description: 'Scan from both ends, shrink window', prerequisites: ['arrays'], topicId: 'arrays-strings', row: 2, col: 3 },
    { id: 'sliding-window', label: 'Sliding Window', category: 'algorithm', description: 'Track a moving subarray/substring', prerequisites: ['arrays', 'hash-maps'], topicId: 'arrays-strings', row: 2, col: 4 },
    // Row 3 - Sorting & Searching
    { id: 'sorting', label: 'Sorting Algorithms', category: 'algorithm', description: 'Bubble, merge, quick, counting sort', prerequisites: ['arrays'], topicId: 'sorting', row: 3, col: 0 },
    { id: 'binary-search', label: 'Binary Search', category: 'algorithm', description: 'Cut search space in half each step', prerequisites: ['arrays', 'sorting'], topicId: 'binary-search', row: 3, col: 1 },
    { id: 'recursion', label: 'Recursion', category: 'algorithm', description: 'Functions calling themselves, base cases', prerequisites: ['stacks'], topicId: 'recursion-backtracking', row: 3, col: 2 },
    // Row 4 - Trees
    { id: 'binary-trees', label: 'Binary Trees', category: 'data-structure', description: 'Hierarchical node structure, traversals', prerequisites: ['linked-lists', 'recursion'], topicId: 'binary-trees', row: 4, col: 0 },
    { id: 'bst', label: 'Binary Search Trees', category: 'data-structure', description: 'Ordered tree: left < parent < right', prerequisites: ['binary-trees', 'binary-search'], topicId: 'binary-trees', row: 4, col: 1 },
    { id: 'heaps', label: 'Heaps / Priority Queues', category: 'data-structure', description: 'Complete tree with heap property', prerequisites: ['binary-trees', 'arrays'], topicId: 'heaps', row: 4, col: 2 },
    { id: 'backtracking', label: 'Backtracking', category: 'algorithm', description: 'Explore all paths, prune dead ends', prerequisites: ['recursion'], topicId: 'recursion-backtracking', row: 4, col: 3 },
    // Row 5 - Graphs & DP
    { id: 'graphs', label: 'Graphs', category: 'data-structure', description: 'Nodes + edges, adjacency list representation', prerequisites: ['hash-maps', 'linked-lists'], topicId: 'graphs', row: 5, col: 0 },
    { id: 'bfs', label: 'BFS', category: 'algorithm', description: 'Level-by-level traversal, shortest path', prerequisites: ['graphs', 'queues'], topicId: 'bfs-dfs', row: 5, col: 1 },
    { id: 'dfs', label: 'DFS', category: 'algorithm', description: 'Deep-first traversal, cycle detection', prerequisites: ['graphs', 'stacks', 'recursion'], topicId: 'bfs-dfs', row: 5, col: 2 },
    { id: 'dp', label: 'Dynamic Programming', category: 'algorithm', description: 'Memoize overlapping subproblems', prerequisites: ['recursion', 'hash-maps'], topicId: 'dynamic-programming', row: 5, col: 3 },
    { id: 'tries', label: 'Tries', category: 'data-structure', description: 'Prefix tree for string lookups', prerequisites: ['binary-trees', 'hash-maps'], topicId: 'tries', row: 5, col: 4 },
    // Row 6 - Advanced
    { id: 'topological-sort', label: 'Topological Sort', category: 'advanced', description: 'Order tasks with dependencies', prerequisites: ['dfs', 'graphs'], topicId: 'graphs', row: 6, col: 2 },
    { id: 'greedy', label: 'Greedy Algorithms', category: 'advanced', description: 'Locally optimal choices', prerequisites: ['sorting', 'dp'], topicId: 'greedy', row: 6, col: 3 },
    // Row 7 - Google Interview Mastery
    { id: 'system-design', label: 'System Design', category: 'mastery', description: 'Distributed systems, scaling, trade-offs', prerequisites: ['hash-maps', 'graphs', 'heaps'], topicId: 'system-design-basics', row: 7, col: 0 },
];
