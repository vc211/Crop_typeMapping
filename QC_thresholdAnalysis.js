// Function to Calculate Thresholds (mean ± stdDev)
var calculateMonthlyThresholds = function(variable, data) {
  // Sample NDVI values at ground truth points
  var sampled = data.reduceRegions({
    collection: riceGT,
    reducer: ee.Reducer.mean(),
    scale: 20
  });

  // Aggregate statistics from sampled NDVI
  var stats = sampled.aggregate_stats(variable);
  var meanNDVI = ee.Number(stats.get('mean'));
  var stdDevNDVI = ee.Number(stats.get('sample_sd'));

  // Define thresholds (mean ± stdDev)
  var lowerThreshold = meanNDVI.subtract(stdDevNDVI.multiply(1.0)); // Adjust the multiplier as needed
  var upperThreshold = meanNDVI.add(stdDevNDVI.multiply(1.0));

  return ee.Dictionary({
    lowerThreshold: lowerThreshold,
    upperThreshold: upperThreshold
  });
};

// Function to Apply Threshold at Pixel Level
var applyThresholdsAtPixelLevel = function(image) {
  // Calculate thresholds for the current image
  var thresholds = calculateMonthlyThresholds('mean', image);

  // Extract the thresholds
  var lowerThreshold = ee.Number(thresholds.get('lowerThreshold'));
  var upperThreshold = ee.Number(thresholds.get('upperThreshold'));

  // Mask NDVI values based on thresholds: Only outliers will remain
  var maskedImage = image.mask(
    image.gte(upperThreshold).or(image.lte(lowerThreshold))
  );

  return maskedImage;
};

// Apply the rice mask to the merged NDVI collection
var ndvi = mergedCollection.select('NDVI').map(function(image) {
  return image.updateMask(ricemask.eq(1));
});
Map.addLayer(ndvi,{},'rice_maskndvi')
// Apply thresholds to each image in the NDVI collection
var qc_rice = ndvi.map(function(image) {
  return applyThresholdsAtPixelLevel(image);
});
// Apply the mask to each image in the QC NDVI collection
var qcmask = qc_rice.map(function(image) {
  return image.gte(0);  // Mask negative values in each image
});

// Visualize the first quality-controlled NDVI composite
//Map.addLayer(qcmask, {min: 0, max: 1, palette: ['blue', 'white', 'green']}, 'QC NDVI Composite');

Map.addLayer(qcmask.sum(), {min: 0, max: 8, palette: ['blue', 'white', 'green','red','yellow','orange',
                                                  'pink','black','brown']}, 'QC NDVI Composite');




// class gte 6 of qcmask.sum() arre non-rice Qualick check
Map.addLayer(qcmask.sum().gte(6), {min: 0, max: 1, palette: ['White', 'Brown']}, 'QC NDVI Composite_non rice');


print('Quality-controlled NDVI composites generated');


Map.addLayer(riceGT,{},'Rice')


