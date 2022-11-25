https://code.earthengine.google.com/?scriptPath=users%2Flucassantarosa%2FSBSR%3ASentinel2%2FS2_GRID_Download

//Import the GRID created before and the geometry

//Function to mask clouds using the Sentinel-2 QA band
function maskS2clouds(image) {
  var qa = image.select('QA60');

  // Bits 10 and 11 are clouds and cirrus, respectively.
  var cloudBitMask = 1 << 10;
  var cirrusBitMask = 1 << 11;

  // Both flags should be set to zero, indicating clear conditions.
  var mask = qa.bitwiseAnd(cloudBitMask).eq(0)
      .and(qa.bitwiseAnd(cirrusBitMask).eq(0));

  return image.updateMask(mask).divide(10000);
}

var dataset = ee.ImageCollection('COPERNICUS/S2_SR')
                  .filterDate('2022-08-01', '2022-09-30')
                  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE',10))
                  .map(maskS2clouds)
                  .filterBounds(geometry);
                  
                  
var s2_median = dataset.select('B2', 'B3', 'B4', 'B8').median().clip(geometry)


var seq = ee.List.sequence(1, ee.Number(grid.size()));
print(seq);

var split = seq.map(function(x){
  var fil = grid.filterMetadata('count', 'equals', x)
  var sCol = s2_median.clip(fil)
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
min: 0.05, 
max: 0.75, 
gamma: 1.1,
bands: ['B4', 'B3', 'B2'],
};

//Parameter visualization #2
var vis_2 = {
min: 0.05, 
max: 0.8, 
gamma: 1.1,
bands: ['B4', 'B8', 'B2']
};

Map.addLayer(s2_median, vis_2, 'clip');

Map.addLayer(s2_median, vis, 'clip_RGB');

Map.centerObject(geometry, 6)

