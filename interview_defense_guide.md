# Interview Defense Guide (Google & FAANG Technical Screening)

This guide prepares you to answer every technical deep-dive question a **Google or FAANG interviewer** will ask based on your resume.

---

## 1. Competitive Programming & DSA (Google Screening Priority #1)

### Q: How do you defend your LeetCode Knight Rating (1,850+ | Top 3.5%)?
- **Key Takeaways**:
  - Rating of 1,850+ proves proficiency in **Graphs (Dijkstra, Tarjan's, Segment Trees)**, **Dynamic Programming (Knapsack, Bitmask DP)**, **Tree Traversal**, and **Binary Search on Answer**.
  - **Acceptance Rate (96.4%)**: Highlights write-first accuracy and edge-case handling before submission (minimizing penalty time).

---

## 2. DRDO Internship (Defence & Target Localization)

### Q1: How does Bearing-Only Measurement (BOM) & Triangulation work mathematically?
- **Concept**: Bearing-Only Measurement relies solely on directional angles (azimuth $\theta$ and elevation $\phi$) measured by multiple sensors without range information.
- **Math**:
  - Each sensor node $S_i = (x_i, y_i, z_i)$ observes a line of sight vector $\vec{d}_i = [\cos\phi_i \cos\theta_i, \cos\phi_i \sin\theta_i, \sin\phi_i]^T$.
  - The target position $\vec{P} = (x, y, z)$ lies on the ray $\vec{P} = S_i + \lambda_i \vec{d}_i$.
  - With $N \ge 2$ sensors, the rays do not intersect perfectly due to measurement noise. We solve for $\vec{P}$ using **Least Squares Triangulation** by minimizing the perpendicular distance from $\vec{P}$ to all $N$ sensor rays:
    $$\min_{\vec{P}} \sum_{i=1}^N \| (I - \vec{d}_i \vec{d}_i^T) (\vec{P} - S_i) \|^2$$

### Q2: How did spatial noise filtering (Apex-angle & Elevation bounds) eliminate ghost targets?
- **Geometric Dilution of Precision (GDOP)**: Excluded ray pairs intersecting at near-parallel or acute angles ($\theta_{apex} < 15^\circ$ or $> 165^\circ$) where small sensor errors cause massive target position uncertainty.
- **DBSCAN Clustering**: Grouped dense clusters of sensor ray intersection points ($\epsilon$ neighborhood radius, `MinPts` threshold) while classifying sparse, isolated ghost intersections as noise.

---

## 3. Projects (Google Systems & LLD Bar)

### Project 1: Juno AI — Offline RAG & Vector Search Engine
- **Why TF-IDF + Cosine Vector Engine?**: Juno AI is designed as a **100% offline, zero-dependency local workspace**. Standard dense embeddings require either remote API calls (network overhead & privacy issues) or heavy local model initialization. TF-IDF provides instant keyword & exact match retrieval with zero memory overhead.
- **Dependency Inversion (LLD)**: Defined `IPersistenceAdapter` interfaces. Business services depend on abstractions, allowing seamless swapping between SQLite, PostgreSQL, and In-Memory stores.

### Project 2: Synergia — WebRTC Real-Time Media Engine
- **NAT Traversal**: Uses STUN to discover public IP/port bindings and TURN relays when symmetric NAT or enterprise firewalls block P2P connections.
- **Congestion Control & 30% Packet Loss**: Used dynamic SDP renegotiation, Google Congestion Control (GCC) adaptive bitrate scaling, and NACK/FEC (Forward Error Correction) to maintain 60 FPS playback.

### Project 3: AlgoVerse — Interactive Algorithm Visualization Engine
- **Async Execution Queue**: Built an asynchronous execution state machine that decouples algorithm evaluation from HTML5 Canvas UI rendering, allowing step-by-step state inspection and memory consumption benchmarking without blocking the browser UI thread.
