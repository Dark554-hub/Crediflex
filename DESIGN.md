# Design System

## Overview

Crediflex uses a restrained mobile-first product interface for field collections. The visual goal is quick administration from an Android phone: clear money figures, short labels, obvious actions, and enough density to move fast during a route.

## Color

- Background: `#F6FBF7`
- Primary ink: `#0E3B2E`
- Action green: `#1F6F54`
- Support green: `#5FB88A`
- Divider / quiet surface: `#D7E7DD`
- Surface: white

Use the dark green for headers, totals, and primary actions. Use the lighter greens for selected states, badges, focus rings, and soft grouping. Avoid gray-on-gray text; secondary text should stay readable against the pale background.

## Typography

The app uses the system sans stack led by Aptos and Segoe UI. Keep product labels direct and compact. Use tabular numbers for currency and payment counts so values scan cleanly.

## Components

- App bar: sticky, dark green, 64px minimum height, large back target.
- Buttons: 48px minimum height, 8px radius, strong focus ring, clear disabled state.
- Inputs: visible labels, 48px minimum height, outlined white controls, green focus ring.
- Cards: 8px radius, light border or small shadow, no nested decorative cards.
- Lists: client/credit name on the left, money/status on the right, row tap target at least 48px.

## Layout

Screens are mobile-first with a max content width on larger devices. Avoid horizontal scroll at 375px. Keep primary actions full-width on phone and inline on larger screens.

## Motion

Use short 150-200ms transitions for hover, focus, and press feedback only. Respect reduced motion globally.
