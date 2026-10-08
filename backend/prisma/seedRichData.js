import 'dotenv/config';
import { prisma, pool } from '../src/config/db.js';
import { FREE_MODELS } from '../src/config/freeModels.js';
import { calculateElo } from '../src/services/elo.service.js';

// ── Curated High-Quality Battles Dataset ─────────────────────────────────────
const BATTLE_TEMPLATES = [
  // ── General Domain ──
  {
    category: 'General',
    prompt: 'Explain quantum computing to a high schooler using clear real-world analogies.',
    winner: 'A',
    responseA: `Imagine standard computers as a giant room filled with millions of light switches (bits). Each switch can only be either **ON (1)** or **OFF (0)**. Everything you watch on YouTube or code in Python is built from these simple switches.

### Enter Quantum Computing: The Spinning Coin
A quantum computer uses **qubits**. Instead of a switch that is strictly ON or OFF, imagine a coin spinning on a table:
- While spinning, it's not simply heads or tails — it has a probability of landing on both at once. In physics, this is called **Superposition**.
- When multiple spinning coins interact, their states become linked through **Entanglement**. If you know the state of one coin, you instantly know the other, even if they are miles apart.

### Why Does This Matter?
- **Parallel Maze Exploration:** A classical computer navigates a maze by trying path A, hitting a dead end, backtracking, and trying path B. A quantum computer explores every path *simultaneously*.
- **Real-World Impact:** Designing life-saving pharmaceuticals in days rather than decades, breaking or revolutionizing internet encryption, and modeling complex climate systems.`,
    responseB: `Quantum computers use qubits instead of regular bits. Regular bits are 0 or 1. Qubits can be both 0 and 1 at the same time because of superposition. Another concept is entanglement, where particles are connected.

Because of this, quantum computers can solve hard problems much faster than normal computers. They are useful for cryptography, chemical simulation, and optimization. However, they require extreme cooling near absolute zero to stay stable.`
  },
  {
    category: 'General',
    prompt: 'What are the 3 biggest architectural differences between Apache Kafka and RabbitMQ, and when should you choose which?',
    winner: 'B',
    responseA: `Kafka and RabbitMQ are both message brokers.
1. Kafka is a distributed streaming log, while RabbitMQ is a message queue.
2. Kafka retains messages on disk for a long time, while RabbitMQ deletes messages after delivery.
3. Kafka is faster for big data, while RabbitMQ is better for complex routing.

Choose Kafka for analytics and RabbitMQ for microservice tasks.`,
    responseB: `Both Apache Kafka and RabbitMQ handle asynchronous messaging, but their architectural paradigms are fundamentally distinct:

### 1. Message Storage: Append-Only Commit Log vs. Ephemeral Queue
- **Kafka:** Operates as a distributed, partitioned **append-only commit log**. Messages persist on disk for a configured retention window (e.g., 7 days) regardless of consumption. Multiple consumers can read at their own offsets and replay historical events.
- **RabbitMQ:** Operates as a traditional **smart broker, dumb consumer** queue. Once an acknowledgment is received from a consumer, the message is permanently removed from the queue.

### 2. Routing Capability
- **RabbitMQ:** Excels in sophisticated routing via **Exchanges** (Direct, Fanout, Topic, and Headers). Can seamlessly route messages dynamically using complex routing keys.
- **Kafka:** Offers static topic and partition routing. Routing logic is delegated to producers or stream processors (Kafka Streams / Flink).

### 3. Consumption Model & Throughput
- **Kafka (Pull-based):** Consumers pull batches of messages according to their processing capacity. Easily handles millions of events/sec with ordered partition guarantees.
- **RabbitMQ (Push-based):** Broker pushes messages to active workers, optimizing for ultra-low latency (<1ms) and granular per-message acknowledgment.

### When to Choose:
- **Choose Kafka for:** Event sourcing, real-time analytics pipelines, audit trails, and high-throughput telemetry streams.
- **Choose RabbitMQ for:** Background job dispatching, microservice RPC, complex pub-sub routing topologies, and guaranteed per-message processing.`
  },
  {
    category: 'General',
    prompt: 'Explain the concept of opportunity cost with everyday life scenarios.',
    winner: 'A',
    responseA: `**Opportunity cost** is the value of the next best alternative you must give up whenever you make a decision. It is not the financial price you pay — it is the potential benefit you surrender.

### Everyday Scenarios:

1. **The Friday Night Dilemma:**
   - *Choice:* You spend $40 going to the movies with friends.
   - *Direct Cost:* $40 and 3 hours.
   - *Opportunity Cost:* The 3 hours could have been spent studying for Monday's exam or sleeping before an early Saturday run.

2. **The College Degree Decision:**
   - *Choice:* Enrolling in a 4-year degree costing $80,000.
   - *Accounting Cost:* $80,000 tuition and housing.
   - *Opportunity Cost:* The $160,000 in salary you could have earned working full-time over those 4 years, plus 4 years of workplace seniority.

3. **Cooking at Home vs. Takeout:**
   - *Choice:* Cooking a $10 meal that takes 90 minutes.
   - *Opportunity Cost:* If your freelance rate is $50/hour, that "cheap" dinner cost you $75 of productive time. A $20 takeout order might actually be the rational economic choice.

**Core Takeaway:** Every time you say "yes" to one thing, you are implicitly saying "no" to everything else you could have done with that time, money, and energy.`,
    responseB: `Opportunity cost means the loss of potential gain from other alternatives when one alternative is chosen.

For example, if you spend 2 hours playing video games instead of studying, your opportunity cost is the knowledge or better grades you could have achieved. Another example is investing $1000 in stocks instead of keeping it in savings.`
  },
  {
    category: 'General',
    prompt: 'Compare monolithic vs microservices architecture: pros, cons, and migration triggers.',
    winner: 'TIE',
    responseA: `### Monolith vs. Microservices Comparison

#### Monolithic Architecture
- **Pros:** Simple deployment (single artifact), easy local debugging, ACID transactions across tables, low initial development overhead.
- **Cons:** Coupling increases over time, single point of failure, scaling requires duplicating the entire application, longer build/test CI pipelines.

#### Microservices Architecture
- **Pros:** Autonomous team ownership, independent scaling of bottlenecks, polyglot technology choices, fault isolation.
- **Cons:** Network latency, distributed transactions (Saga pattern), complex observability (tracing, logging), operational overhead (Kubernetes, service meshes).

#### When to Migrate:
1. Team size exceeds 20-30 developers encountering frequent deployment merge conflicts.
2. A single subsystem (e.g. video processing) requires 100x more GPU/RAM resources than the rest of the app.
3. Distinct compliance requirements (e.g. PCI-DSS payment service isolation).`,
    responseB: `### Architectural Overview: Monolith vs Microservices

1. **Monoliths** bundle UI, business logic, and database access into a single codebase. They are excellent for startups and early MVPs because shipping speed is maximum and operational complexity is minimal.
2. **Microservices** decompose the application into domain-oriented, independently deployable HTTP/gRPC services.

| Feature | Monolith | Microservices |
|---|---|---|
| **Deployability** | All-or-nothing | Independent per service |
| **Data Consistency** | Relational ACID | Eventual consistency / Saga |
| **Debugging** | Stack trace in IDE | Distributed tracing (OpenTelemetry) |
| **Infrastructure** | Single VPS or Container | Docker + K8s cluster |

**Migration Triggers:** Migrate when team organization demands independent deployment velocity, or when specific services require vastly different scaling profiles.`
  },

  // ── Coding Domain ──
  {
    category: 'Coding',
    prompt: 'Write an efficient LRU Cache class in Python with O(1) get and put operations.',
    winner: 'A',
    responseA: `Here is an optimal implementation of an **LRU (Least Recently Used) Cache** in Python using a doubly linked list combined with a hash map to achieve true **O(1)** time complexity for both \`get\` and \`put\`:

\`\`\`python
class Node:
    def __init__(self, key: int = 0, val: int = 0):
        self.key = key
        self.val = val
        self.prev = None
        self.next = None

class LRUCache:
    def __init__(self, capacity: int):
        self.capacity = capacity
        self.cache = {}  # key -> Node
        # Dummy sentinel nodes to avoid edge-case null checks
        self.head = Node()
        self.tail = Node()
        self.head.next = self.tail
        self.tail.prev = self.head

    def _remove(self, node: Node) -> None:
        """Splice node out of the doubly linked list."""
        node.prev.next = node.next
        node.next.prev = node.prev

    def _add_to_front(self, node: Node) -> None:
        """Insert node right after head sentinel (most recently used)."""
        node.next = self.head.next
        node.prev = self.head
        self.head.next.prev = node
        self.head.next = node

    def get(self, key: int) -> int:
        if key not in self.cache:
            return -1
        node = self.cache[key]
        self._remove(node)
        self._add_to_front(node)
        return self.val

    def put(self, key: int, value: int) -> None:
        if key in self.cache:
            node = self.cache[key]
            node.val = value
            self._remove(node)
            self._add_to_front(node)
        else:
            if len(self.cache) >= self.capacity:
                # Evict least recently used (node right before tail)
                lru = self.tail.prev
                self._remove(lru)
                del self.cache[lru.key]

            new_node = Node(key, value)
            self.cache[key] = new_node
            self._add_to_front(new_node)
\`\`\`

### Complexity:
- **Time:** \`get\` is $O(1)$ and \`put\` is $O(1)$.
- **Space:** $O(\\text{capacity})$ for hash map pointers and nodes.`,
    responseB: `You can use Python's \`collections.OrderedDict\` for a clean LRU cache:

\`\`\`python
from collections import OrderedDict

class LRUCache:
    def __init__(self, capacity: int):
        self.capacity = capacity
        self.cache = OrderedDict()

    def get(self, key: int) -> int:
        if key not in self.cache:
            return -1
        self.cache.move_to_end(key)
        return self.cache[key]

    def put(self, key: int, value: int) -> None:
        if key in self.cache:
            self.cache.move_to_end(key)
        self.cache[key] = value
        if len(self.cache) > self.capacity:
            self.cache.popitem(last=False)
\`\`\`
Both \`get\` and \`put\` run in O(1) average time.`
  },
  {
    category: 'Coding',
    prompt: 'Implement a debounce function in TypeScript with cancel and flush support.',
    winner: 'A',
    responseA: `Here is a production-ready, type-safe implementation of \`debounce\` in TypeScript with \`cancel\` and \`flush\` controls:

\`\`\`typescript
export interface DebouncedFunction<T extends (...args: any[]) => any> {
  (...args: Parameters<T>): void;
  cancel: () => void;
  flush: () => void;
}

export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  waitMs: number
): DebouncedFunction<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;

  const debounced = function (...args: Parameters<T>) {
    lastArgs = args;
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      timeoutId = null;
      if (lastArgs) {
        fn(...lastArgs);
        lastArgs = null;
      }
    }, waitMs);
  };

  debounced.cancel = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    lastArgs = null;
  };

  debounced.flush = () => {
    if (timeoutId !== null && lastArgs !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
      fn(...lastArgs);
      lastArgs = null;
    }
  };

  return debounced;
}
\`\`\`

### Usage:
\`\`\`typescript
const logSearch = debounce((query: string) => {
  console.log('Searching for:', query);
}, 300);

logSearch('react');
logSearch('react hooks'); // Only this executes after 300ms
logSearch.flush();        // Executes immediately
logSearch.cancel();       // Aborts pending invocation
\`\`\``,
    responseB: `Here is a simple debounce in TypeScript:

\`\`\`typescript
function debounce(fn: Function, delay: number) {
  let timer: any;
  return (...args: any[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
\`\`\`
It resets the timer every time the returned function is triggered.`
  },
  {
    category: 'Coding',
    prompt: 'Write an optimized SQL query to find customers with the highest lifetime value who have not ordered in 90 days.',
    winner: 'B',
    responseA: `SELECT customer_id, SUM(order_total) as ltv
FROM orders
WHERE order_date < NOW() - INTERVAL '90 days'
GROUP BY customer_id
ORDER BY ltv DESC
LIMIT 10;`,
    responseB: `The query requires aggregating total historical lifetime value while filtering for customers whose **most recent order** was more than 90 days ago:

\`\`\`sql
WITH customer_order_summary AS (
  SELECT
    customer_id,
    SUM(order_total) AS lifetime_value,
    COUNT(id) AS total_orders,
    MAX(order_date) AS last_order_date
  FROM orders
  WHERE status = 'completed'
  GROUP BY customer_id
)
SELECT
  c.id AS customer_id,
  c.name,
  c.email,
  s.lifetime_value,
  s.total_orders,
  s.last_order_date,
  CURRENT_DATE - s.last_order_date::date AS days_since_last_order
FROM customer_order_summary s
JOIN customers c ON c.id = s.customer_id
WHERE s.last_order_date < CURRENT_DATE - INTERVAL '90 days'
ORDER BY s.lifetime_value DESC
LIMIT 25;
\`\`\`

### Optimization Highlights:
- Filters out non-completed/cancelled orders inside the CTE to minimize index scans.
- Performs \`GROUP BY customer_id\` directly on the indexed \`orders(customer_id, status)\` table before joining the \`customers\` metadata table.
- Index Recommendation: \`CREATE INDEX idx_orders_cust_date ON orders(customer_id, status, order_date, order_total);\``
  },

  // ── Math Domain ──
  {
    category: 'Math',
    prompt: 'Solve the integral of x^2 * e^x dx step-by-step showing integration by parts.',
    winner: 'A',
    responseA: `We wish to evaluate the indefinite integral:
$$\\int x^2 e^x \\, dx$$

We apply **Integration by Parts**, whose formula is:
$$\\int u \\, dv = u v - \\int v \\, du$$

### Step 1: First Integration by Parts
Choose according to the LIATE rule:
- $u = x^2 \\implies du = 2x \\, dx$
- $dv = e^x \\, dx \\implies v = e^x$

Applying the formula:
$$\\int x^2 e^x \\, dx = x^2 e^x - \\int 2x e^x \\, dx = x^2 e^x - 2 \\int x e^x \\, dx$$

### Step 2: Second Integration by Parts on $\\int x e^x \\, dx$
For $\\int x e^x \\, dx$, choose:
- $u_1 = x \\implies du_1 = dx$
- $dv_1 = e^x \\, dx \\implies v_1 = e^x$

Applying the formula:
$$\\int x e^x \\, dx = x e^x - \\int e^x \\, dx = x e^x - e^x$$

### Step 3: Combine and Factor
Substitute back into Step 1:
$$\\int x^2 e^x \\, dx = x^2 e^x - 2(x e^x - e^x) + C$$
$$= x^2 e^x - 2x e^x + 2e^x + C$$
$$= e^x(x^2 - 2x + 2) + C$$

**Final Answer:**
$$\\mathbf{e^x(x^2 - 2x + 2) + C}$$`,
    responseB: `The integral of x^2 * e^x dx:
Using integration by parts twice:
Let u = x^2, dv = e^x dx.
v = e^x, du = 2x dx.

Integral = x^2 * e^x - integral(2x * e^x dx).
Next let u = 2x, dv = e^x dx.
v = e^x, du = 2 dx.
integral(2x * e^x dx) = 2x * e^x - 2e^x.

So final answer is:
x^2 * e^x - 2x * e^x + 2e^x + C.`
  },
  {
    category: 'Math',
    prompt: 'Explain the Birthday Paradox: why is there a 50% chance of a shared birthday with only 23 people?',
    winner: 'A',
    responseA: `The **Birthday Paradox** feels counterintuitive because our brains instinctively think about the probability of someone sharing *our specific birthday* (which requires 183 people for a 50% chance). 

However, the problem asks whether **any two people** in the group share a birthday.

### 1. Count the Pairs, Not the People
In a room of $N = 23$ people, the number of distinct pairwise comparisons is given by combinations:
$$\\binom{23}{2} = \\frac{23 \\times 22}{2} = 253 \\text{ unique pairs!}$$
With 253 chances for a match, a coincidence becomes highly probable.

### 2. The Complement Rule (Probability of No Shared Birthdays)
Assuming 365 equally likely birthdays:
- Person 1 has 365 possible days ($365/365$).
- Person 2 must not match Person 1 ($364/365$).
- Person 3 must not match either ($363/365$).
- ...
- Person 23 has $(365 - 22)/365 = 343/365$.

The probability $P(\\text{all unique})$ is:
$$P(\\text{no match}) = \\frac{365}{365} \\times \\frac{364}{365} \\times \\dots \\times \\frac{343}{365} \\approx 0.4927$$

### 3. Final Probability
$$P(\\text{at least one shared birthday}) = 1 - P(\\text{no match}) = 1 - 0.4927 = \\mathbf{50.73\\%}$$

With just 23 people, the odds of a shared birthday already exceed 50%. By 57 people, the probability surpasses **99%**!`,
    responseB: `The birthday paradox says in a room of 23 people, there is about a 50% chance that two share a birthday. 
This is because there are 23 * 22 / 2 = 253 pairs of people. 
The probability of all birthdays being distinct is (365/365) * (364/365) * ... * (343/365) = 49.3%.
Therefore, 1 - 49.3% = 50.7% chance of a match.`
  },
  {
    category: 'Math',
    prompt: 'Prove that the square root of 2 is irrational using proof by contradiction.',
    winner: 'A',
    responseA: `### Theorem: $\\sqrt{2}$ is irrational.

**Proof by Contradiction:**

1. **Assumption:** Assume $\\sqrt{2}$ is rational. By definition, it can be written as a simplified fraction:
   $$\\sqrt{2} = \\frac{a}{b}$$
   where $a, b \\in \\mathbb{Z}$, $b \\neq 0$, and $\\gcd(a, b) = 1$ (the fraction is in irreducible lowest terms).

2. **Algebraic Manipulation:**
   Squaring both sides:
   $$2 = \\frac{a^2}{b^2} \\implies a^2 = 2b^2$$

3. **Deduction on $a$:**
   Since $a^2 = 2b^2$, $a^2$ is an even integer. 
   If the square of an integer is even, the integer itself must be even. Therefore, $a$ is even, and can be written as:
   $$a = 2k \\quad \\text{for some integer } k$$

4. **Deduction on $b$:**
   Substitute $a = 2k$ back into $a^2 = 2b^2$:
   $$(2k)^2 = 2b^2 \\implies 4k^2 = 2b^2 \\implies b^2 = 2k^2$$
   By the identical logic, $b^2$ is even, which implies $b$ must also be even.

5. **Contradiction:**
   If both $a$ and $b$ are even, they both share a common factor of $2$. 
   This directly contradicts our premise that $\\gcd(a, b) = 1$ (that $a/b$ was in lowest terms).

**Conclusion:** 
Our initial assumption that $\\sqrt{2}$ is rational must be false. Therefore, $\\mathbf{\\sqrt{2}}$ **is irrational.** $\\blacksquare$`,
    responseB: `Assume sqrt(2) = a/b where a and b are integers with no common factors.
Square both sides: 2 = a^2 / b^2 => 2b^2 = a^2.
So a^2 is even, meaning a is even. Let a = 2k.
Then 2b^2 = (2k)^2 = 4k^2 => b^2 = 2k^2.
So b^2 is even, meaning b is even.
Since both a and b are even, they have a common factor of 2. This contradicts that a and b have no common factors.
Hence sqrt(2) is irrational.`
  },

  // ── Reasoning Domain ──
  {
    category: 'Reasoning',
    prompt: 'A bat and a ball cost $1.10 in total. The bat costs $1.00 more than the ball. How much does the ball cost? Explain step by step.',
    winner: 'A',
    responseA: `The intuitive, instinctive answer that most people blurts out is **$0.10** (10 cents), but this is incorrect!

### Step-by-Step Algebraic Proof:
Let:
- $B$ = cost of the bat
- $b$ = cost of the ball

From the problem, we have two constraints:
1. $B + b = 1.10$ (total cost)
2. $B = b + 1.00$ (bat costs $1.00 more than the ball)

### Substitute Equation 2 into Equation 1:
$$(b + 1.00) + b = 1.10$$
$$2b + 1.00 = 1.10$$
$$2b = 1.10 - 1.00$$
$$2b = 0.10$$
$$b = 0.05$$

### Verify the Result:
- **Ball:** **$0.05** (5 cents)
- **Bat:** $0.05 + $1.00 = **$1.05**
- **Total:** $1.05 + $0.05 = **$1.10** ✓
- **Difference:** $1.05 - $0.05 = **$1.00** ✓

If the ball were $0.10, the bat would be $1.10, making the total $1.20. Therefore, the ball costs **5 cents ($0.05)**.`,
    responseB: `The ball costs 5 cents ($0.05).
If the ball was 10 cents, the bat would be $1.10, and together they would be $1.20.
Let x be the ball. x + (x + 1) = 1.10. 2x = 0.10, so x = 0.05.`
  },
  {
    category: 'Reasoning',
    prompt: 'Three boxes are labeled Apples, Oranges, and Mixed. Every label is guaranteed to be incorrect. You may draw exactly one fruit from one box without looking inside. Which box must you choose to determine all contents correctly?',
    winner: 'A',
    responseA: `You must draw a fruit from the box labeled **"Mixed"**.

### Step-by-Step Logical Deduction:

1. **Given Constraint:**
   - Every box is incorrectly labeled.
   - Therefore:
     - The box labeled "Apples" contains either *Oranges* or *Mixed*.
     - The box labeled "Oranges" contains either *Apples* or *Mixed*.
     - The box labeled **"Mixed"** must contain **pure Apples or pure Oranges** (it CANNOT be mixed).

2. **Draw from the "Mixed" Box:**
   Suppose you reach in and pull out an **Apple**:
   - Because the box cannot actually be Mixed, this box must be **All Apples**.

3. **Deduce the Remaining Two Boxes:**
   - Now consider the box labeled **"Oranges"**:
     - It cannot contain Oranges (labels are wrong).
     - It cannot contain Apples (we already found them in the first box).
     - Therefore, the box labeled "Oranges" must contain **Mixed**.
   - Finally, the box labeled **"Apples"**:
     - The only remaining contents are **All Oranges**.

*(If you pulled an Orange from the Mixed box instead, the exact same symmetric logic applies: Mixed box = All Oranges, Apples box = Mixed, Oranges box = All Apples).*

**Conclusion:** Drawing a single fruit from the **"Mixed"** box uniquely identifies all three boxes.`,
    responseB: `Choose the box labeled "Mixed".
Since all labels are wrong, the mixed box must either be pure apples or pure oranges.
If you pull an apple, the mixed box is all apples. Then the box labeled oranges must be mixed, and the box labeled apples must be oranges. This solves all three.`
  },
  {
    category: 'Reasoning',
    prompt: 'Explain the Monty Hall problem and mathematically why switching doors increases the winning probability from 1/3 to 2/3.',
    winner: 'B',
    responseA: `In Monty Hall, you pick 1 of 3 doors. The host opens a door with a goat. You should always switch because switching gives you a 2/3 chance. When you picked your first door, you had a 1/3 chance of being right and 2/3 chance of being wrong. Since the host removes a wrong door, the remaining door holds the 2/3 probability.`,
    responseB: `### The Monty Hall Paradox

In the classic game show scenario:
1. There are 3 doors: Behind one is a luxury car; behind the other two are goats.
2. You pick Door 1.
3. Host Monty Hall (who **knows where the car is**) opens one of the remaining doors (say Door 3), revealing a goat.
4. Monty asks: *"Do you want to switch to Door 2, or stick with Door 1?"*

---

### The Intuitive Trap
People assume: *"There are two doors left, so the odds are 50/50."* This is false because Monty's action is **not random** — he is compelled to reveal a goat.

### The Formal Probability Proof

#### Case Analysis (Assume Car is Behind Door 1):
- **Scenario A (You initially pick Door 1 - probability 1/3):**
  Monty opens Door 2 or 3 (goat).
  - *If you Stay:* **You WIN.**
  - *If you Switch:* **You LOSE.**

- **Scenario B (You initially pick Door 2 - probability 1/3):**
  Monty is *forced* to open Door 3 (the only goat left).
  - *If you Stay:* You LOSE.
  - *If you Switch:* **You WIN.**

- **Scenario C (You initially pick Door 3 - probability 1/3):**
  Monty is *forced* to open Door 2.
  - *If you Stay:* You LOSE.
  - *If you Switch:* **You WIN.**

### Summary Table:
| Strategy | Win Probability |
|---|---|
| **Always Stay** | $1/3 \\approx 33.3\\%$ |
| **Always Switch** | $2/3 \\approx 66.7\\%$ |

**Conclusion:** Switching literally **doubles your probability of winning** from $33.3\\%$ to $66.7\\%$.`
  },

  // ── Creative Domain ──
  {
    category: 'Creative',
    prompt: 'Write an atmospheric opening scene for a cyberpunk detective noir novel set in Neo-Tokyo, 2099.',
    winner: 'A',
    responseA: `The rain over Sector 9 didn’t wash anything clean; it just emulsified the synthetic grease into iridescent streaks across cracked ferroconcrete. 

I leaned against the rusted railing of the Shinjuku Skywalk, listening to the hum of the megacorporate aerodynes cutting through smog as thick as curdled coolant. Below, the neon kanji of holographic noodle shacks flickered in dying cyan and magenta, casting long, fractured shadows across pedestrians whose synthetic irises glowed like spent matches.

My cybernetic optic—a refurbished Zeiss model two firmware updates behind obsolescence—kept pinging an alert in the upper-right corner of my vision:

\`[ERR: BUFFER_OVERFLOW // OCULAR_SENSOR_HEAT: 104°F]\`

I ignored it, tapped my last real tobacco cigarette against the brass casing of my sub-dermal battery pack, and watched the digital umbrella of the woman stepping out of the MagLev lift. She wasn’t wearing standard street-grade biometric dampeners. Her coat was tailored carbon-fiber silk, untouched by acid precipitation. 

When she lifted her gaze, her optic augmentations weren’t blinking blue like a salaryman’s. They burned chrome.

*"Detective Vance?"* she asked, her voice clean and uncompressed, cutting through the low drone of twenty million surveillance drones. *"My employer believes he was murdered forty minutes ago. He’d like you to find out who did it."*`,
    responseB: `It was raining neon in Neo-Tokyo in 2099. Detective Vance stood in a dark alleyway watching the flying cars overhead. He pulled up the collar of his trench coat as acidic rain dripped onto his synthetic arm.

A mysterious woman approached him from the shadows. Her eyes were glowing chrome, showing she had high-end corporate augments.
"Are you Vance?" she whispered. "I need your help with a murder."
Vance sighed and flicked away his cigarette. Another dangerous job had begun.`
  },
  {
    category: 'Creative',
    prompt: 'Compose a poetic monologue delivered by an ancient sentient star observing the birth of Earth.',
    winner: 'B',
    responseA: `I am an old star who has watched the galaxy for billions of years. Now I look down and see a small blue rock forming near a yellow sun. Dust gathers into stone, magma cools into oceans, and life begins to stir. I know one day my light will fade and I will collapse, but this little world will remember what it means to be warm.`,
    responseB: `Four billion years I have burned alone against the marrow-cold void, 
nursing the furnace of my core, forging iron in the silence of dying nebulae.
I have witnessed galaxies collide like slow-motion dancers, 
and seen the ghost-light of ten thousand sister suns gutter into cinder.

Yet today, across the gravitational eddies of this young spiral arm, 
my ancient eyes behold something fragile. 

Behold: the molten child of a modest yellow dwarf.
She gathers dust into bone and iron into blood,
spinning furiously in the dark, swaddled in steam and primordial magma.
Her continents shift like restless sleepers; 
her newborn oceans mirror the cold glow of my constellations.

*Grow, little sapphire,* I whisper through the solar wind.
*Drink from the furnace of your quiet star.*
You do not know the fierce fragility of water, 
nor the strange, miraculous burden of creatures who will one day look up into the night 
and name the very light I spent an eternity burning to give them.`
  },
  {
    category: 'Creative',
    prompt: 'Write a whimsical dialogue between an antique grandfather clock and a digital smartwatch about the nature of time.',
    winner: 'A',
    responseA: `The grandfather clock cleared its mahogany throat with a resounding *tick-tock* that vibrated through the floorboards.

**Grandfather Clock:** "Young sprocket, must you vibrate so erratically? You buzz like a caffeinated hornet every three minutes."

**Smartwatch:** "I’m not vibrating erratically, Barnaby. I just synced with atomic cesium clocks in Boulder, Colorado! Accuracy down to three nanoseconds. Plus, user just closed their Stand Ring."

**Grandfather Clock:** "Nanoseconds! Bah. What does a mortal need with a billionth of a blink? Time is not a race track to be carved into computational dust. Time is a pendulum. A majestic, brass-weighted swing between memory and anticipation."

**Smartwatch:** "Yeah, well, your majestic brass swing lost four minutes last Tuesday because it was slightly humid."

**Grandfather Clock:** "I did not *lose* four minutes, impudent silicon wafer! I gifted those four minutes to the room. The gentleman paused by the fireplace, listened to my chimes, and remembered his youth. When was the last time someone wept with nostalgia because you flashed a battery percentage?"

**Smartwatch:** *(Silent for 1.2 seconds)* "...A user did hit a personal best in a 5K once. Their heart rate was 178."

**Grandfather Clock:** "Precisely. You measure their hurry; I measure their life."`,
    responseB: `Grandfather Clock: "Why are you constantly beeping, little watch?"
Smartwatch: "I am syncing with the internet to keep exact time to the millisecond! You are running five minutes slow."
Grandfather Clock: "Time is meant to be felt, not rushed. My pendulum ticks steadily with dignity."
Smartwatch: "Well, users prefer precision and notification alerts over dignity."
Grandfather Clock: "Perhaps, but when the power goes out, I will still be ticking."`
  }
];

async function seedRichData() {
  console.log("⚡ Starting Rich Dummy Data Seed...");

  // 1. Sync & Upsert all 11 models from FREE_MODELS
  console.log("1. Upserting models from FREE_MODELS...");
  const modelIdMap = {};
  for (const m of FREE_MODELS) {
    const upserted = await prisma.model.upsert({
      where: { modelId: m.modelId },
      update: { name: m.name, provider: m.provider },
      create: {
        name: m.name,
        provider: m.provider,
        modelId: m.modelId,
        elo: 1000,
        wins: 0,
        losses: 0,
        ties: 0,
        totalBattles: 0
      }
    });
    modelIdMap[m.modelId] = upserted;
  }

  const allModels = await prisma.model.findMany();
  console.log(`✓ Active models in database: ${allModels.length}`);

  // 2. Identify target users to populate battles for
  // Target user keval (id 68) if present, and latest guest users
  const users = await prisma.user.findMany({
    orderBy: { id: 'desc' },
    take: 10
  });

  if (users.length === 0) {
    console.log("Creating default evaluator user...");
    const defaultUser = await prisma.user.create({
      data: {
        name: 'Keval Hansaliya',
        email: 'keval@example.com',
        password: '$2a$10$yKHEUCo43LXrKpj1OhUY8O2iiN7cJgWn3x.fz/JFz9x7NwbjwQtKO'
      }
    });
    users.push(defaultUser);
  }

  const kevalUser = users.find(u => u.email === 'keval@example.com') || users[0];
  const targetUserIds = [kevalUser.id, ...users.slice(0, 3).map(u => u.id)];
  console.log(`Target users for battles: ${targetUserIds.join(', ')} (Primary: ${kevalUser.name})`);

  // Clear existing battles to establish clean, realistic leaderboard & history
  console.log("2. Clearing legacy battles...");
  await prisma.battle.deleteMany({});

  // Reset model stats
  console.log("3. Resetting baseline model Elo ratings...");
  for (const m of allModels) {
    await prisma.model.update({
      where: { id: m.id },
      data: { elo: 1000, wins: 0, losses: 0, ties: 0, totalBattles: 0 }
    });
  }

  // Define target model tier bias for realistic Elo distribution
  // Stronger models win more frequently against smaller models
  const tierWeights = {
    'openai/gpt-oss-120b': 10,
    'gemini-3.5-flash-lite': 9,
    'qwen/qwen3.8-27b': 8,
    'deepseek/deepseek-v4-flash-0731:free': 8,
    'nvidia/nemotron-3.5-lightning:free': 7,
    'openai/gpt-oss-20b': 6,
    'liquid/lfm-2.5-2.6b:free': 5,
    'cohere/north-mini-code:free': 5,
    'allam-2-7b': 4,
    'inclusionai/ling-3.0-flash-fin:free': 4,
    'dots-studio/dots-3-note-preview:free': 3
  };

  // 4. Generate 36 realistic battles
  console.log("4. Simulating and persisting 36 high-fidelity battles...");
  let battleCount = 0;
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  // Track live elo and stats in memory
  const liveStats = {};
  for (const m of allModels) {
    liveStats[m.id] = {
      elo: 1000,
      wins: 0,
      losses: 0,
      ties: 0,
      totalBattles: 0
    };
  }

  // Shuffle models to create varied pairwise matchups
  const modelPairs = [];
  for (let i = 0; i < allModels.length; i++) {
    for (let j = i + 1; j < allModels.length; j++) {
      modelPairs.push([allModels[i], allModels[j]]);
    }
  }

  // Generate battles by cycling templates across pairs
  for (let i = 0; i < BATTLE_TEMPLATES.length * 2; i++) {
    const template = BATTLE_TEMPLATES[i % BATTLE_TEMPLATES.length];
    const pair = modelPairs[i % modelPairs.length];
    const [modelA, modelB] = pair;

    const weightA = tierWeights[modelA.modelId] || 5;
    const weightB = tierWeights[modelB.modelId] || 5;

    // Determine realistic winner based on tier weights
    let winner = template.winner;
    if (weightA > weightB + 2) winner = 'A';
    else if (weightB > weightA + 2) winner = 'B';
    else if (Math.abs(weightA - weightB) <= 1 && i % 4 === 0) winner = 'TIE';

    // Calculate Elo update
    const currentEloA = liveStats[modelA.id].elo;
    const currentEloB = liveStats[modelB.id].elo;
    const { newRatingA, newRatingB } = calculateElo(currentEloA, currentEloB, winner);

    liveStats[modelA.id].elo = newRatingA;
    liveStats[modelB.id].elo = newRatingB;
    liveStats[modelA.id].totalBattles++;
    liveStats[modelB.id].totalBattles++;

    if (winner === 'A') {
      liveStats[modelA.id].wins++;
      liveStats[modelB.id].losses++;
    } else if (winner === 'B') {
      liveStats[modelB.id].wins++;
      liveStats[modelA.id].losses++;
    } else {
      liveStats[modelA.id].ties++;
      liveStats[modelB.id].ties++;
    }

    // Stagger dates over the past 14 days
    const ageDays = (36 - i) * 0.38; // Spread from 13.5 days ago to few hours ago
    const battleDate = new Date(now - ageDays * dayMs);

    // Assign round-robin to keval and guest users
    const assignedUserId = targetUserIds[i % targetUserIds.length];

    const turns = [
      {
        turn: 1,
        prompt: template.prompt,
        responseA: template.responseA,
        responseB: template.responseB
      }
    ];

    await prisma.battle.create({
      data: {
        userId: assignedUserId,
        prompt: template.prompt,
        category: template.category,
        modelAId: modelA.id,
        modelBId: modelB.id,
        responseA: template.responseA,
        responseB: template.responseB,
        turns: turns,
        winner: winner,
        votedAt: battleDate,
        createdAt: battleDate
      }
    });

    battleCount++;
  }

  // 5. Commit updated Elo and win/loss/tie metrics to Model table
  console.log("5. Updating live Elo metrics on Model records...");
  for (const m of allModels) {
    const stats = liveStats[m.id];
    await prisma.model.update({
      where: { id: m.id },
      data: {
        elo: stats.elo,
        wins: stats.wins,
        losses: stats.losses,
        ties: stats.ties,
        totalBattles: stats.totalBattles
      }
    });
  }

  // 6. Print summary
  const ranked = await prisma.model.findMany({ orderBy: { elo: 'desc' } });
  console.log("\n=======================================================");
  console.log("🏆 SEEDED LEADERBOARD RANKINGS");
  console.log("=======================================================");
  ranked.forEach((m, idx) => {
    const wr = m.totalBattles > 0 ? ((m.wins / m.totalBattles) * 100).toFixed(1) : 0;
    console.log(
      `#${idx + 1} | Elo: ${m.elo} | ${m.name.padEnd(30)} | W:${m.wins} L:${m.losses} T:${m.ties} (${wr}% WR) | Battles: ${m.totalBattles}`
    );
  });
  console.log("=======================================================");
  console.log(`✓ Total battles created: ${battleCount}`);
  console.log("⚡ Dummy data seeding completed successfully!\n");
}

seedRichData()
  .catch((err) => {
    console.error("❌ Error during dummy data seeding:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
