# tz-d3chart

multi-line and geographic D3 chart.

# Features
```
	1. multiple line
	2. brushing mini chart, integrate 3 charts (main / mini / map)
	3. clicking each legend's node, toggle the main chart's lines.
	4. left / right y axis
	5. show description for chart's line and map's circle 
	6. google map api (marker / circle / infowindow)
	7. data filtering with a select box
	
```

# Install
```
	npm install
	bower install
	
```

# Run
```
	grunt serve
	
	http://localhost:8000/
	
```
	cf. http://prototype-chart-d3.s3-website-us-west-1.amazonaws.com/

# Etc
```
	cf. transparent gif image.
	http://www.lcdf.org/gifsicle/gifsicle-1.88.tar.gz
	./configure && make
	sudo make install 
	gifsicle 468.gif > 4681.gif
	gifsicle -U --disposal=previous --transparent="#ffffff" -O2 4681.gif > 468_trans.gif
	
	
	http://www.delimited.io/blog/2014/4/22/javascript-object-instantiation-by-example-d3-map-control
	http://bl.ocks.org/emeeks/c569f8852013e07abf57

```


