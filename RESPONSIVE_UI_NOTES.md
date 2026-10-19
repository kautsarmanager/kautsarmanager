# Responsive UI consistency layer

Added a global responsive CSS layer in `src/index.css` to reduce horizontal overflow and flex/grid min-content issues across phone, tablet, and desktop sizes. It also makes wide tables scroll within their own container and improves touch controls.

This is a safety net, not a guarantee that every component is perfectly responsive: components with hard-coded widths or bespoke panel layouts still need visual testing at representative viewport sizes (320, 375, 430, 768, 1024, and 1440 px). Build and device-level visual tests must be run in the project environment before claiming full validation.
