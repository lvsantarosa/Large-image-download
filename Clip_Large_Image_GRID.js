https://code.earthengine.google.com/?scriptPath=users%2Flucassantarosa%2FSBSR%3ASentinel2%2FS2_GRID_Download

//Import the GRID created before and the geometry

//Cloud Mask
//https://courses.spatialthoughts.com/end-to-end-gee.html#basic-supervised-classification
function maskS2sr(image) {
  var cloudBitMask = ee.Number(2).pow(10).int();  // Bits 10 - clouds 
  var cirrusBitMask = ee.Number(2).pow(11).int(); // Bits 11 - cirrus
  var qa = image.select('QA60'); // Get the pixel QA band.
  var mask = qa.bitwiseAnd(cloudBitMask).eq(0) // All flags should be set to zero, indicating clear conditions
      .and(qa.bitwiseAnd(cirrusBitMask).eq(0));
  return image.updateMask(mask)
      .copyProperties(image, ["system:time_start"]);
}

//Indices (only ndvi and bsi)
var addIndices = function(image) {
  var ndvi = image.expression(
  '(( X - Y ) / (X + Y)) ', {
        'Y': image.select('B4'),  //red
        'X': image.select('B8'), // nir
  }).rename('ndvi');
  var bsi = image.expression(
      '(( X + Y ) - (A + B)) / (( X + Y ) + (A + B)) ', {
        'X': image.select('B11'), //swir1
        'Y': image.select('B4'),  //red
        'A': image.select('B8'), // nir
        'B': image.select('B2'), // blue
  }).rename('bsi');
  return image.addBands(ndvi).addBands(bsi)
} 

//Import the SIAC atmospheric correction module
//https://github.com/MarcYin/SIAC
var siac = require('users/marcyinfeng/utils:SIAC');

var SIAC_S2 = function(image){
  var s2_boa = siac.get_sur(image); 
  return s2_boa
}

//Prepare the images 
var s2 = ee.ImageCollection('COPERNICUS/S2_HARMONIZED')

var img2017 = s2
  .filterMetadata('CLOUDY_PIXEL_PERCENTAGE','less_than',5)
  .filter(ee.Filter.date('2017-05-01', '2017-09-30'))
  .filter(ee.Filter.bounds(geometry))
  .map(maskS2sr)
  .map(SIAC_S2)

print(img2017)

var comp_2017 = img2017.median().clip(geometry).select('B2', 'B3', 'B4', 'B8', 'B11'); 
var comp_2017 = addIndices(comp_2017);

var seq = ee.List.sequence(1, ee.Number(grid.size()));
print(seq);

var split = seq.map(function(x){
  var fil = grid.filterMetadata('count', 'equals', x)
  var sCol = comp_2017.clip(fil)
  return sCol.set('count', x)
});

var final_col = ee.ImageCollection.fromImages(split);
print(final_col);

for(var a = 1; a < final_col.size().getInfo() + 1; a++){
  //Exportar imagem recortada
  Export.image.toDrive({
  image: final_col.filterMetadata('count', 'equals', a).mosaic(), 
  scale: 10, 
  description: 'Image'+'_'+a, 
  maxPixels: 1e12,
  folder: 'S2_GRID_teste',
  region: geometry,
  skipEmptyTiles: true,
  formatOptions: {
    cloudOptimized: true,
  }
});
}

//Parameter visualization #1
var vis = {
min: 0, 
max: 1, 
gamma: 2,
bands: ['B4', 'B3', 'B2'],
};

//Parameter visualization #2
var vis_2 = {
min: 0, 
max: 1, 
gamma: 2,
bands: ['B4', 'B8', 'B2']
};

Map.addLayer(comp_2017, vis_2, 'clip');

Map.addLayer(comp_2017, vis, 'clip_RGB');

Map.addLayer(grid)

Map.centerObject(geometry, 6)
