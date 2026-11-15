# Rules for agents in this repository

- This repository is the React package of the Monorithm Experience Language, `@monorithm/react`. It is greenfield. Do not copy files or history from an archived repository.
- Write all text in ASD-STE100 Simplified Technical English.
- The values come from the pinned language in `ir/`. Do not type a value of the language into a component. Use the custom properties of `src/tokens/`.
- Do not edit `ir/` or `src/tokens/`. Pin and emit again (`yarn pin`, `yarn emit`).
- Each test of a component starts its name with the id of a clause of the contract of the component.
- A component emits a moment with `useMoment`. It never starts a haptic or a sound directly.
- Use Yarn Berry.
- Put each component in one folder in `src/components/`, with kebab-case file names: `<component>.tsx`, `<component>.variants.ts`, `<component>.<part>.tsx`, `<component>.test.tsx`, and `index.ts`.
- Put the context of one component in its folder: `<component>.context.ts`. Put a context from outside one component in `src/contexts/`.
- Put shared code in `src/hooks/` and `src/lib/`.
- Use a relative import only with `./` or `../`. For a path that goes up two folders or more, use `@monorithm/react/...`.
- The repository is public. Do not add these items:
  - A private name
  - The ID of a decision or of a private process
  - The name of a canvas board
