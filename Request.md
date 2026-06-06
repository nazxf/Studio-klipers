You are a Principal Software Engineer and Distributed Systems Architect.

Analyze this repository:

https://github.com/nazxf/Studio-klipers

Context:
- This is a Next.js + TypeScript application.
- Users upload MP4 videos.
- FFprobe is used for media inspection.
- FFmpeg is used for clip generation.
- Prisma is used for persistence.
- Background jobs are stored in the database.
- The project is currently MVP-stage but is expected to scale.

Your task is NOT to blindly recommend Go or Rust.

Perform a deep architectural review focused on:

1. Memory usage
   - Look for memory leaks.
   - Look for resource leaks.
   - Look for file handle leaks.
   - Look for stream lifecycle issues.
   - Look for child_process lifecycle problems.
   - Identify where large files are unnecessarily loaded into RAM.

2. Worker architecture
   - Analyze the current clip processing pipeline.
   - Analyze FFmpeg execution strategy.
   - Analyze job claiming and concurrency.
   - Analyze retry safety.
   - Analyze failure recovery.
   - Analyze orphaned jobs.

3. Scalability
   - Estimate realistic bottlenecks at:
     - 100 videos/day
     - 1,000 videos/day
     - 10,000 videos/day
   - Identify what breaks first.
   - Explain why.

4. Language suitability
   Compare:

   A. Keep everything in Node.js
   B. Next.js + Go Worker
   C. Next.js + Rust Worker
   D. Full rewrite to Go
   E. Full rewrite to Rust

   For each option provide:

   - Complexity
   - Operational cost
   - Development velocity
   - Memory efficiency
   - Reliability
   - Maintainability
   - Hiring difficulty
   - Long-term scalability

5. Produce a score from 0-100 for:
   - Staying on Node.js
   - Adding a Go Worker
   - Adding a Rust Worker
   - Full Go rewrite
   - Full Rust rewrite

6. Migration roadmap

   If Go Worker is recommended:

   Design a production-ready architecture:

   - Next.js responsibilities
   - Go Worker responsibilities
   - Database responsibilities
   - Queue responsibilities
   - FFmpeg execution model
   - Timeout strategy
   - Cancellation strategy
   - Cleanup strategy
   - Monitoring strategy

7. Concrete findings

   Output:

   HIGH RISK
   MEDIUM RISK
   LOW RISK

   For every finding include:

   - File
   - Function
   - Why it is risky
   - Suggested patch

Be brutally honest.

Do not give generic advice.

Base every conclusion on actual code found in the repository.
