import geopandas as gpd
import shapely.validation as validation
import matplotlib.pyplot as plt
import utm
import argparse

# Function to check polygon validity
def check_validity(polygon):
    validity = validation.explain_validity(polygon)
    return validity == 'Valid Geometry', validity

# Calculate area in square meters (project to UTM for accurate area)
def calculate_area_utm(polygon, crs):
    centroid = polygon.centroid
    utm_info = utm.from_latlon(centroid.y, centroid.x)
    zone_number = utm_info[2]
    zone_letter = utm_info[3]
    utm_crs = f"+proj=utm +zone={zone_number} +{'north' if zone_letter >= 'N' else 'south'} +datum=WGS84 +units=m +no_defs"
    projected = gpd.GeoSeries([polygon], crs=crs).to_crs(utm_crs)
    return projected.area.iloc[0]

def main(input_path, output_path):
    # Load the shapefile
    polygons = gpd.read_file(input_path)

    # Analyze polygons
    results = []
    geoms = list(polygons.geometry)
    for i, geom_item in enumerate(geoms):
        is_valid, validity_reason = check_validity(geom_item)
        is_unique = geoms.count(geom_item) == 1
        intersections = sum(1 for other in geoms if geom_item.intersects(other) and geom_item != other)
        results.append({
            'polygon_index': i,
            'is_valid': is_valid,
            'validity_reason': validity_reason,
            'is_unique': is_unique,
            'intersections': intersections
        })

    # # Display results
    # for result in results:
    #     print(result)

    # Get indices of valid and unique polygons with no intersections
    valid_indices = [d['polygon_index'] for d in results if d['is_valid'] and d['is_unique'] and d['intersections'] == 0]

    # Filter the GeoDataFrame for valid, unique, non-intersecting polygons
    polygons_valid_clean = polygons.iloc[valid_indices]

    # Calculate area and filter by area
    polygons_valid_clean['area_sqm'] = polygons_valid_clean.geometry.apply(calculate_area_utm, crs=polygons.crs)
    polygons_clean = polygons_valid_clean[polygons_valid_clean['area_sqm'] > 100].reset_index(drop=True)

    # Save the cleaned polygons to a new shapefile
    polygons_clean.to_file(output_path, driver='ESRI Shapefile')

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Process shapefile polygons.')
    parser.add_argument('input_path', type=str, help='Path to the input shapefile')
    parser.add_argument('output_path', type=str, help='Path to save the output shapefile')
    args = parser.parse_args()

    main(args.input_path, args.output_path)
