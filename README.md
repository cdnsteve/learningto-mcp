# LearningTo MCP Server

Interview prep for AI agents. `learningto-mcp` exposes the LearningTo.co
curriculum, graded challenges and AI feedback tools to any MCP client, so a
candidate can practice inside Claude Code, Claude Desktop, Cursor or their own
agent instead of switching to a browser.

- **Works with** Claude Code, Claude Desktop, Cursor, and any MCP-compatible host.
- **No install step to try it:** `npx -y learningto-mcp`
- **Offline core:** curriculum, challenges and the learning path are bundled.
- **Optional AI tools:** code analysis, hints, explanations, readiness and
  problem generation call learningto.co and need a free account token.
- **Site:** https://learningto.co
- **Interactive MCP explainer:** https://learningto.co/mcp

## Quick start

```bash
npx -y learningto-mcp
```

### Claude Code

```bash
claude mcp add learningto -- npx -y learningto-mcp
```

For the AI feedback tools, add the session token to the environment:

```bash
claude mcp add learningto \\
  --env ALGOVAULT_SESSION_TOKEN=your-session-token \\
  -- npx -y learningto-mcp
```

### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "learningto": {
      "command": "npx",
      "args": ["-y", "learningto-mcp"],
      "env": {
        "ALGOVAULT_SESSION_TOKEN": "your-session-token"
      }
    }
  }
}
```

### Cursor

Add the same server block to Cursor's MCP configuration (`.cursor/mcp.json` or
the global MCP settings), then restart Cursor.

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `ALGOVAULT_SESSION_TOKEN` | No | Session token from a free LearningTo account. Required only for the five AI tools. Treat it like a password and never commit it. |
| `ALGOVAULT_API_URL` | No | Override the AI endpoint base URL. Default: `https://learningto.co/api`. |

Without a token, the five curriculum tools work offline and the AI tools return
a readable message explaining what is missing. They do not fail the whole call.

## Tools

| Tool | What it does | Network |
|---|---|---|
| `learningto_get_curriculum` | Full topic and challenge list, with ids | Offline |
| `learningto_get_topic` | One topic, with its challenges and complexity | Offline |
| `learningto_get_challenge` | A specific challenge and its starter code | Offline |
| `learningto_get_learning_path` | The prerequisite graph / skill tree | Offline |
| `learningto_recommend_next` | Recommended next topics after finishing one | Offline |
| `learningto_mock_interview` | Interviewer brief plus questions and grading focus for a topic | Offline |
| `learningto_analyze_code` | Review a solution for correctness and complexity | AI, token |
| `learningto_get_hint` | Progressive hints at levels 1 to 3 | AI, token |
| `learningto_explain` | Contextual concept explanation | AI, token |
| `learningto_assess_readiness` | Readiness score from progress data | AI, token |
| `learningto_generate_problem` | Generate a new practice problem | AI, token |

## Example prompts

- "Use learningto to build me a two-week plan for AI engineer interviews, starting from RAG."
- "Quiz me on RAG retrieval with learningto, one question at a time, and grade each answer."
- "Pull the two-sum challenge, let me solve it, then use learningto to review my code and give one hint."
- "Which topics should I study after agents-behavior, and why?"

## How it is built

The server is a stdio MCP server written in TypeScript with the official
`@modelcontextprotocol/sdk`. The curriculum and learning-path graph are bundled
at build time. The AI tools call the deployed LearningTo API and never receive
your account password.

This repository mirrors the published package. The source lives in the private
LearningTo app repo; the compiled server in `dist/` is what npm installs.

## Development

```bash
npm install
npm run build
npm start
```

## License

MIT. See [LICENSE](LICENSE).
