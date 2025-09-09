/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var gt = ee.FeatureCollection("projects/ee-vchhipa211/assets/pmfby/MP_Ashoknagar_cleaned");
/***** End of imports. If edited, may not auto-convert in the playground. *****/
var st = ee.FeatureCollection('users/opengeolab4/Admin_boundary/india_districts_updated')
var district = ee.FeatureCollection('users/opengeolab4/Admin_boundary/india_districts_updated')
                  .filter(ee.Filter.eq('DISTRICT', 'ASHOKNAGAR'))


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
print(wheat)
// print(GT_Gram_024_25)


var table3 = st;

var district = 'ASHOKNAGAR' ;
var State = ee.FeatureCollection(table3).filter(ee.Filter.or(ee.Filter.eq('STATE_NAME', 'MADHYA PRADESH'))); 
var dist = ee.FeatureCollection(table3).filter(ee.Filter.or(ee.Filter.eq('DISTRICT', district))); 

// var dist = table.filter(ee.Filter.inList('DISTRICT', district));
var styling = { color: 'black', fillColor:'#ffffff00' }

var STATE_NAME = 'MADHYA PRADESH';

var year = 2024
var year1 = 2025

//################################################## Classification ############################################################//

//------------------------------------Training Dataset------------------------------------------------//

var gt1 = wheat.merge(mustard).merge(lentil).merge(gram).merge(other).merge(others);

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
//************************************************************************** 
// -------------------------------------FILL IN THE OPTIMAL PARAMETERS BELOW AS READ FROM THE CSV---------------------------
//************************************************************************** 
var optimalNumTrees = 140
var optimalBagFraction = 0.5

var optimalModel = ee.Classifier.smileRandomForest({
  numberOfTrees: optimalNumTrees,
  bagFraction: optimalBagFraction
}).train({
  features: training,  
  classProperty: 'class',
  inputProperties: pca_image.bandNames()
});

var classified = pca_image.classify(optimalModel);
var classified1 = classified.clip(district)

// Get information about the trained classifier.
print('Results of trained classifier', optimalModel.explain());
var dict = optimalModel.explain();
//print('Explain:',dict);

var importance = ee.Dictionary(optimalModel.explain().get('importance'));
print(importance,{},'Variable importance')

// Calculate relative importance
var sum = importance.values().reduce(ee.Reducer.sum())

var relativeImportance = importance.map(function(key, val) {
  return (ee.Number(val).multiply(100)).divide(sum)
  })
print(relativeImportance)

// Create a FeatureCollection so we can chart it
var importanceFc = ee.FeatureCollection([
  ee.Feature(null, relativeImportance)
])

var chart = ui.Chart.feature.byProperty({
  features: importanceFc
}).setOptions({
      title: 'Feature Importance',
      vAxis: {title: 'Importance'},
      hAxis: {title: 'Feature'},
      legend: {position: 'none'}
  })
print(chart)
// var classified1 = classified.updateMask(classified.eq(1));

var RabiImage = ee.Image(0).where(classified1.eq(1),1)
                          // .where(classified1.eq(2),2)
                          // .where(classified1.eq(3),3)
                          // .where(classified1.eq(4),4)
                          // .where(classified1.eq(5),5)
                             
                        
// Map.addLayer(classified1.selfMask(),
//             {min: 0, max:1 , palette: ['red']},
//             'classification')
          
var Palette = [
  'aec3d4', // water
  '152106',  // forest
  '6a2325',   // shrub, grass
  '111149', // wetlands
  'cdb33b', // croplands
  'cc0013', // urban
  '33280d', // crop mosaic
  'd7cdcc', // snow and ice
  'f7e084', // barren
  '6f6f6f'  // tundra

];

var areaImage = ee.Image.pixelArea().addBands(classified1);
var areas = areaImage.reduceRegion({
  reducer: ee.Reducer.sum().group({
    groupField: 1,
    groupName: 'class',
  }),
  geometry: dist,
  scale: 10,
  maxPixels: 1e13,
  //tileScale: 8
});

// Print the area calculations.
// print('##### CLASS AREA SQ. METERS #####');
// print(areas);

var calculateClassArea = function(feature) {
    var areas = ee.Image.pixelArea().addBands(classified1)
    .reduceRegion({
      reducer: ee.Reducer.sum().group({
      groupField: 1,
      groupName: 'class',
    }),
    geometry: feature.geometry(),
    scale: 10,
    maxPixels: 1e13
    })
 
    var classAreas = ee.List(areas.get('groups'))
    var classAreaLists = classAreas.map(function(item) {
      var areaDict = ee.Dictionary(item)
      var classNumber = ee.Number(
        areaDict.get('class')).format()
      var area = ee.Number(
        areaDict.get('sum'))
      return ee.List([classNumber, area])
    })
 
    var result = ee.Dictionary(classAreaLists.flatten())
    var taluk = feature.get('DISTRICT')
    return ee.Feature(
      feature.geometry(),
      result.set('DISTRICT', taluk))
}
 
var districtAreas = district.map(calculateClassArea);

//*************************************************************************************************//

var bandInfo = {
  'Oct1': {v: 1, f: 'Oct1'},
  'Oct2': {v: 2, f: 'Oct2'},
  'Nov1': {v: 3, f: 'Nov1'},
  'Nov2': {v: 4, f: 'Nov2'},
  'Dec1': {v: 5, f: 'Dec1'},
  'Dec2': {v: 6, f: 'Dec2'},
  'Jan1': {v: 7, f: 'Jan1'},
  'Jan2': {v: 8, f: 'Jan2'},
  'Feb1': {v: 9, f: 'Feb1'},
  'Feb2': {v: 10, f: 'Feb2'},
  'Mar1': {v: 11, f: 'Mar1'},
  'Mar2': {v: 12, f: 'Mar2'},
};


var xPropVals = [];    // List to codify x-axis band names as values.
var xPropLabels = [];  // Holds dictionaries that label codified x-axis values.
for (var key in bandInfo) {
  xPropVals.push(bandInfo[key].v);
  xPropLabels.push(bandInfo[key]);
}
var regionsBand =
    gt1
        .reduceToImage({properties: ['class'], reducer: ee.Reducer.first()})
         .rename('class');

var ndviClass = stacked_ndvi.addBands(regionsBand);
       // print(sentinelSrClass);
var chart = ui.Chart.image
                .byClass({
                  image: ndviClass,
                  classBand: 'class',
                  region: gt1,
                  reducer: ee.Reducer.median(),
                  scale: 10,
                  classLabels: ['Wheat','mustard','Lentil','Gram','Other crop','Other'],
                  xLabels: xPropVals
                })
                .setChartType('ScatterChart')
                .setOptions({
                  title: 'Spectral Signatures',
                 hAxis: {
                    title: 'Fortnight',
                    titleTextStyle: {italic: false, bold: true},
                    //viewWindow: {min: bands[0], max: bands[11]},
                    ticks: xPropLabels
                  },
                  vAxis: {
                    title: 'NDVI',
                    titleTextStyle: {italic: false, bold: true},
                    viewWindow: {min: 0, max: 1},
                  },
                  colors: ['red', 'blue', 'grey', 'green', 'yellow', 'magenta', 'cyan'],
                  pointSize: 0,
                  lineSize: 2,
                  curveType: 'function'
                });
// print(chart);     

// var MP_Rabi_2024 = ee.Image(0).where(ndviClass.eq(1),1)
   

/************************* Eliminater ****************************/

var connectedPixelThreshold = 8;
var connections = RabiImage.connectedPixelCount(25);
var Eliminated = RabiImage.updateMask(connections.gt(connectedPixelThreshold));

// Remove pixels fron non-crop aoi(s)
// var MP_Rabi_2024 = Eliminated.clip(districtRefined);
var MP_Rabi_2024 = Eliminated

//############################################## Visualization ###############################################//

Map.addLayer(MP_Rabi_2024.selfMask(), {min:1,max:5, palette:['Green','orange','Pink', 'blue','red']}, 'MP_Rabi_2024',1);
// Map.addLayer(transplant_optical.selfMask(), {min:1,max:1, palette:['green']}, 'transplant_signature_optical',0);
Map.addLayer(district.style(styling),{},'Boundary');
// Map.addLayer(image.selfMask(), {min:1,max:1, palette:['Green','Black']}, 'MP_wheat_2023',0);
////////////////////////////Polygon GT Display///////////////////////////////////////////////////
Map.addLayer(mustard.style({color: 'Blue', fillColor: '#ffffff00'}),{}, 'GT_Mustard25',0);
Map.addLayer(wheat.style({color: 'Green', fillColor: '#ffffff00'}), {}, 'GT_Wheat25',0);
Map.addLayer(lentil.style({color: 'Yellow', fillColor: '#ffffff00'}), {}, 'GT_Lentil25',0);
Map.addLayer(gram.style({color: 'Pink', fillColor: '#ffffff00'}), {}, 'GT_Gram25',0);
Map.addLayer(others.style({color: 'Black', fillColor: '#ffffff00'}), {}, 'GT_Other25',0);
//############################################### Total Area ##############################################//

// var areaImage = MP_Rabi_2024.selfMask().multiply(ee.Image.pixelArea());

// var area = areaImage.reduceRegion({
//   reducer: ee.Reducer.sum(),
//   geometry: dist.geometry(),
//   scale: 10,
//   maxPixels: 1e10,
//   tileScale:16
// });

// var RabiAreaHa = ee.Number(area.get('constant')).divide(1e4).round();
// print(RabiAreaHa, 'rabi Area in hectares');

/************************* Area statistics ****************************/
var WheatRaster = ee.Image(0).clip(district).where(MP_Rabi_2024.eq(1),1);
// var mustardRaster = ee.Image(0).clip(dist).where(MP_Rabi_2024.eq(2),1);
// var GramRaster = ee.Image(0).clip(dist).where(MP_Rabi_2024.eq(1),1);
// var LentilRaster = ee.Image(0).clip(dist).where(MP_Rabi_2024.eq(4),1);

var areaWheat = WheatRaster.selfMask().multiply(ee.Image.pixelArea());

var WheatArea = areaWheat.reduceRegion({
  reducer: ee.Reducer.sum(),
  geometry: dist.geometry(),
  scale: 10,
  maxPixels: 1e10
});

var WheatAreaHa = ee.Number(WheatArea.get('constant')).divide(1e4).round();
Export.table.toDrive({
      collection:WheatAreaHa,
  description:'Wheat_area',
  folder:'cropMapping',
  // fileNamePrefix:,
  // fileFormat:,
  // selectors:,
  // maxVertices:,
  // priority:,
})
// print(WheatAreaHa, 'Wheat Area in hectares');
///*************************Mustard Area****************************///
// var areamustard = mustardRaster.selfMask().multiply(ee.Image.pixelArea());

// var mustardArea = areamustard.reduceRegion({
//   reducer: ee.Reducer.sum(),
//   geometry: dist.geometry(),
//   scale: 10,
//   maxPixels: 1e10
// });

// var mustardAreaHa = ee.Number(mustardArea.get('constant')).divide(1e4).round();
// print(mustardAreaHa, 'mustard Area in hectares');

// var areaGram = GramRaster.selfMask().multiply(ee.Image.pixelArea());

// var GramArea = areaGram.reduceRegion({
//   reducer: ee.Reducer.sum(),
//   geometry: dist.geometry(),
//   scale: 10,
//   maxPixels: 1e10,
//   tileScale:8
// });
///*************************Gram Area****************************///
// var GramAreaHa = ee.Number(GramArea.get('constant')).divide(1e4).round();
// print(GramAreaHa, 'Gram Area in hectares');
// var feature = ee.Feature(null, {'Area': WheatAreaHa})
// Export.table.toDrive({collection:ee.FeatureCollection([feature]), description:district+'wheatarea', folder:'cropMapping'})
// Export image to google drive
// Export.image.toDrive({
//   image:GramRaster,
//   scale: 10,
//   crs: 'EPSG:4326',
//   folder: 'MP_RABI_F1_2024_25',
//   description:'SAGAR_25_Gram',
//   region:dist,
//   maxPixels:10e10
// });

///*************************Lentil Area****************************///
// var LentilArea = LentilArea.reduceRegion({
//   reducer: ee.Reducer.sum(),
//   geometry: dist.geometry(),
//   scale: 10,
//   maxPixels: 1e10
// });

// var LentilAreaHa = ee.Number(LentilArea.get('constant')).divide(1e4).round();
// print(LentilAreaHa, 'Lentil Area in hectares');

// Export image to google drive
// Export.image.toDrive({
//   image:LentilRaster,
//   scale: 10,
//   crs: 'EPSG:4326',
//   folder: 'MP_RABI_F1_2024_25',
//   description:'SAGAR_Classification_f1',
//   region:dist,
//   maxPixels:10e10
// });
print(MP_Rabi_2024,{},'Classified image')

// ************************** Error matrix *****************************
// Import the error matrix module
var errorMatrixModule = require('users/vchhipa211/pmfby:cropMapping_errorMatrix'); // Replace with the actual path to your module

// Load classified image and reference data
var classifiedImage = MP_Rabi_2024;
var referenceData = ee.FeatureCollection(testingPolygons);

// Call the function to generate the error matrix and accuracy metrics
var results = errorMatrixModule.generateErrorMatrix(
  classifiedImage,
  referenceData,
  'class', // Reference class property
  'constant', // Classified image property
  10 // Scale
);

// Print the results
// print('Error Matrix:', results.errorMatrix);
print('Overall Accuracy:', results.overallAccuracy);
print('User Accuracy:', results.userAccuracy);
print('Producer Accuracy:', results.producerAccuracy);
print('Kappa Statistic:', results.kappa);

// /************************* Export ****************************/
// Export.image.toAsset({
//   image:MP_Rabi_2024,
//   description:'cropMapping_RF_' + district,
// //  assetId:,
// //  pyramidingPolicy:,
// //  dimensions:,
// //  region:,
//   scale:10,
//   maxPixels:1e13
// })
Export.image.toDrive({
  image:MP_Rabi_2024,
  scale: 10,
  folder : 'cropMapping',
  description:district+'_'+year+'_Rabi',
  region:dist,
  crs: 'EPSG:4326',
  maxPixels:10e10
});