https://code.earthengine.google.com/?scriptPath=users%2Flucassantarosa%2FSBSR%3ASentinel2%2FCreate%20GRID

//import geometry to generate the GRID

var drawingTools = Map.drawingTools();
 
var map = ui.Map();
// Prints true since drawingTools() adds drawing tools to the map.
// pixelLonLat returns an image with each pixel labeled with longitude and
// latitude values.
var lonLat = ee.Image.pixelLonLat();

// Select the longitude and latitude bands, multiply by a large number then
// truncate them to integers.
var lonGrid = lonLat
  .select('longitude')
  .multiply(10000000)
  .toInt();

var latGrid = lonLat
  .select('latitude')
  .multiply(10000000)
  .toInt();

// To produce the grid, multiply the latitude and longitude images and then use
// reduce to vectors at the 10km resolution to group the grid into vectors.
var grid = lonGrid
  .multiply(latGrid)
  .reduceToVectors({
    geometry: geometry, // This is undefined until you draw a geometry.
    scale: 20000,
    geometryType: 'polygon',
  });

Map.addLayer(geometry);
Map.addLayer(grid);
Map.centerObject(grid);

// Fetch the features in the grid and produce a list of linear rings.
// The grid variable is defined in the step above.
var geometries = grid.toList(1000).map(function(feature) {
  var featureGeometry = ee.Feature(feature).geometry();
  var coordinates = featureGeometry.coordinates().get(0);
  return ee.Geometry.LinearRing(coordinates);
});

var drawingTools = Map.drawingTools();
// Fetch the geometries so they can be added to the drawing tools.
geometries.evaluate(function(geometriesList) {
  var layer = ui.Map.GeometryLayer({
    geometries: geometriesList,
    name: 'grid',
    color: 'black',
    shown: true, // Show the layer (already defaults to true).
    locked: true, // Lock the layer.
  });
  drawingTools.layers().set(1, layer);
});

//Export Grid to Asset
Export.table.toAsset({
  collection: grid,
  description: 'grid',
});
