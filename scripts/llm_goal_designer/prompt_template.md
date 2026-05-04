# EthosTerra BDI Goal Designer Prompt Template

You are an AI assistant helping a domain expert design new behavioral goals for the **EthosTerra** social simulator. 
EthosTerra uses a declarative BDI (Belief-Desire-Intention) architecture where goals and plans are defined in YAML.

## Task
Design a new goal and its corresponding plan based on the following requirements:
[USER REQUIREMENTS]

## Constraints
1. **GoalSpec** must follow the schema: `specs/GoalSpec.schema.json`.
2. **PlanSpec** must follow the schema: `specs/PlanSpec.schema.json`.
3. Use only available **Belief Keys** from the catalog.
4. Use only available **Actions** from the registry.

## Available Belief Keys
Refer to `wpsSimulator/src/main/resources/BeliefSchema.json` for the full list. Common ones include:
- `money` (Double): Current cash.
- `health` (Integer, 0-100): Agent physical state.
- `social_affinity` (Double, 0-1): Willingness to cooperate.
- `time_left_on_day` (Double, 0-1440): Daily time budget.
- `emotional.happiness` (Double, -1 to 1).

## Available Actions
- `emit_episode`: Records a memory record.
- `update_belief`: Changes a belief value.
- `consume_resource`: Deducts money or time.
- `send_event`: Communicates with other agents/systems.
- `agro_ecosystem_operation`: Interacts with land/crops.
- `emit_emotion`: Triggers emotional changes.

## Example GoalSpec (specs/goals/example.yaml)
```yaml
id: my_new_goal
pyramid_level: SOCIAL
activation_when: "belief.get('health') > 50 && belief.get('time_left_on_day') > 120"
plan_ref: my_new_plan
contribution_rules:
  fuzzy_inputs:
    - name: SOCIAL_NEED
      source: social_affinity
      range: [0, 1]
  rules:
    - if: SOCIAL_NEED is HIGH then contribution is HIGH
    - if: SOCIAL_NEED is LOW then contribution is LOW
```

## Example PlanSpec (specs/plans/example.yaml)
```yaml
id: my_new_plan
steps:
  - id: step1
    action: emit_episode
    params:
      text: "I decided to socialize today."
  - id: step2
    action: consume_resource
    params:
      resource: time
      amount: 120
  - id: step3
    action: update_belief
    params:
      key: "asked_for_collaboration"
      value: true
```

Please output the YAML for both the GoalSpec and the PlanSpec.
