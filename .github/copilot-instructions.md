# AI Coding Agent Instructions for Svelte + D3 Starter

## Project Overview

This is a **Svelte 4 + D3.js visualization framework** built with **Vite**. It provides a bare-bones starter for combining reactive Svelte components with D3's data visualization capabilities. The project includes minimal scaffolding intentionally—all visualization logic must be built in Svelte components.

## Architecture

### Core Stack

- **Svelte 4**: Component framework (reactive, compiler-based)
- **D3 7.x**: Data visualization library (imperative, DOM-focused)
- **Vite 5**: Build tool (ESM-first, hot module replacement in dev)
- No UI framework (React, Bootstrap, etc.) — build custom as needed

### File Structure

- `src/App.svelte`: Root component (empty by design—add visualization here)
- `src/main.js`: Entry point that mounts App to `#app` DOM element
- `src/app.css`: Global styles with zero margin/padding reset and full-height layout
- `index.html`: Simple HTML shell targeting `#app` div
- `vite.config.js`: Minimal config delegating to Svelte plugin

## Svelte + D3 Integration Pattern

### Key Constraint: Svelte Reactivity vs D3's DOM Manipulation

- **Svelte** manages the reactive component lifecycle and data binding
- **D3** expects direct DOM manipulation and doesn't track Svelte reactivity
- **Solution**: Use Svelte refs (`bind:this`) to access DOM elements, then apply D3 selections to those refs

### Example Pattern

```svelte
<script>
  import * as d3 from 'd3';
  let svgElement;

  // D3 scales, generators, etc. can be reactive
  $: data = /* computed data */;
  $: if (svgElement && data) {
    // Re-run D3 code when dependencies change
    const svg = d3.select(svgElement);
    svg.selectAll('circle').data(data).join(...)...
  }
</script>

<svg bind:this={svgElement} width="800" height="600"></svg>
```

**Critical**: Don't let D3 and Svelte both manage the same DOM elements. D3 operates within ref-bound elements.

## Development Workflow

### Commands

- `npm run dev`: Start Vite dev server (default: http://localhost:5173) with HMR
- `npm run build`: Compile to `dist/` for production
- `npm run preview`: Test production build locally

### Hot Module Replacement (HMR) Behavior

- Svelte components auto-reload on save
- D3 code in reactive blocks (`$:`) re-executes automatically
- Manual `location.reload()` may be needed if D3 state gets out of sync

### CSS Approach

- Global styles in `src/app.css` (currently provides zero-margin reset + full-height root)
- Component styles via Svelte `<style>` blocks (scoped by default)
- No CSS preprocessor configured—use plain CSS or add `sass` if needed

## Project-Specific Conventions

### Data Handling

- D3 data objects should be plain JavaScript objects or arrays—Svelte reactivity doesn't track nested mutations
- Use reactive assignment (`$: variable = ...`) to trigger re-renders when data structure changes

### Visualization Sizing

- The root `#app` div is set to 100% width/height (see `app.css`)
- SVG/Canvas elements can safely use parent dimensions with `viewBox` or `ResizeObserver` if needed

### Module Imports

- ES modules throughout (`import`/`export`—already configured in `package.json` as `"type": "module"`)
- D3 exports named exports: `import * as d3 from 'd3'` or selective imports like `import { select, scaleLinear } from 'd3'`

## Common Integration Points

### Adding Data Sources

- Static data: Import JSON files as modules
- Dynamic data: Fetch in `onMount()` lifecycle hook
- Time-series: Use D3 timers (`d3.interval()`) within a reactive context

### Common Libraries to Add

- **D3 Plugins**: `d3-geo`, `d3-hierarchy` for specific viz types (install + `import` individually)
- **Styling**: Tailwind (`npm install -D tailwindcss`) if needed beyond plain CSS
- **State Management**: Svelte stores (`import { writable } from 'svelte/store'`) for cross-component state

## Debugging Tips

1. **D3 selections not updating?** Check if the D3 code is in a reactive block (`$: { /* d3 code */ }`). Without reactivity, D3 code runs once at mount.
2. **Svelte component not re-rendering?** Ensure you're triggering reactivity with reassignment, not nested mutation. D3 doesn't know about Svelte's reactivity.
3. **Performance with large datasets?** Consider virtual scrolling or D3's force simulation limitations. Profile with browser DevTools.
4. **HMR issues?** Force refresh if D3 state persists across reloads. Check browser console for errors in reactive blocks.

## Adding More Structure

This is intentionally a bare starter. Common additions:

- **Components**: Extract reusable chart types into separate `.svelte` files
- **Utilities**: Create `src/utils/` for D3 helpers (scales, axes, data transforms)
- **Stores**: Use `src/stores.js` for shared reactive state across components
