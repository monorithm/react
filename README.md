# @monorithm/react

The React package of the Monorithm Experience Language. It gives the components of the language on Base UI, styled with the tokens of the language through Tailwind 4.

At this time the package has one component, the Switch. It is the spike S4 of the plan: one component end to end. A test examines each clause of its contract. The other 19 components of version 1 follow in the order of the list in `monorithm/design` (`contracts/v1-components.md`).

## Use the package

The package is not on npm at this time.

1. Install `@monorithm/react`, `react`, `react-dom`, and `tailwindcss` 4.
2. In the CSS of the app, import Tailwind, the theme, the tokens, and the geometry of the components. Let Tailwind scan the package:

```css
@import "tailwindcss";
@import "@monorithm/react/theme.css";
@import "@monorithm/react/tokens.css";
@import "@monorithm/react/components.css";
@source "../node_modules/@monorithm/react/dist";
```

3. Use a component. Give a `MomentProvider` to apply the haptics and the sounds of the moments:

```tsx
import { MomentProvider, Switch } from '@monorithm/react'

<MomentProvider onMoment={(e) => console.log(e.moment, e.variant)}>
  <Switch label="Alerts" description="Get a message for each new order" />
</MomentProvider>
```

The axes of the language: `data-theme` (`dark`, `light`) and `data-density` (`pointer`, `touch`) on an element apply to the elements in it. With no attribute, the system setting applies. `data-motion="reduced"` stops the motion, as the reduced-motion setting of the system does.

## How the package gets the language

| Step | Command | Result |
| --- | --- | --- |
| Pin | `yarn pin ../design` | Copies `ir/<version>/` of `@monorithm/design` into `ir/`, and writes `language.lock` with the checksum |
| Emit | `yarn emit` | Writes `src/tokens/`: the CSS custom properties, the Tailwind theme, the geometry of the contracts, and the typed values |
| Drift check | `yarn check` | Stops with an error if `ir/` does not match `language.lock`, or if a generated file differs from the output of the emitter |

Do not edit a file in `src/tokens/`. Change the language source in `monorithm/design`, then pin and emit again.

## The tests

`yarn test` runs two kinds of tests. Each test name starts with the id of a clause of the contract, for example `switch/keyboard`.

- In jsdom: the role, the name, the keyboard, the target, the moment, the disabled state, and an axe audit.
- In the Chrome of the computer: the sizes of each density, the right-to-left layout, the focus ring, the colors of each theme, and the motion. These tests compile the real CSS with Tailwind and measure the rendered Switch.

## The text

All text is in ASD-STE100 Simplified Technical English.
