# AI Cost Analysis

The app records `input_tokens`, `output_tokens`, operation counts, and estimated cost for OpenAI-backed commands when usage data is available. Deterministic commands are handled in-process and should be treated as effectively zero model cost.

## Development and Testing Spend

Supabase `ai_command_logs` aggregate as of `2026-05-14T15:15:34.515Z`:

- Total AI command log rows: `147`
- Completed commands: `144`
- Failed commands: `3`
- OpenAI-backed API calls with token usage: `15`
- Deterministic completed commands: `129`
- Total input tokens: `15,175`
- Total output tokens: `1,608`
- Total estimated OpenAI API spend: `$0.124115`
- Average OpenAI-backed command: `1,012` input tokens, `107` output tokens, `$0.008274`
- Other AI-related runtime costs tracked in-app: `$0`; Vercel, Supabase, Liveblocks, and subscription-based development-agent costs are not metered in `ai_command_logs`.

## Current Estimator

- Input: `$5 / 1M tokens`
- Output: `$30 / 1M tokens`
- Typical command assumption: 1,000 input tokens and 500 output tokens
- Estimated model cost per OpenAI command: `$0.020`

Example calculation:

- 1,000 input tokens = `$0.005`
- 500 output tokens = `$0.015`
- Total = `$0.020`

To refresh the aggregate before final submission, export from Supabase `ai_command_logs`:

```sql
select
  count(*) as commands,
  sum(input_tokens) as input_tokens,
  sum(output_tokens) as output_tokens,
  sum(estimated_cost_usd) as estimated_cost_usd
from ai_command_logs;
```

## Monthly Projection

Light usage assumes 40 OpenAI-backed commands per user per month. Heavy workshop usage assumes 225 OpenAI-backed commands per user per month.

| Users | Light commands | Light cost | Heavy commands | Heavy cost |
| ---: | ---: | ---: | ---: | ---: |
| 100 | 4,000 | `$80` | 22,500 | `$450` |
| 1,000 | 40,000 | `$800` | 225,000 | `$4,500` |
| 10,000 | 400,000 | `$8,000` | 2,250,000 | `$45,000` |
| 100,000 | 4,000,000 | `$80,000` | 22,500,000 | `$450,000` |

## Cost Controls Before Production Scale

- Prefer deterministic handlers for common templates and layout commands.
- Cap prompt context to selected, viewport, and candidate objects.
- Add per-user and per-board monthly quotas.
- Add a usage dashboard from `ai_command_logs`.
- Add alerts for model fallback rate, high token counts, and repeated failed commands.
- Require admin override for expensive board-wide transformations.
