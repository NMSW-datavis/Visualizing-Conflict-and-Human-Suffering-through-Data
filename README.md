# Visualizing Conflict and Human Suffering

### *Exploring the human stories behind data on global conflicts.*

This project aims to visualize data on **conflict and human suffering** through thoughtful, human-centered design. It is developed as part of the **Data Visualization Course** at the **Università di Genova**.

Our goal is to make complex datasets accessible and emotionally resonant; translating numbers into stories that reveal the human toll of global crises.

---

## Project Overview

### Objective
To build an **interactive website** that displays data visualizations related to global conflict, displacement, and humanitarian crises.

This website will evolve over time, with each update introducing a new visualization or data story. At present, it serves as a **foundation**: introducing the project's theme, purpose, and design direction.

---

## Design Philosophy

The visual identity is based on a poetic, organic approach to data storytelling.

**Key design choices:**
- **Minimal and soft color palette**: balancing seriousness and empathy
- **Circular, organic shapes**: representing people, connections, and ongoing movement
- **Generous whitespace and calm typography**: to evoke reflection and dignity
- **Smooth animations and gradients**: to create a modern and humane tone

### Typography
- **Headings:** Roboto Slab
- **Body Text:** Fira Sans

### Color Palette
| Purpose | Color | Description |
|----------|--------|-------------|
| Primary | `#003a70` | Deep blue (stability, seriousness) |
| Accent | `#f5b7a3` | Soft coral (empathy, warmth) |
| Background | `#fcfbf8` | Warm parchment white |
| Secondary | `#6b6b6b` | Muted grey for balance |

---

## Project Structure

```
./
├── index.html
├── style.css
├── logo-colore.png
└── README.md
```

---

## Data Sources

The datasets informing this project come from respected, openly accessible institutions:

- [ACLED – Armed Conflict Location & Event Data Project](https://acleddata.com/)
- [Our World in Data – Conflict Deaths Breakdown](https://ourworldindata.org/conflict-deaths-breakdown)
- [ArcGIS StoryMaps: Mapping Conflict](https://storymaps.arcgis.com/stories/b12adf1ee3a840b7a23d089050c3bd80)

---

## Data Proccessing

In order to create a network of similar conflicts a python code was used.  This script transforms raw conflict datasets from [ACLED – Armed Conflict Location & Event Data Project] into a unified JSON structure fit for a network graph for visualization, utilizing K-Nearest Neighbors to compute structural similarities between countries for a network graph. simultaneously, it aggregates 2024 mortality data, mapping flows from macro-regions to specific conflict typologies for a Sankey diagram. The final output normalizes these distinct data streams into a single file ready for frontend rendering.

## Technical Requirements

- Valid HTML5 & CSS3, tested via the [W3C Validator](https://validator.w3.org/)
- All visual styles defined in `style.css` (no inline styles)
- Fonts imported via Google Fonts
- Repository hosted on **GitHub** and deployed via **GitHub Pages**

---

## Deployment Instructions

1. **Clone this repository**
   ```bash
   git clone https://github.com/NMSW-datavis/visualizing-Conflict-and-Human-Suffering-through-Data.git
   cd visualizing-conflict
   ```

2. **Open the project**

   Simply open `index.html` in your browser, or use a local development server such as:
   ```bash
   npx serve
   ```

3. **Publish via GitHub Pages**

   1. Commit your changes
   2. Push to the main branch
   3. In GitHub repo settings, enable Pages → select branch main → / (root)

**The site is live at:** https://nmsw-datavis.github.io/Visualizing-Conflict-and-Human-Suffering-through-Data/

---

## Credits

**Project by:** MNSW

**Members:** Mohammed Yassin, Nahid Davoudi, Sebah Tewodros Tesfatsion, Wassim Fatnassi

**Institution:** Università di Genova

**Course:** Data Visualization – Academic Year 2025/2026

**Instructor:** Annalisa Barla

---

## License

This project is for educational and informational purposes only.

All visual and textual content © MNSW, 2025.

Datasets © respective sources under open data licenses.
