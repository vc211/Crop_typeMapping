/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var gt = ee.FeatureCollection("projects/ee-vchhipa211/assets/pmfby/MP_Ashoknagar_cleaned");
/***** End of imports. If edited, may not auto-convert in the playground. *****/
var gram =  gt.filter(ee.Filter.or(ee.Filter.inList('CropName', ['Chickpea'])))
var wheat =  gt.filter(ee.Filter.or(ee.Filter.inList('CropName', ['Wheat'])))
var mustard =  gt.filter(ee.Filter.or(ee.Filter.inList('CropName', ['Indian mustard'])))
var lentil =  gt.filter(ee.Filter.or(ee.Filter.inList('CropName', ['Lentil'])))
var others =  gt.filter(ee.Filter.or(ee.Filter.inList('CropName', ['Others'])))

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


//################################################## Classification ############################################################//

//------------------------------------Training Dataset------------------------------------------------//

var gt1 = wheat.merge(mustard).merge(lentil).merge(gram).merge(others);

// Add a random value to each feature
var withRandom = gt1.randomColumn();

// 70% training, 30% testing
var split = 0.7
var trainingPolygons = withRandom.filter(ee.Filter.lt('random', split));
var testingPolygons = withRandom.filter(ee.Filter.gte('random', split));
//------------------------------------------ Training --------------------------------------------------//
var training = pca_image.sampleRegions({
  collection: trainingPolygons,
  properties: ['class'],
  scale: 10
});

// ------------------------------------------Hyper parameter tuned Classifier-----------------------------//
//************************************************************************** 
// Hyperparameter Tuning
//************************************************************************** 

var test = pca_image.sampleRegions({
  collection: testingPolygons,
  properties: ['class'],
  scale: 10,
  tileScale: 16
});
// Tuning Multiple Parameters
// We can tune many parameters together using nested map() functions
// Let's tune 2 parameters numTrees and bagFraction 
var numTreesList = ee.List.sequence(10, 300, 10);
var bagFractionList = ee.List.sequence(0.1, 0.9, 0.1);

var accuracies = numTreesList.map(function(numTrees) {
  return bagFractionList.map(function(bagFraction) {
     var classifier = ee.Classifier.smileRandomForest({
       numberOfTrees: numTrees,
       bagFraction: bagFraction
     })
      .train({
        features: training,
        classProperty: 'class',
        inputProperties: pca_image.bandNames()
      });

    // Here we are classifying a table instead of an image
    // Classifiers work on both images and tables
    var accuracy = test
      .classify(classifier)
      .errorMatrix('class', 'classification')
      .accuracy();
    return ee.Feature(null, {'accuracy': accuracy,
      'numberOfTrees': numTrees,
      'bagFraction': bagFraction});
  });
}).flatten();
var resultFc = ee.FeatureCollection(accuracies);

// Export the result as CSV
Export.table.toDrive({
  collection: resultFc,
  description: 'Multiple_Parameter_Tuning_Results',
  folder: 'cropMapping',
  fileNamePrefix: 'numtrees_bagfraction',
  fileFormat: 'CSV'});

// Alternatively we can automatically pick the parameters
// that result in the highest accuracy
var resultFcSorted = resultFc.sort('accuracy', false);
var highestAccuracyFeature = resultFcSorted.first();
var highestAccuracy = highestAccuracyFeature.getNumber('accuracy');
var optimalNumTrees = highestAccuracyFeature.getNumber('numberOfTrees');
var optimalBagFraction = highestAccuracyFeature.getNumber('bagFraction');
// print(resultFc)
// // Use the optimal parameters in a model and perform final classification
// var optimalModel = ee.Classifier.smileRandomForest({
//   numberOfTrees: optimalNumTrees,
//   bagFraction: optimalBagFraction
// }).train({
//   features: training,  
//   classProperty: 'class',
//   inputProperties: stacked_composite.bandNames()
// });
// var finalClassification = stacked_composite.classify(optimalModel);