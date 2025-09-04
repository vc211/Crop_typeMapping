*	Polygon quality checks (polygon_cleaning.py). The following polygon quality checks are performed :-

&nbsp;&nbsp;-	Validity check
&nbsp;&nbsp;- Uniqueness check
&nbsp;&nbsp;- Intersection count (polygons with no intersections are only valid)
&nbsp;&nbsp;- Visualization of invalid polygons
&nbsp;&nbsp;- Area > 100 m2 taken as valid

For running the code in command line/terminal - python .\polygon_cleaning.py input_shapefile.shp output_shapefile.shp
*	Cleaned polygons are then to be uploaded as an asset in Google Earth Engine which will then be used as ground truth/ training and testing datasets.
*	Run the code ‘1_RFingestData_PCA’ to get a 15-day composite image including all bands of Sentinel 2 and VH band of Sentinel 1. Additionally, vegetation indices are added. The selection of indices to be added can be adjusted at line 244.
*	Next, run ‘2_hyperparameterTuning’ to get the classifier with number of trees and bagfraction as optimal for random forest algorithm. The parameters will be exported to a csv which can be used in the following code.
*	Finally, 3_classification_optimal is to be run to get the final classified image
