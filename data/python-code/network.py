import pandas as pd
import json
import numpy as np
from sklearn.neighbors import NearestNeighbors
from sklearn.preprocessing import StandardScaler

# --- CONFIGURATION ---

FILE_ACLED = '../acled_conflict_index_fullyear2024_allcolumns-2.csv'

# 'data/acled_conflict_index_fullyear2024_allcolumns-2.csv'
FILE_DEATHS = '../cumulative-deaths-in-armed-conflicts-by-country-region-and-type.csv'
OUTPUT_FILE = '../net_data.json'
def process_network(file_path):
    """
    Generates the 'Structural Twins' network data.
    Connects countries based on mathematical similarity of their conflict profile.
    """
    print(f"Loading ACLED data from {file_path}...")
    df = pd.read_csv(file_path)

    # 1. Filter: Keep only significant conflict levels to avoid a "hairball" graph
    # We focus on the actors that drive the narrative.
    mask = df['Index Level'].isin(['Extreme', 'High', 'Turbulent'])
    df_net = df[mask].copy()

    # 2. Features for Similarity
    # We use the 'Scaled' columns provided by ACLED to ensure fair comparison
    features = ['Deadliness Value Scaled', 'Diffusion Value Scaled', 'Fragmentation Value Scaled']
    
    # Drop any rows that might have missing data in these key columns
    df_net = df_net.dropna(subset=features)

    # 3. Calculate Similarity (The "Twins" Logic)
    # We standardise the data (Z-score) to ensure one metric doesn't dominate
    scaler = StandardScaler()
    X = scaler.fit_transform(df_net[features])

    # Find the 2 nearest neighbors for each country (k=3 because the first match is always itself)
    nbrs = NearestNeighbors(n_neighbors=3, algorithm='ball_tree').fit(X)
    distances, indices = nbrs.kneighbors(X)

    # 4. Build Nodes
    nodes = []
    # Helper to map index to ID later
    idx_to_id = {} 
    
    for idx, row in df_net.reset_index().iterrows():
        country = row['Country']
        idx_to_id[idx] = country
        
        nodes.append({
            "id": country,
            "size": row['Deadliness Value'], # Raw value for visual sizing
            "level": row['Index Level']
            # Note: We will handle coloring in the JS based on region mapping
        })

    # 5. Build Links
    links = []
    existing_pairs = set()

    for i in range(len(df_net)):
        source = idx_to_id[i]
        
        # Iterate through found neighbors (skipping index 0, which is self)
        for n_idx in indices[i][1:]:
            target = idx_to_id[n_idx]
            
            # Create a sorted key to prevent duplicate edges (A->B and B->A)
            # Use this if you want an undirected graph. 
            # For directed "similarity", you can remove the sorting.
            pair_key = tuple(sorted([source, target]))
            
            if pair_key not in existing_pairs:
                links.append({"source": source, "target": target})
                existing_pairs.add(pair_key)

    return {"nodes": nodes, "links": links}

def process_sankey(file_path):
    """
    Generates the 'Pipeline of Tragedy' flow data.
    Flow: Region -> Conflict Type -> Global Total
    """
    print(f"Loading Cumulative Deaths data from {file_path}...")
    df = pd.read_csv(file_path)

    # 1. Filter for the latest year (2024)
    df = df[df['Year'] == 2024].copy()

    # 2. Filter for Macro Regions
    # The 'Entity' column mixes Countries and Regions. Regions usually have no Code.
    # We explicitly select the macro regions we want to visualize.
    regions = ['Africa', 'Americas', 'Asia and Oceania', 'Europe', 'Middle East']
    df_regions = df[df['Entity'].isin(regions)].copy()

    # 3. setup Nodes and Links
    nodes = []
    links = []
    node_map = {} # Name -> Index

    def get_node_index(name):
        if name not in node_map:
            node_map[name] = len(nodes)
            nodes.append({"name": name})
        return node_map[name]

    # Mapping CSV columns to readable Node Names
    type_map = {
        'Cumulative deaths in intrastate conflicts': 'Intrastate War',
        'Cumulative deaths from one-sided violence': 'One-sided Violence',
        'Cumulative deaths in non-state conflicts': 'Non-state Conflict',
        'Cumulative deaths in interstate conflicts': 'Interstate War'
    }

    # 4. Step 1: Region -> Conflict Type
    # We aggregate total deaths per type to create the final step later
    type_totals = {v: 0 for v in type_map.values()}

    for _, row in df_regions.iterrows():
        region_name = row['Entity']
        # Clean up name if needed (e.g., "Asia and Oceania" -> "Asia")
        if region_name == "Asia and Oceania": region_name = "Asia"
        
        source_idx = get_node_index(region_name)

        for col, label in type_map.items():
            val = row[col]
            if pd.notna(val) and val > 0:
                target_idx = get_node_index(label)
                links.append({
                    "source": source_idx,
                    "target": target_idx,
                    "value": int(val)
                })
                type_totals[label] += int(val)

    # 5. Step 2: Conflict Type -> Global Total
    final_node = "Cumulative Human Loss"
    final_idx = get_node_index(final_node)

    for label, total in type_totals.items():
        if total > 0:
            source_idx = get_node_index(label)
            links.append({
                "source": source_idx,
                "target": final_idx,
                "value": int(total)
            })

    return {"nodes": nodes, "links": links}

# --- MAIN EXECUTION ---
if __name__ == "__main__":
    try:
        network_data = process_network(FILE_ACLED)
        sankey_data = process_sankey(FILE_DEATHS)

        final_output = {
            "network": network_data,
            "sankey": sankey_data
        }

        # Dump to JSON
        with open(OUTPUT_FILE, 'w') as f:
            json.dump(final_output, f, indent=2)

        print(f"\nSuccess! Data processed and saved to '{OUTPUT_FILE}'.")
        print("Copy the content of this file into your architecture.js variables.")

    except FileNotFoundError as e:
        print(f"\nError: {e}")
        print("Please ensure the CSV files are in the same directory as this script.")