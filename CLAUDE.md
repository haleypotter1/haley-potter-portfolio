# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

This repository is currently just scaffolding: `package.json` declares `gsap` and `three` as dependencies, but there is no source code, build tooling, config, or README yet. There are no lint or test commands configured.

When source files, a build system (e.g. Vite), and scripts are added, update this file with:
- Install/dev/build/lint/test commands (from `package.json` scripts)
- The high-level architecture once there's enough structure to describe (how `gsap` and `three` are wired together, module layout, entry points)


# CLAUDE.md

# Portfolio Website

This website should communicate curiosity, passion, determination, a wide range of abilities, and craftsmanship. Every design decision should feel intentional, modern, and technically polished.

The site should never feel cluttered or overwhelming. Prioritize simplicity, whitespace, and smooth interactions over excessive visual effects.

---

# Garmin Data Pipeline

## Purpose

Display recent activity in a way that is informative while protecting user privacy.

The Garmin integration should update automatically whenever new activities are synced so that the website always reflects current information without requiring manual updates.

## Public Data

Only expose the following information:

- Activity name
- Activity type
- Activity date
- Distance
- Year-to-date mileage

## Never Display

The website must NEVER expose:

- GPS coordinates
- Maps
- Routes
- Pace
- Speed
- Heart rate
- Cadence
- Elevation
- Calories
- Personal records
- Start or end locations
- Any Garmin identifiers
- Raw API responses

The visitor should never be able to infer where the user lives, runs, or exercises.

## Data Flow

Garmin Connect
        ↓
Python Fetch Script
        ↓
JSON Processing
        ↓
Public JSON
        ↓
Portfolio Website

The Python script should:

- Authenticate with Garmin Connect
- Fetch the latest activities
- Calculate cumulative mileage from January 1 of the current year
- Export only public-safe fields
- Overwrite the public JSON file
- Be suitable for scheduled automation (GitHub Actions or cron)

The website should simply fetch the generated JSON and never communicate directly with Garmin.

---

# Design Philosophy

The portfolio should feel like premium software rather than a marketing website.

Keywords:

- Minimal
- Premium
- Confident
- Fast
- Technical
- Clean
- Intentional

Animations should guide attention instead of distracting from content.

Whitespace is a feature.

---

# Color System

## Dune-Inspired Design Direction

### Overall Philosophy

Take inspiration from the *feeling* of Dune rather than recreating the movie aesthetic.

The website should feel:

- warm instead of cold
- atmospheric instead of futuristic
- elegant instead of aggressive
- timeless instead of trendy
- premium instead of flashy

This is a subtle influence—not a theme. Someone familiar with Dune might notice the inspiration, but everyone else should simply think the design feels unique, refined, and memorable.

The portfolio should still feel like a modern engineering student's website first.

---

## Color & Atmosphere

Instead of dark sci-fi blacks and harsh oranges, use a much lighter palette.

Think:

- warm ivory backgrounds
- cream
- soft sand
- pale stone
- champagne gold
- hazy amber
- muted sunset orange

Reserve darker colors only for contrast or specific sections.

The website should feel bright enough that reading long sections is effortless.

Avoid:

- pure black backgrounds
- heavy neon orange
- high-contrast cyberpunk palettes
- military or industrial aesthetics

---

## Haze and Depth

One of the defining inspirations is the hazy desert atmosphere.

Create depth using:

- soft radial gradients
- warm fog
- subtle blur
- layered transparency
- atmospheric lighting

Backgrounds should feel like light is passing through dust instead of sitting on flat colors.

Nothing should have hard digital edges unless intentionally highlighting an interaction.

---

## Circular Geometry

Use circles as a recurring design language.

Inspired by celestial bodies, dunes, and orbital geometry.

Examples:

- oversized blurred circles
- radial masks
- circular section dividers
- halo effects
- concentric outlines
- partial arcs disappearing off screen

Avoid making circles literal icons.

They should feel architectural.

---

## Radiating Gold Motif

The attached gold spiral/radial artwork titled dune.spiral in my-first-app is the strongest visual inspiration.

Incorporate this idea sparingly throughout the site.

Possible implementations:

- thin radial line backgrounds
- subtle sunburst patterns
- concentric line textures
- faint engraved geometric overlays
- section transitions
- hero background details

Keep opacity extremely low (5–12%).

The user should discover these details rather than immediately noticing them.

These graphics should add richness without distracting from the content.

---

## Motion

Animations should feel like shifting sand.

Prioritize:

- slow easing
- drifting gradients
- soft fades
- expanding halos
- gentle parallax
- radial reveals

Avoid:

- snappy animations
- elastic movement
- excessive bouncing
- flashy transitions

Everything should feel calm and intentional.

---

## Texture

Introduce subtle texture throughout the website.

Examples:

- fine grain
- paper texture
- sandstone texture
- brushed gold
- soft noise

Never use obvious photo textures.

The texture should only become visible on close inspection.

---

## Light

Lighting should be a primary design element.

Imagine sunlight filtering through desert dust.

Use:

- warm glow behind important sections
- soft highlights around interactive elements
- diffused lighting
- gradual gradients

Avoid hard glows and obvious bloom effects.

---

## Typography

Typography should reinforce the premium feel.

Large amounts of whitespace.

Elegant spacing.

Strong hierarchy.

Simple fonts.

Let the layout breathe.

The interface should feel confident enough that it doesn't need visual clutter.

---

## Integration with Existing Brand Colors

The primary accent colors remain:

- #fe2035
- #a4fe20
- #20fee9
- #7a20fe

These are part of my personal brand and should NOT be replaced.

Instead, use warm sand, champagne, and muted gold as environmental colors around them.

The gold tones should frame and elevate the existing accent colors rather than compete with them.

---

## Overall Goal

Imagine if Apple designed a portfolio website after spending time studying desert architecture, premium editorial design, and the visual atmosphere of Dune.

The result should feel:

- warm
- optimistic
- modern
- highly crafted
- spacious
- intelligent
- subtly cinematic

The Dune inspiration should be felt emotionally through atmosphere, geometry, lighting, and composition—not through obvious movie references.

---

# Backgrounds

Preferred:

Near Black
#d5c9c9

Dark Gray
#a39696

Charcoal
#9fa0b2

Use gradients sparingly.

Large backgrounds should remain light and calm so the accent colors provide contrast without causing eye fatigue.

---

# Typography

Typography should be highly legible.

Use high contrast.

Avoid excessive font weights.

Content should always be easier to read than it is to admire.

---

# Animation

Animations should feel smooth and intentional.

Preferred duration:

200–700ms

Avoid:

- Flashing colors
- Rapid pulsing
- Continuous bouncing
- Fast repeating animations
- Large glowing effects

Motion should improve usability—not compete with it.

---

# Dashboard Components

Garmin statistics should be displayed as premium dashboard cards.

Examples:

- Total Year Mileage
- Latest Run
- Latest Lift
- Recent Activities

Cards should use subtle colored borders or small accent indicators rather than fully saturated backgrounds.

---

# Things Never To Do

Never expose private Garmin information.

Never sacrifice readability for aesthetics.

Never use bright colors as paragraph backgrounds.

Never place colored text on similarly saturated backgrounds.

Never overuse glow effects.

Never create unnecessary visual noise.

Every page should feel calm, polished, and engineered.