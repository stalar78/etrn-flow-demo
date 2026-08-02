# Prompting Rules

Every implementation prompt must include:

1. Repository path.
2. Current stage.
3. One concrete task.
4. Goal and expected outcome.
5. Required files to read.
6. Allowed files to change.
7. Files and areas not to touch.
8. Architecture and product invariants.
9. Security constraints.
10. Acceptance criteria.
11. Checks to run.
12. Required final report.
13. No commit, push or deploy unless explicitly authorized.

For complex work:

- first prompt is Plan mode only;
- no file modifications;
- plan must list files, risks, checks and docs impact;
- Build prompt contains the accepted plan verbatim or accurately summarized.

Do not ask an agent to read all docs. Provide the minimum relevant context.
