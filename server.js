var unirest = require('unirest');
var express = require('express');
var events = require('events');

var getFromApi = function(endpoint, args) {
  var emitter = new events.EventEmitter();
  unirest.get('https://api.spotify.com/v1/' + endpoint)
         .qs(args)
         .end(function(response) {
            if (response.ok) {
              emitter.emit('end', response.body);
            }
            else{
              emitter.emit('error', response.code);
            }
         });
  return emitter;
};

var app = express();
//Q? - what does this do??
app.use(express.static('public'));

var topTracks = function(artistId, index, callback){
  var trackSearcher = getFromApi('artists/'+artistId+'/top-tracks',{
    country: 'US'
  });
  trackSearcher.on('end',function(item){
    var tracks = item.tracks;
    callback(tracks, index);
  });
  trackSearcher.on('error',function(code){
    callback(code);
  });
};


app.get('/search/:name', function(req, res) {
  var searchReq = getFromApi('search', {
    q: req.params.name,
    limit: 1,
    type:'artist'
  });


  searchReq.on('end', function(item){
    var artist = item.artists.items[0];
//    res.json(artist);
    var searchRel = getFromApi('artists/'+artist.id+'/related-artists',{
      id: artist.id
    });
    
    searchRel.on('end',function(item){
      var relatedCounter = 0;
      artist.related = item.artists;
      console.log("artist.related.length",artist.related.length);
      for(var i=0; i < artist.related.length; i++){
        console.log("i",i);
        console.log("artist.related[i].name",artist.related[i].name);
        topTracks(artist.related[i].id, i, function(result,resultIndex){
          console.log("result",result);
          if(!result){
            console.log("TODO - error handling");
          }
          else{
            artist.related[resultIndex].tracks = result;
          }
          relatedCounter++;
          if(relatedCounter === artist.related.length){
            res.json(artist);
          }           
        });
      }
    });

    searchRel.on('error', function(code){
      res.sendStatus(code);
    });    

  });

  searchReq.on('error', function(code){
    res.sendStatus(code);
  }); 
});

app.listen(process.env.PORT || 8080);
