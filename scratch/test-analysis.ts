import { analyzeCurriculumStructure } from '../lib/groq';

const syllabus5Units = `
COURSE SYLLABUS: CS301 - Data Structures and Algorithms

UNIT I: Linear Data Structures (10 Hours)
Arrays, Dynamic Arrays, Linked Lists (Singly, Doubly, Circular). Stack and Queue ADTs. Applications of Stacks: Infix to Postfix conversion, Parenthesis Matching.

UNIT II: Trees and Binary Trees (12 Hours)
Binary Tree representation and traversals (Inorder, Preorder, Postorder). Binary Search Trees (BST): insertion, deletion, searching. AVL Trees: Rotations and balance factor. B-Trees and B+ Trees.

UNIT III: Graph Algorithms (10 Hours)
Graph representation: Adjacency Matrix and Adjacency List. Graph Traversals: Breadth First Search (BFS), Depth First Search (DFS). Minimum Spanning Trees: Prim's and Kruskal's algorithms. Shortest Paths: Dijkstra's and Bellman-Ford algorithms.

UNIT IV: Sorting and Searching (8 Hours)
Searching: Linear Search, Binary Search, Hashing (Open Addressing, Chaining). Sorting: Bubble, Selection, Insertion, Merge Sort, Quick Sort, Heap Sort.

UNIT V: Dynamic Programming and Greedy Techniques (10 Hours)
Greedy Method: Fractional Knapsack, Huffman Coding. Dynamic Programming: 0/1 Knapsack, Longest Common Subsequence (LCS), Matrix Chain Multiplication.

TEXTBOOKS:
1. Mark Allen Weiss, 'Data Structures and Algorithm Analysis in C++', Pearson Education.
2. Cormen, Leiserson, Rivest, Stein, 'Introduction to Algorithms' (CLRS), MIT Press.
`;

const syllabus1Unit = `
Crash Course in Git & GitHub (1 Week Workshop)
Module 1: Version Control Basics
- Git init, add, commit, status
- Branching, merging, resolving merge conflicts
- Remote repos, push, pull, pull requests
`;

console.log('5 Units Result:', analyzeCurriculumStructure(syllabus5Units));
console.log('1 Unit Result:', analyzeCurriculumStructure(syllabus1Unit));
