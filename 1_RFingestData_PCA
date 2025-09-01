/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var cropPolygons = ee.FeatureCollection("projects/ee-vchhipa211/assets/pmfby/MP_Ashoknagar_cleaned");
/***** End of imports. If edited, may not auto-convert in the playground. *****/
var vi = require('users/vchhipa211/cropMapping:utils/indices')
var pca = require('users/vchhipa211/cropMapping:utils/PCA')
var st = ee.FeatureCollection('users/opengeolab4/Admin_boundary/india_districts_updated')

var gram =  cropPolygons.filter(ee.Filter.or(ee.Filter.inList('CropName', ['Chickpea'])))
var wheat =  cropPolygons.filter(ee.Filter.or(ee.Filter.inList('CropName', ['Wheat'])))
var mustard =  cropPolygons.filter(ee.Filter.or(ee.Filter.inList('CropName', ['Indian mustard'])))
var lentil =  cropPolygons.filter(ee.Filter.or(ee.Filter.inList('CropName', ['Lentil'])))
var others =  cropPolygons.filter(ee.Filter.or(ee.Filter.inList('CropName', ['Others'])))

var gram = gram.map(function (feature){
  return feature.set('class', 2);
}) 
 
var wheat = wheat.map(function (feature){
  return feature.set('class', 1);
}) 

var mustard = mustard.map(function (feature){
  return feature.set('class', 3);
}) 

var lentil = lentil.map(function (feature){
  return feature.set('class', 4);
}) 

var others = others.map(function (feature){
  return feature.set('class', 5);
}) 
print(wheat)

var table3 = st;

// Create biweekly NDVI composites
var start = ee.Date('2024-11-01');
var end = ee.Date('2025-04-01');
var roi = cropPolygons.geometry();
var district = ee.FeatureCollection('users/opengeolab4/Admin_boundary/india_districts_updated')
                  .filter(ee.Filter.eq('DISTRICT', 'ASHOKNAGAR'))
                  
// Load your existing feature collection (replace 'YOUR_FEATURE_COLLECTION' with your actual collection)
// var existingPolygons = ee.FeatureCollection('YOUR_FEATURE_COLLECTION');

// Function to calculate the centroid of each polygon
var getCentroid = function(feature) {
  var centroid = feature.geometry().centroid(); // Get the centroid of the polygon
  return feature.setGeometry(centroid); // Set the geometry of the feature to the centroid
};

// Map the function over the existing feature collection to create a new collection of centroids
var cropPolygonsCentroids = cropPolygons.map(getCentroid);
//---------------------------------------------------LULC MASK--------------------------------------------------------//                   

var lulc2020 = ee.ImageCollection("ESA/WorldCover/v100").first().clip(district);
var lulc2021 = ee.ImageCollection("ESA/WorldCover/v200").first().clip(district);
var lulc1 = lulc2020.updateMask(lulc2020.eq(40)).clip(district);
var lulc2 = lulc2021.updateMask(lulc2021.eq(40)).clip(district);
var agri_mask = ee.ImageCollection([lulc1,lulc2]).max().clip(district);

// Function to mask clouds using the SCL band
function maskClouds(image) {
  var scl = image.select('SCL'); // Select the SCL band
  var cloudMask = scl.eq(10) // Cloud (SCL value 10)
                  .or(scl.eq(8)) // Cirrus (SCL value 8)
                  .or(scl.eq(6)); // Cloud shadow (SCL value 6)
  return image.updateMask(cloudMask.not()); // Mask out clouds
}
// performs well at cloud Pixel Percentage<5 
function maskCloudAndShadowsSR(image) {
  var cloudProb = image.select('MSK_CLDPRB');
  var snowProb = image.select('MSK_SNWPRB');
  var cloud = cloudProb.lt(5);
  var snow = snowProb.lt(5);
  var scl = image.select('SCL'); 
  var shadow = scl.eq(3); // 3 = cloud shadow
  var cirrus = scl.eq(10); // 10 = cirrus
  // Cloud probability less than 5% or cloud shadow classification
  var mask = (cloud.and(snow)).and(cirrus.neq(1)).and(shadow.neq(1));
  return image.updateMask(mask).divide(10000)
      .select("B.*")
      .copyProperties(image, ["system:time_start","SENSING_ORBIT_NUMBER"]);
}
var maskcloud1 = function(image) {
var QA60 = image.select(['QA60']);
return image.updateMask(QA60.lt(1)).divide(10000);
};

// Load Sentinel-2 SRH and compute NDVI
var s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterBounds(district)
  .filterDate(start, end)
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20)).map(maskClouds);

/* File: s1_ard.js
Version: v1.2
Date: 2021-03-10
Authors: Mullissa A., Vollrath A., Braun, C., Slagter B., Balling J., Gou Y., Gorelick N.,  Reiche J.
Description: This script creates an analysis ready S1 image collection.
License: This code is distributed under the MIT License.

    Parameter:
        START_DATE: The earliest date to include images for (inclusive).
        END_DATE: The latest date to include images for (exclusive).
        POLARIZATION: The Sentinel-1 image polarization to select for processing.
            'VV' - selects the VV polarization.
            'VH' - selects the VH polarization.
            "VVVH' - selects both the VV and VH polarization for processing.
        ORBIT:  The orbits to include. (string: BOTH, ASCENDING or DESCENDING)
        GEOMETRY: The region to include imagery within.
                  The user can interactively draw a bounding box within the map window or define the edge coordinates.
        APPLY_BORDER_NOISE_CORRECTION: (Optional) true or false options to apply additional Border noise correction:
        APPLY_SPECKLE_FILTERING: (Optional) true or false options to apply speckle filter
        SPECKLE_FILTER: Type of speckle filtering to apply (String). If the APPLY_SPECKLE_FILTERING parameter is true then the selected speckle filter type will be used.
            'BOXCAR' - Applies a boxcar filter on each individual image in the collection
            'LEE' - Applies a Lee filter on each individual image in the collection based on [1]
            'GAMMA MAP' - Applies a Gamma maximum a-posterior speckle filter on each individual image in the collection based on [2] & [3]
            'REFINED LEE' - Applies the Refined Lee speckle filter on each individual image in the collection
                                  based on [4]
            'LEE SIGMA' - Applies the improved Lee sigma speckle filter on each individual image in the collection
                                  based on [5]
        SPECKLE_FILTER_FRAMEWORK: is the framework where filtering is applied (String). It can be 'MONO' or 'MULTI'. In the MONO case
                                  the filtering is applied to each image in the collection individually. Whereas, in the MULTI case,
                                  the Multitemporal Speckle filter is applied based on  [6] with any of the above mentioned speckle filters.
        SPECKLE_FILTER_KERNEL_SIZE: is the size of the filter spatial window applied in speckle filtering. It must be a positive odd integer.
        SPECKLE_FILTER_NR_OF_IMAGES: is the number of images to use in the multi-temporal speckle filter framework. All images are selected before the date of image to be filtered.
                                    However, if there are not enough images before it then images after the date are selected.
        TERRAIN_FLATTENING : (Optional) true or false option to apply Terrain correction based on [7] & [8]. 
        TERRAIN_FLATTENING_MODEL : model to use for radiometric terrain normalization (DIRECT, or VOLUME)
        DEM : digital elevation model (DEM) to use (as EE asset)
        TERRAIN_FLATTENING_ADDITIONAL_LAYOVER_SHADOW_BUFFER : additional buffer parameter for passive layover/shadow mask in meters
        FORMAT : the output format for the processed collection. this can be 'LINEAR' or 'DB'.
        CLIP_TO_ROI: (Optional) Clip the processed image to the region of interest.
        SAVE_ASSETS : (Optional) Exports the processed collection to an asset.
        
    Returns:
        An ee.ImageCollection with an analysis ready Sentinel 1 imagery with the specified polarization images and angle band.
        
References
  [1]  J. S. Lee, “Digital image enhancement and noise filtering by use of local statistics,” 
    IEEE Pattern Anal. Machine Intell., vol. PAMI-2, pp. 165–168, Mar. 1980. 
  [2]  A. Lopes, R. Touzi, and E. Nezry, “Adaptative speckle filters and scene heterogeneity,
    IEEE Trans. Geosci. Remote Sensing, vol. 28, pp. 992–1000, Nov. 1990 
  [3]  Lopes, A.; Nezry, E.; Touzi, R.; Laur, H.  Maximum a posteriori speckle filtering and first204order texture models in SAR images.  
    10th annual international symposium on geoscience205and remote sensing. Ieee, 1990, pp. 2409–2412.
  [4] J.-S. Lee, M.R. Grunes, G. De Grandi. Polarimetric SAR speckle filtering and its implication for classification
    IEEE Trans. Geosci. Remote Sens., 37 (5) (1999), pp. 2363-2373.
  [5] Lee, J.-S.; Wen, J.-H.; Ainsworth, T.L.; Chen, K.-S.; Chen, A.J. Improved sigma filter for speckle filtering of SAR imagery. 
    IEEE Trans. Geosci. Remote Sens. 2009, 47, 202–213.
  [6] S. Quegan and J. J. Yu, “Filtering of multichannel SAR images, IEEE Trans Geosci. Remote Sensing, vol. 39, Nov. 2001.
  [7] Vollrath, A., Mullissa, A., & Reiche, J. (2020). Angular-Based Radiometric Slope Correction for Sentinel-1 on Google Earth Engine. 
    Remote Sensing, 12(11), [1867]. https://doi.org/10.3390/rs12111867
  [8] Hoekman, D.H.;  Reiche, J.   Multi-model radiometric slope correction of SAR images of complex terrain using a two-stage semi-empirical approach.
    Remote Sensing of Environment2222015,156, 1–10.
**/

var wrapper = require('users/adugnagirma/gee_s1_ard:wrapper');
var helper = require('users/adugnagirma/gee_s1_ard:utilities');

//---------------------------------------------------------------------------//
// DEFINE PARAMETERS
//---------------------------------------------------------------------------//

var parameter = {//1. Data Selection
              START_DATE: start, 
              STOP_DATE: end,
              POLARIZATION:'VH',
              ORBIT : 'BOTH',
              GEOMETRY: district, //uncomment if interactively selecting a region of interest
              //2. Additional Border noise correction
              APPLY_ADDITIONAL_BORDER_NOISE_CORRECTION: true,
              //3.Speckle filter
              APPLY_SPECKLE_FILTERING: true,
              SPECKLE_FILTER_FRAMEWORK: 'MULTI',
              SPECKLE_FILTER: 'BOXCAR',
              SPECKLE_FILTER_KERNEL_SIZE: 3,
              SPECKLE_FILTER_NR_OF_IMAGES: 10,
              //4. Radiometric terrain normalization
              APPLY_TERRAIN_FLATTENING: true,
              DEM: ee.Image('USGS/SRTMGL1_003'),
              TERRAIN_FLATTENING_MODEL: 'VOLUME',
              TERRAIN_FLATTENING_ADDITIONAL_LAYOVER_SHADOW_BUFFER: 0,
              //5. Output
              FORMAT : 'DB',
              CLIP_TO_ROI: true,
              SAVE_ASSETS: false
}
      
//Preprocess the S1 collection
var sentinel_sar = wrapper.s1_preproc(parameter);

var s1 = sentinel_sar[0]
sentinel_sar = sentinel_sar[1]

//Convert format for export
if (parameter.FORMAT=='DB'){
  sentinel_sar = sentinel_sar.map(helper.lin_to_db);
}

print(sentinel_sar, {}, 'SAR')

//----------------------------------------------------------------//

// Function to apply Agrimask
var applyAgrimask = function(image) {
  var maskedImage = image.updateMask(agri_mask);
  return maskedImage;
};

var s2_agrimask = s2.map(applyAgrimask)
var s1_agrimask = sentinel_sar.map(applyAgrimask)
print(s2_agrimask, {}, 'S2')
print(s1_agrimask, {}, 'S1')

// Generate list of biweekly start dates
var nSteps = end.difference(start, 'day').divide(15).floor();
var indices = ee.List.sequence(0, nSteps.subtract(1));
var dates = indices.map(function(i) {
  return start.advance(ee.Number(i).multiply(15), 'day');
});

// // Create NDVI images with static band names - S2
// var ndviList = dates.map(function(date) {
//   date = ee.Date(date);
//   var endDate = date.advance(15, 'day');
//   var composite = s2_agrimask.filterDate(date, endDate).median();
//   var ndvi = composite.normalizedDifference(['B8', 'B4']).rename('NDVI');
//   // S2A12.map(indices.calculateIndices)
//   // var s2_indices = s2_agrimask.map(vi.calculateIndices)
//   var bandName = ee.String('NDVI_').cat(date.format('YYYYMMdd'));
//   return ndvi.rename([bandName]);
// });

// Build list of per-date multi-band images
var ndviList = dates.map(function(date) {
  date = ee.Date(date);
  var endDate = date.advance(15, 'day');

  // get median composite from your S2 collection (assumes s2_agrimask contains S2 and has required bands)
  var composite = s2_agrimask.filterDate(date, endDate).median();

  // 
  // Indices available - 'NDVI', 'GNDVI', 'NDRE', 'NDMI', 'LSWI', 'EVI', 'SAVI', 'LAI', 'GLI', 'GCI','RECI','RGR','SIPI','ARVI','RVI' 
  var allBands = vi.calculateIndices(composite);
  var allBandsSelect = allBands.select(['B1','B2','B3','B4','B5','B6','B7','B8','B8A','B9','B11','B12',
                                'NDVI', 'GNDVI', 'NDRE', 'NDMI', 'LSWI', 'EVI', 'SAVI'])
  // create a date-specific prefix for band names
  var prefix = ee.String(date.format('YYYYMMdd')).cat('_');

  // rename every band to include the date to avoid collisions when stacking
  var bandNames = allBandsSelect.bandNames();
  var renamed = bandNames.map(function(b) {
    return prefix.cat(ee.String(b));
  });

  return allBandsSelect.rename(renamed);
});


// Stack NDVI images into a single multiband image
var ndviStack = ee.ImageCollection.fromImages(ndviList).toBands().clip(district);
print(ndviStack)

// Create NDVI images with static band names - S1
var vhList = dates.map(function(date) {
  date = ee.Date(date);
  var endDate = date.advance(15, 'day');
  var composite = s1_agrimask.filterDate(date, endDate).median();
  var vh = composite.select('VH')
  var bandName = ee.String('VH_').cat(date.format('YYYYMMdd'));
  return vh.rename([bandName]);
});

// Stack VH images into a single multiband image
var vhStack = ee.ImageCollection.fromImages(vhList).toBands().clip(district);
print(vhStack)

var allStack = ndviStack.addBands(vhStack)
print(allStack)

// Functions
//************************************************************************** 
// Function to Normalize Image
// Pixel Values should be between 0 and 1
// Formula is (x - xmin) / (xmax - xmin)
//************************************************************************** 
function normalize(image){
  var bandNames = image.bandNames();
  // Compute min and max of the image
  var minDict = image.reduceRegion({
    reducer: ee.Reducer.min(),
    geometry: cropPolygons.geometry(),
    scale: 10,
    maxPixels: 1e9,
    bestEffort: true,
    tileScale: 16
  });
  var maxDict = image.reduceRegion({
    reducer: ee.Reducer.max(),
    geometry: cropPolygons.geometry(),
    scale: 10,
    maxPixels: 1e9,
    bestEffort: true,
    tileScale: 16
  });
  var mins = ee.Image.constant(minDict.values(bandNames));
  var maxs = ee.Image.constant(maxDict.values(bandNames));

  var normalized = image.subtract(mins).divide(maxs.subtract(mins))
  return normalized
}

//************************************************************************** 
// Function to Standardize Image
// (Mean Centered Imagery with Unit Standard Deviation)
// https://365datascience.com/tutorials/statistics-tutorials/standardization/
//************************************************************************** 
function standardize(image){
  var bandNames = image.bandNames();
  // Mean center the data to enable a faster covariance reducer
  // and an SD stretch of the principal components.
  var meanDict = image.reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: geometry,
    scale: 10,
    maxPixels: 1e9,
    bestEffort: true,
    tileScale: 16
  });
  var means = ee.Image.constant(meanDict.values(bandNames));
  var centered = image.subtract(means)
  
  var stdDevDict = image.reduceRegion({
    reducer: ee.Reducer.stdDev(),
    geometry: geometry,
    scale: 10,
    maxPixels: 1e9,
    bestEffort: true,
    tileScale: 16
  });
  var stddevs = ee.Image.constant(stdDevDict.values(bandNames));

  var standardized = centered.divide(stddevs);
   
  return standardized
}


//---------------------adding stacked NDVI to layer stack of data to be used for classification---------------------//

var stacked_composite = allStack.clip(district);
var stacked_composite_normal = normalize(stacked_composite)

var composite = stacked_composite_normal
print(composite)
// Export.image.toAsset({image:composite,
// description:'Optical_stacked_Ashoknagar_2024_25',
// region:district,
// scale:10})

// /*
//-----------------------------------------------------------------------------//
// RUN TILL HERE!! ONCE COMPOSITE IS GENERATED, LOAD THE ASSET TO RUN PCA
// RUN BELOW CODE -|
//-----------------------------------------------------------------------------//
// // Run the PCA function
// var pca_composite = pca.PCA(composite)
// // print(pca)

// // Extract the properties of the pca image
// var variance = pca_composite.toDictionary()
// // print('Variance of Principal Components', variance)

// // As you see from the printed results, ~97% of the variance
// // from the original image is captured in the first 3 principal components
// // We select those and discard others
// var pca_composite_selected = pca_composite.select(['pc1', 'pc2', 'pc3'])
// // print('First 3 PCA Bands', pca_composite_selected);

// // PCA computation is expensive and can time out when displaying on the map
// // Export the results and import them back
// Export.image.toAsset({
//   image: pca_composite_selected,
//   description: 'Principal_Components_Image',
//   assetId: 'projects/ee-vchhipa211/assets/pmfby/ashoknagar_rabi_2024_25_pca_2',
//   scale: scale,
//   maxPixels: 1e10})
// Once the export finishes, import the asset and display
// var pcaImported = ee.Image('')
// var pcaVisParams = {bands: ['pc1', 'pc2', 'pc3'], min: -2, max: 2};

// Map.addLayer(pcaImported, pcaVisParams, 'Principal Components');

// */

