import pandas as pd
import matplotlib.pyplot as plt

# --- Load the data ---
df = pd.read_csv("number_of_reported_civilian_fatalities_by_country-year_as-of-17Oct2025_0.csv")

# --- Check column names just in case ---
print("Columns:", df.columns.tolist())

# --- Normalize column names
df.columns = [c.strip().capitalize() for c in df.columns]

# --- Aggregate fatalities by country and year ---
fatalities_by_country_year = df.groupby(["Country", "Year"])["Fatalities"].sum().reset_index()

# --- Select the countries of interest ---
countries = ["Russia", "Ukraine"]

# --- Create subplots ---
plt.figure(figsize=(12, 5))

for i, country in enumerate(countries, start=1):
    plt.subplot(1, 2, i)
    country_data = fatalities_by_country_year[fatalities_by_country_year["Country"] == country]

    plt.bar(country_data["Year"], country_data["Fatalities"], color="#d9534f", edgecolor="black", alpha=0.8)
    plt.title(f"Civilian Fatalities in {country} (2017–2025)", fontsize=13, fontweight="bold")
    plt.xlabel("Year")
    plt.ylabel("Fatalities" if i == 1 else "")
    plt.grid(axis="y", linestyle="--", alpha=0.5)

plt.tight_layout()
plt.show()
