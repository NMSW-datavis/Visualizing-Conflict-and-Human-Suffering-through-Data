import pandas as pd
import matplotlib.pyplot as plt

# --- Load the data ---
df = pd.read_csv("number_of_reported_civilian_fatalities_by_country-year_as-of-17Oct2025_0.csv")

# --- Aggregate fatalities by country and year (in case there are duplicates) ---
fatalities_by_country_year = df.groupby(["country", "Year"])["Fatalities"].sum().reset_index()

# --- Select a country (example: Afghanistan) ---
country = "Afghanistan"
country_data = fatalities_by_country_year[fatalities_by_country_year["country"] == country]

# --- Create the bar chart ---
plt.figure(figsize=(8, 5))
plt.bar(country_data["Year"], country_data["Fatalities"], color="#d9534f", edgecolor="black", alpha=0.8)

# --- Title and labels ---
plt.title(f"Civilian Fatalities in {country} (2017–2025)", fontsize=14, fontweight="bold")
plt.xlabel("Year")
plt.ylabel("Number of Reported Civilian Fatalities")
plt.grid(axis="y", linestyle="--", alpha=0.5)
plt.tight_layout()

# --- Save the image ---
plt.savefig("charts/histogram-pyramid.png", dpi=300)
plt.show()
