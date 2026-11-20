# Custom Pipelines

Place custom pipeline JSON files in this directory. They will be loaded at
server startup and available alongside the bundled pipelines.

## JSON Schema

Each pipeline file must be a JSON object with these fields:

| Field         | Type       | Required | Description                              |
|---------------|------------|----------|------------------------------------------|
| `name`        | string     | yes      | Display name of the pipeline             |
| `description`  | string     | no       | Short description of the pipeline         |
| `variables`    | string[]   | no       | Variable names for substitution          |
| `steps`        | Step[]     | yes      | Ordered list of steps to execute         |

## Step Types

### mcp_call
Calls an MCP tool with specific parameters.
```json
{
  "type": "mcp_call",
  "tool": "tool_name",
  "params": { "key": "value" },
  "description": "What this step does",
  "on_error": "halt",
  "requires_approval": false
}
```

### agent_task
Gives the agent a free-form instruction to execute.
```json
{
  "type": "agent_task",
  "instruction": "Do something specific",
  "description": "What this step does",
  "on_error": "warn_and_continue"
}
```

Or reference an instruction file from `.bridge/instructions/`:
```json
{
  "type": "agent_task",
  "instruction_file": "my-instructions.md",
  "description": "What this step does"
}
```

## Variables

Declare variables in the `variables` array and reference them with `{variable_name}`
in step params, instructions, and descriptions. The `docs_dir` variable is
automatically provided by the server.

## on_error

- `"halt"` (default) — stop the pipeline immediately on failure
- `"warn_and_continue"` — log a warning and proceed to the next step

## Executing Pipelines

Pipelines defined here are executed by the calling agent. Call the
`get_pipeline_recipe` MCP tool with the pipeline name and any variables; it
returns a fully resolved recipe:

- `steps` — the ordered step array, with variables substituted and every
  `instruction_file` reference already inlined as `instruction` text.
- `total_steps`, `auto_approve`, and `execution_mode`.

`execution_mode` is `inline`: there is no server-side orchestrator,
and no run to resume. The agent executes each step itself in order — calling the named
tool for an `mcp_call` step, following the instruction text for an
`agent_task` step — and honours each step's `on_error` and
`requires_approval` fields as it goes.

## `agent_task` Instruction Files

When you reference an instruction file (`instruction_file: "…"`), the file
markdown MUST end with a terminal `## Return` H2 section describing what the
agent should carry forward from that step. The return value is a string — do
NOT ask the agent to wrap it in JSON unless the instruction body explicitly
says to serialize structured output.
